package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"

	"github.com/redis/go-redis/v9"
)

type WorkerService struct {
	queue *QueueService
	db    *gorm.DB
	redis *redis.Client
	hub   *Hub
}

func NewWorkerService(queue *QueueService, db *gorm.DB, redis *redis.Client, hub *Hub) *WorkerService {
	return &WorkerService{
		queue: queue,
		db:    db,
		redis: redis,
		hub:   hub,
	}
}

func (w *WorkerService) StartAllWorkers() {
	log.Println(" Iniciando todos los workers...")

	w.StartTransmutationWorker()
	w.StartAuditWorker()
	w.StartDailyCheckWorker()

	log.Println(" Todos los workers iniciados correctamente")
}
func (w *WorkerService) StartTransmutationWorker() {
	go w.consumeQueue("transmutations", w.processTransmutation, "TransmutationWorker")
}
func (w *WorkerService) StartAuditWorker() {
	go w.consumeQueue("audit", w.processAudit, "AuditWorker")
}
func (w *WorkerService) StartDailyCheckWorker() {
	go w.consumeQueue("daily_checks", w.processDailyCheck, "DailyCheckWorker")
}
func (w *WorkerService) consumeQueue(queueName string, processor func(QueueMessage) error, workerName string) {
	if w.queue == nil || w.queue.channel == nil {
		log.Printf(" %s: Sistema de colas no disponible", workerName)
		return
	}
	err := w.queue.channel.Qos(
		1,
		0,
		false,
	)
	if err != nil {
		log.Printf(" %s: Error en la confi %v", workerName, err)
		return
	}
	msgs, err := w.queue.channel.Consume(
		queueName,
		workerName,
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Printf(" %s: Error iniciando consumer: %v", workerName, err)
		return
	}

	log.Printf(" %s: esperando fila '%s'", workerName, queueName)

	for msg := range msgs {
		log.Printf(" %s: Mensaje recibido [%s]", workerName, msg.MessageId)

		var queueMsg QueueMessage
		if err := json.Unmarshal(msg.Body, &queueMsg); err != nil {
			log.Printf(" %s: Error decodificando mensaje: %v", workerName, err)
			msg.Nack(false, false)
			continue
		}
		if err := processor(queueMsg); err != nil {
			log.Printf(" %s: Error procesando mensaje: %v", workerName, err)
			time.Sleep(5 * time.Second)
			msg.Nack(false, true)
		} else {
			log.Printf(" %s: Mensaje procesado exitosamente", workerName)
			msg.Ack(false)
			w.redis.Incr(context.Background(), fmt.Sprintf("workers:%s:processed", workerName))
		}
	}
}

func (w *WorkerService) processTransmutation(msg QueueMessage) error {
	var req TransmutationRequest
	payload, _ := json.Marshal(msg.Payload)
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("error decodificando transmutation request: %v", err)
	}

	log.Printf("🔮 Procesando transmutación %d para alquimista %d: %s",
		req.TransmutationID, req.AlchemistID, req.Objective)

	processingTime := time.Duration(2+req.TransmutationID%3) * time.Second
	time.Sleep(processingTime)

	if err := w.validateTransmutation(req); err != nil {
		return w.handleTransmutationRejection(req, err)
	}

	if err := w.approveTransmutation(req); err != nil {
		return err
	}

	log.Printf(" Transmutación %d aprobada y verificada (tiempo: %v)",
		req.TransmutationID, processingTime)
	return nil
}

func (w *WorkerService) validateTransmutation(req TransmutationRequest) error {
	if req.TotalValue > 5000 {
		return fmt.Errorf("valor de transmutación excede límite permitido: %.2f", req.TotalValue)
	}

	var pendingCount int64
	w.db.Model(&Transmutation{}).
		Where("alchemist_id = ? AND status = ?", req.AlchemistID, "pending_review").
		Count(&pendingCount)

	if pendingCount > 5 {
		return fmt.Errorf("alquimista tiene demasiadas transmutaciones pendientes: %d", pendingCount)
	}

	var failedCount int64
	w.db.Model(&Transmutation{}).
		Where("alchemist_id = ? AND status = ?", req.AlchemistID, "rejected").
		Count(&failedCount)

	if failedCount > 3 {
		return fmt.Errorf("alquimista tiene historial de transmutaciones rechazadas: %d", failedCount)
	}

	return nil
}

func (w *WorkerService) handleTransmutationRejection(req TransmutationRequest, err error) error {
	result := w.db.Model(&Transmutation{}).
		Where("id = ?", req.TransmutationID).
		Updates(map[string]interface{}{
			"status":              "rejected",
			"equivalent_verified": false,
			"council_approval":    false,
		})

	if result.Error != nil {
		return result.Error
	}

	if w.queue != nil {
		w.queue.PublishAuditLog(AuditLog{
			Action:    "TRANSMUTATION_REJECTED",
			UserID:    req.AlchemistID,
			Resource:  fmt.Sprintf("transmutation:%d", req.TransmutationID),
			Timestamp: time.Now().Format(time.RFC3339),
			Details:   err.Error(),
		})
	}

	log.Printf(" Transmutación %d rechazada: %v", req.TransmutationID, err)
	return nil
}

