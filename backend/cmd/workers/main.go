package main

import (
	"context"
	"log"
	"os"

	"amestris-backend/internal"
)

func main() {
	//configuracion workers
	cfg := internal.Config{
		DBHost:      getEnv("DB_HOST", "postgres"),
		DBPort:      getEnv("DB_PORT", "5432"),
		DBUser:      getEnv("DB_USER", "alchemist"),
		DBPass:      getEnv("DB_PASS", "equivalent_exchange"),
		DBName:      getEnv("DB_NAME", "amestris_dept"),
		RedisAddr:   getEnv("REDIS_ADDR", "redis:6379"),
		RabbitMQURL: getEnv("RABBITMQ_URL", "amqp://admin:admin123@rabbitmq:5672"),
	}
	log.Println(" Iniciando Workers")
	log.Printf("Configuración: DB=%s, Redis=%s, RabbitMQ=%s",
		cfg.DBHost, cfg.RedisAddr, cfg.RabbitMQURL)

	db, err := internal.InitDB(cfg)
	if err != nil {
		log.Fatal(" error en la base de datos:", err)
	}
	log.Println(" Base de datos iniciada")

	redis := internal.InitRedis(cfg)

	if err := redis.Ping(context.Background()).Err(); err != nil {
		log.Printf("  Redis no disponible: %v", err)
	} else {
		log.Println(" Redis conectado")
	}

	var queue *internal.QueueService
	if cfg.RabbitMQURL != "" {
		queue, err = internal.NewQueueService(cfg.RabbitMQURL)
		if err != nil {
			log.Printf(" Error inicializando RabbitMQ: %v", err)
			log.Printf(" revisaa RabbitMQ en: %s", cfg.RabbitMQURL)
		} else {
			log.Println(" colas RabbitMQ iniciando")
		}
	} else {
		log.Println("  URL de RabbitMQ no configurada ")
	}

	// Inicializar workers solo si tenemos cola
	if queue != nil {
		// Crear Hub para WebSocket
		hub := internal.NewHub()
		go hub.Run()

		// CORREGIDO: Usar NewWorkerService (exportado)
		workers := internal.NewWorkerService(queue, db, redis, hub)

		// Iniciar todos los workers
		log.Println(" Iniciando workers...")
		workers.StartAllWorkers()

		// Ejecutar una verificación inicial del sistema
		log.Println(" verificacion del sistema iniciada")
		err := workers.RunManualCheck("system_health")
		if err != nil {
			log.Printf("  Error en verificación inicial: %v", err)
		} else {
			log.Println(" Verificación inicial completada")
		}

		log.Println("")
		log.Println(" WORKERS INICIADOS")
		log.Println("")
		log.Println(" Workers activos:")
		log.Println("   • TransmutationWorker - solicitudes de transmutación")
		log.Println("   • AuditWorker -  auditorías del sistema")
		log.Println("   • DailyCheckWorker -  verificaciones ")
		log.Println("")
		log.Println(" los workers están funcionando")
		log.Println("")

		// registrar inicio en auditoría
		queue.PublishAuditLog(internal.AuditLog{
			Action:    "WORKERS_STARTED",
			UserID:    0,
			Resource:  "system",
			Timestamp: internal.TimeNow(),
		})
	} else {
		log.Println(" workers no iniciados")
		log.Println(" verificar RabbitMQ")
	}

	// mantener el proceso activo
	log.Println(" Workers iniciados")

	// bloquear indefinidamente
	select {}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
