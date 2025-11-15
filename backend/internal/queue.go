package internal

import (
	"encoding/json"
	"log"
	"time"

	"github.com/streadway/amqp"
)

type QueueService struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}
type QueueMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Mensaje
type TransmutationRequest struct {
	TransmutationID uint    `json:"transmutation_id"`
	AlchemistID     uint    `json:"alchemist_id"`
	Objective       string  `json:"objective"`
	TotalValue      float64 `json:"total_value"`
}

type AuditLog struct {
	Action    string `json:"action"`
	UserID    uint   `json:"user_id"`
	Resource  string `json:"resource"`
	Timestamp string `json:"timestamp"`
	Details   string `json:"details,omitempty"`
}
type DailyCheck struct {
	CheckType string `json:"check_type"`
	Timestamp string `json:"timestamp"`
	Manual    bool   `json:"manual,omitempty"`
}

func NewQueueService(url string) (*QueueService, error) {
	var conn *amqp.Connection
	var err error
	maxAttempts := 12
	attemptDelay := 5 * time.Second
	for i := 1; i <= maxAttempts; i++ {
		conn, err = amqp.Dial(url)
		if err == nil {
			break
		}
		log.Printf(" Intento %d/%d: no se pudo conectar (%v). reintento en %s...", i, maxAttempts, err, attemptDelay)
		if i < maxAttempts {
			time.Sleep(attemptDelay)
		}
	}
	if err != nil {
		return nil, err
	}
	channel, err := conn.Channel()
	if err != nil {
		return nil, err
	}
	err = channel.ExchangeDeclare(
		"amestris_exchange",
		"direct",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return nil, err
	}
	queues := []string{"transmutations", "audit", "daily_checks"}
	for _, queue := range queues {
		_, err = channel.QueueDeclare(
			queue,
			true,
			false,
			false,
			false,
			nil,
		)
		if err != nil {
			return nil, err
		}
		err = channel.QueueBind(
			queue,
			queue,
			"amestris_exchange",
			false,
			nil,
		)
		if err != nil {
			return nil, err
		}
	}
	return &QueueService{
		conn:    conn,
		channel: channel,
	}, nil
}
func (q *QueueService) PublishTransmutationRequest(req TransmutationRequest) error {
	message := QueueMessage{
		Type:    "transmutation_request",
		Payload: req,
	}
	return q.publishMessage("transmutations", message)
}
func (q *QueueService) PublishAuditLog(audit AuditLog) error {
	message := QueueMessage{
		Type:    "audit_log",
		Payload: audit,
	}
	return q.publishMessage("audit", message)
}
func (q *QueueService) PublishDailyCheck(check DailyCheck) error {
	message := QueueMessage{
		Type:    "daily_check",
		Payload: check,
	}
	return q.publishMessage("daily_checks", message)
}
func (q *QueueService) publishMessage(routingKey string, message QueueMessage) error {
	body, err := json.Marshal(message)
	if err != nil {
		return err
	}
	return q.channel.Publish(
		"amestris_exchange",
		routingKey,
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         body,
			DeliveryMode: amqp.Persistent,
		},
	)
}
func (q *QueueService) Close() {
	if q.channel != nil {
		q.channel.Close()
	}
	if q.conn != nil {
		q.conn.Close()
	}
}
func TimeNow() string {
	return time.Now().Format(time.RFC3339)
}