func (w *WorkerService) approveTransmutation(req TransmutationRequest) error {
	result := w.db.Model(&Transmutation{}).
		Where("id = ?", req.TransmutationID).
		Updates(map[string]interface{}{
			"status":              "approved",
			"equivalent_verified": true,
			"council_approval":    req.TotalValue < 1000,
		})

	if result.Error != nil {
		return result.Error
	}

	if w.queue != nil {
		w.queue.PublishAuditLog(AuditLog{
			Action:    "TRANSMUTATION_APPROVED",
			UserID:    req.AlchemistID,
			Resource:  fmt.Sprintf("transmutation:%d", req.TransmutationID),
			Timestamp: time.Now().Format(time.RFC3339),
		})

		if req.TotalValue > 1000 {
			w.queue.PublishAuditLog(AuditLog{
				Action:    "HIGH_VALUE_TRANSMUTATION",
				UserID:    req.AlchemistID,
				Resource:  fmt.Sprintf("transmutation:%d", req.TransmutationID),
				Timestamp: time.Now().Format(time.RFC3339),
				Details:   fmt.Sprintf("Valor: %.2f - Requiere revisión del consejo", req.TotalValue),
			})
		}
	}

	return nil
}

// auditorias
func (w *WorkerService) processAudit(msg QueueMessage) error {
	var audit AuditLog
	payload, _ := json.Marshal(msg.Payload)
	if err := json.Unmarshal(payload, &audit); err != nil {
		return fmt.Errorf("error decodificando audit log: %v", err)
	}

	ctx := context.Background()

	today := time.Now().Format("2025-12-02")

	actionKey := fmt.Sprintf("audit:%s:%s", audit.Action, today)
	w.redis.Incr(ctx, actionKey)

	userKey := fmt.Sprintf("audit:user:%d:%s", audit.UserID, today)
	w.redis.Incr(ctx, userKey)

	logData := map[string]interface{}{
		"action":    audit.Action,
		"user_id":   audit.UserID,
		"resource":  audit.Resource,
		"timestamp": audit.Timestamp,
		"details":   audit.Details,
	}

	logJSON, _ := json.Marshal(logData)
	log.Printf("AUDIT: %s", string(logJSON))

	recentKey := "audit:recent"
	w.redis.LPush(ctx, recentKey, string(logJSON))
	w.redis.LTrim(ctx, recentKey, 0, 99)
	if w.hub != nil {
		log.Printf("WebSocket broadcast (audit): %s", logData["action"])
		w.hub.Broadcast <- logJSON
	}

	return nil
}

func (w *WorkerService) processDailyCheck(msg QueueMessage) error {
	var check DailyCheck
	payload, _ := json.Marshal(msg.Payload)
	if err := json.Unmarshal(payload, &check); err != nil {
		return fmt.Errorf("error decodificando daily check: %v", err)
	}
	log.Printf("viendo la verificacion diaria: %s", check.CheckType)
	switch check.CheckType {
	case "material_usage":
		return w.checkMaterialUsage()
	case "pending_missions":
		return w.checkPendingMissions()
	case "transmutation_backlog":
		return w.checkTransmutationBacklog()
	case "system_health":
		return w.checkSystemHealth()
	default:
		return fmt.Errorf("tipo de verificación no reconocido: %s", check.CheckType)
	}
}

func (w *WorkerService) checkMaterialUsage() error {
	log.Println(" Verificando materiales")

	var highUsage []struct {
		AlchemistID uint
		Name        string
		TotalUsed   float64
	}
	result := w.db.Table("alchemists a").
		Select("a.id as alchemist_id, a.name, SUM(t.equivalent_value) as total_used").
		Joins("LEFT JOIN transmutations t ON a.id = t.alchemist_id").
		Where("t.created_at >= ?", time.Now().AddDate(0, 0, -7)).
		Group("a.id, a.name").
		Having("SUM(t.equivalent_value) > ?", 1000).
		Scan(&highUsage)

	if result.Error != nil {
		return result.Error
	}

	for _, usage := range highUsage {
		if w.queue != nil {
			w.queue.PublishAuditLog(AuditLog{
				Action:    "HIGH_MATERIAL_USAGE",
				UserID:    usage.AlchemistID,
				Resource:  "weekly_usage_check",
				Timestamp: time.Now().Format(time.RFC3339),
				Details:   fmt.Sprintf("Alquimista %s usó %.2f unidades en la última semana", usage.Name, usage.TotalUsed),
			})
		}
	}

	log.Printf(" Verificación de materiales completada. %d casos de alto uso encontrados", len(highUsage))
	return nil
}

