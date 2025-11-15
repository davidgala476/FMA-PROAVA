package main

import (
	"log"
	"os"

	"amestris-backend/internal"
)

func main() {
	//configuracion app
	cfg := internal.Config{
		DBHost:      getEnv("DB_HOST", "postgres"),
		DBPort:      getEnv("DB_PORT", "5432"),
		DBUser:      getEnv("DB_USER", "alchemist"),
		DBPass:      getEnv("DB_PASS", "equivalent_exchange"),
		DBName:      getEnv("DB_NAME", "amestris_dept"),
		RedisAddr:   getEnv("REDIS_ADDR", "redis:6379"),
		RabbitMQURL: getEnv("RABBITMQ_URL", "amqp://admin:admin123@rabbitmq:5672"),
		JWTSecret:   getEnv("JWT_SECRET", "amestris_super_secret_jwt_key_2024"),
	}

	//start de aplicación
	app, err := internal.NewApp(cfg)
	if err != nil {
		log.Fatal(" no se pudo iniciar la app:", err)
	}

	// servidor
	port := getEnv("SERVER_PORT", "8080")
	log.Printf(" Servidor en puerto %s", port)
	if err := app.Run(port); err != nil {
		log.Fatal(" no se inicio el servidor:", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