func (w *WorkerService) checkPendingMissions() error {
	log.Println(" Verificando misiones")

	var overdueMissions []Mission

	result := w.db.Where("status = ? AND deadline < ?", "pending", time.Now()).
		Find(&overdueMissions)

	if result.Error != nil {
		return result.Error
	}

	var staleMissions []Mission
	result = w.db.Where("status = ? AND created_at < ?", "pending", time.Now().AddDate(0, 0, -30)).
		Find(&staleMissions)

	if result.Error != nil {
		return result.Error
	}

	for _, mission := range overdueMissions {
		if w.queue != nil {
			w.queue.PublishAuditLog(AuditLog{
				Action:    "OVERDUE_MISSION",
				UserID:    mission.AssignedTo,
				Resource:  fmt.Sprintf("mission:%d", mission.ID),
				Timestamp: time.Now().Format(time.RFC3339),
				Details:   fmt.Sprintf("Misión '%s' vencida el %s", mission.Title, mission.Deadline.Format("2006-01-02")),
			})
		}
	}

	for _, mission := range staleMissions {
		if w.queue != nil {
			w.queue.PublishAuditLog(AuditLog{
				Action:    "STALE_MISSION",
				UserID:    mission.AssignedTo,
				Resource:  fmt.Sprintf("mission:%d", mission.ID),
				Timestamp: time.Now().Format(time.RFC3339),
				Details:   fmt.Sprintf("Misión '%s' pendiente por más de 30 días", mission.Title),
			})
		}
	}

	log.Printf(" Verificación de misiones completada. %d vencidas, %d estancadas",
		len(overdueMissions), len(staleMissions))
	return nil
}
func (w *WorkerService) checkTransmutationBacklog() error {
	log.Println(" Verificando transmutacione")

	var pendingCount int64
	w.db.Model(&Transmutation{}).Where("status = ?", "pending_review").Count(&pendingCount)

	var processingCount int64
	w.db.Model(&Transmutation{}).Where("status = ?", "in_progress").Count(&processingCount)

	if pendingCount > 10 {
		if w.queue != nil {
			w.queue.PublishAuditLog(AuditLog{
				Action:    "HIGH_TRANSMUTATION_BACKLOG",
				UserID:    0,
				Resource:  "system_check",
				Timestamp: time.Now().Format(time.RFC3339),
				Details:   fmt.Sprintf("%d transmutaciones pendientes de revisión", pendingCount),
			})
		}
	}

	ctx := context.Background()
	w.redis.Set(ctx, "metrics:transmutations:pending", pendingCount, 24*time.Hour)
	w.redis.Set(ctx, "metrics:transmutations:processing", processingCount, 24*time.Hour)

	log.Printf(" Backlog verificado. Pendientes: %d, En progreso: %d", pendingCount, processingCount)
	return nil
}

func (w *WorkerService) checkSystemHealth() error {
	log.Println("  Verificando salud del sistema...")

	ctx := context.Background()

	var dbCheck int
	result := w.db.Raw("SELECT 1").Scan(&dbCheck)
	dbHealthy := result.Error == nil && dbCheck == 1

	redisHealthy := w.redis.Ping(ctx).Err() == nil

	rabbitHealthy := w.queue != nil && w.queue.conn != nil

	systemHealth := map[string]bool{
		"postgres": dbHealthy,
		"redis":    redisHealthy,
		"rabbitmq": rabbitHealthy,
	}

	healthJSON, _ := json.Marshal(systemHealth)
	w.redis.Set(ctx, "system:health", healthJSON, time.Hour)

	if !dbHealthy || !redisHealthy || !rabbitHealthy {
		if w.queue != nil {
			w.queue.PublishAuditLog(AuditLog{
				Action:    "SYSTEM_HEALTH_ISSUE",
				UserID:    0,
				Resource:  "system_health",
				Timestamp: time.Now().Format(time.RFC3339),
				Details:   fmt.Sprintf("PostgreSQL: %v, Redis: %v, RabbitMQ: %v", dbHealthy, redisHealthy, rabbitHealthy),
			})
		}
	}

	log.Printf(" Salud del sistema: PostgreSQL=%v, Redis=%v, RabbitMQ=%v",
		dbHealthy, redisHealthy, rabbitHealthy)
	return nil
}

func (w *WorkerService) RunManualCheck(checkType string) error {
	if w.queue == nil {
		return fmt.Errorf("sistema de colas no disponible")
	}

	return w.queue.PublishDailyCheck(DailyCheck{
		CheckType: checkType,
		Timestamp: time.Now().Format(time.RFC3339),
	})
}

func (w *WorkerService) GetWorkerStats() map[string]interface{} {
	ctx := context.Background()

	stats := make(map[string]interface{})
	workers := []string{"TransmutationWorker", "AuditWorker", "DailyCheckWorker"}

	for _, worker := range workers {
		count, _ := w.redis.Get(ctx, fmt.Sprintf("workers:%s:processed", worker)).Int64()
		stats[worker] = count
	}

	return stats
}
