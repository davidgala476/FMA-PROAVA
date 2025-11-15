package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/redis/go-redis/v9"
)

type Config struct {
	DBHost      string
	DBPort      string
	DBUser      string
	DBPass      string
	DBName      string
	RedisAddr   string
	RabbitMQURL string
	JWTSecret   string
}

type App struct {
	DB           *gorm.DB
	Redis        *redis.Client
	Router       *mux.Router
	JWTSecret    string
	Queue        *QueueService
	Workers      *WorkerService
	WebsocketHub *Hub
}

// base de datos por workers segunda opcion ayuda
func InitDB(cfg Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPass, cfg.DBName,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("error conectando a la base de datos: %w", err)
	}

	if err := db.AutoMigrate(
		&Alchemist{},
		&Transmutation{},
		&Mission{},
		&Material{},
		&CouncilReview{},
	); err != nil {
		log.Printf("migración: %v ", err)
	}

	return db, nil
}

// redis para workers segunda opcion ayuda
func InitRedis(cfg Config) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: "",
		DB:       0,
	})
}
func NewApp(cfg Config) (*App, error) {
	//conexión a PostgreSQL
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPass, cfg.DBName,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("error conectando a la base de datos: %w", err)
	}
	if err := db.AutoMigrate(
		&Alchemist{},
		&Transmutation{},
		&Mission{},
		&Material{},
		&CouncilReview{},
	); err != nil {

		log.Printf("migración: %v ", err)
	}

	//configurar Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: "",
		DB:       0,
	})

	//verificar conexión a Redis
	if _, err := rdb.Ping(context.Background()).Result(); err != nil {
		log.Printf("  Redis no disponible: %v", err)
	} else {
		log.Println("Conectado")
	}

	//iniciar de colas RabbitMQ
	var queue *QueueService
	if cfg.RabbitMQURL != "" {
		queue, err = NewQueueService(cfg.RabbitMQURL)
		if err != nil {
			log.Printf("  rabbitMQ no funciona: %v", err)
			log.Printf(" revisar RabbitMQ  %s", cfg.RabbitMQURL)
		} else {
			log.Println(" sistema de colas RabbitMQ iniciado")
		}
	} else {
		log.Println("  URL de RabbitMQ no configurada ")
	}
	//websocket
	hub := NewHub()
	go hub.Run()

	app := &App{
		DB:           db,
		Redis:        rdb,
		Router:       mux.NewRouter(),
		JWTSecret:    cfg.JWTSecret,
		Queue:        queue,
		WebsocketHub: hub,
	}
	if queue != nil {
		app.Workers = NewWorkerService(queue, db, rdb, app.WebsocketHub)
		app.startWorkers()
		app.scheduleDailyChecks()
		app.seedInitialData()
	}
	app.setupRoutes()

	log.Println("app iniciada")
	//estado del sistema
	app.printSystemStatus()
	return app, nil
}

// workers de procesamiento asíncrono
func (app *App) startWorkers() {
	if app.Workers == nil {
		log.Println("  workers no disponibles ")
		return
	}
	app.Workers.StartAllWorkers()
	log.Println(" Workers iniciados")
}

// verificaciones diarias automáticas
func (app *App) scheduleDailyChecks() {
	if app.Queue == nil {
		log.Println("no se pudo realizar verificaciones diarias ")
		return
	}
	go func() {
		//esperar a que el sistema esté completamente iniciado
		time.Sleep(10 * time.Second)
		log.Println("programando fecha de verificaciones diarias")
		now := time.Now()
		next := time.Date(now.Year(), now.Month(), now.Day(), 6, 0, 0, 0, now.Location())
		if now.After(next) {
			next = next.Add(24 * time.Hour)
		}

		initialDelay := time.Until(next)
		log.Printf("primera verificación : %s (en %v)", next.Format("2026-01-02 15:04:05"), initialDelay)
		time.Sleep(initialDelay)
		//realizar primera verificacion de una vez
		app.executeDailyChecks()
		//prrogramar ejecución diaria de las verificaciones
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			app.executeDailyChecks()
		}
	}()
}

// realizar las verificaciones diarias
func (app *App) executeDailyChecks() {
	if app.Queue == nil {
		return
	}
	log.Println("realizando las verificaciones diarias programadas")
	checks := []string{
		"material_usage",
		"pending_missions",
		"transmutation_backlog",
		"system_health",
	}
	for _, checkType := range checks {
		err := app.Queue.PublishDailyCheck(DailyCheck{
			CheckType: checkType,
			Timestamp: time.Now().Format(time.RFC3339),
		})

		if err != nil {
			log.Printf(" Error en verificación '%s': %v", checkType, err)
		} else {
			log.Printf(" Verificación '%s' publicada en cola", checkType)
		}

		time.Sleep(1 * time.Second) //demorar entre verificaciones
	}

	log.Println(" todas las verificaciones fueron ejcutadas")
}

func (app *App) seedInitialData() {

	var count int64
	app.DB.Model(&Alchemist{}).Count(&count)

	if count > 0 {
		log.Println("los datos de prueba ya existentes")
		return
	}
	log.Println(" Insertando datos ")
	//datos de ejemplo insertados
	alchemists := []Alchemist{
		{
			MilitaryID:     "A-001",
			Name:           "Edward Elric",
			Title:          "Alquimista de Acero",
			Specialization: "Metales",
			Rank:           "Major",
			Status:         "active",
		},
		{
			MilitaryID:     "A-002",
			Name:           "Roy Mustang",
			Title:          "Alquimista de Fuego",
			Specialization: "Química de Gases",
			Rank:           "Colonel",
			Status:         "active",
		},
		{
			MilitaryID:     "A-003",
			Name:           "Alex Louis Armstrong",
			Title:          "Alquimista Fuerte",
			Specialization: "Tierra y Minerales",
			Rank:           "Major",
			Status:         "active",
		},
	}

	for i := range alchemists {
		if err := app.DB.Create(&alchemists[i]).Error; err != nil {
			log.Printf("No se pudo crear el alquimista: %v", err)
		}
	}
	//materiales de ejemplo para insertar
	materials := []Material{
		{Name: "Hierro", Classification: "metálico", EquivalentValue: 1.00, StockQuantity: 1000},
		{Name: "Acero", Classification: "metálico", EquivalentValue: 1.50, StockQuantity: 800},
		{Name: "Carbón", Classification: "orgánico", EquivalentValue: 0.50, StockQuantity: 500},
		{Name: "Agua", Classification: "líquido", EquivalentValue: 0.10, StockQuantity: 2000},
	}
	for i := range materials {
		if err := app.DB.Create(&materials[i]).Error; err != nil {
			log.Printf(" Error en el intento de crear material: %v", err)
		}
	}
	log.Println("datos de ejemplo insertados")
}

// mensaje de estado del sistema en la terminal
func (app *App) printSystemStatus() {
	log.Println("")
	log.Println(" Estado del departamento: ")
	log.Printf("     PostgreSQL: %s:%s", os.Getenv("DB_HOST"), os.Getenv("DB_PORT"))
	log.Printf("    Redis: %s", os.Getenv("REDIS_ADDR"))

	if app.Queue != nil {
		log.Printf("   RabbitMQ: %s", "Conectado")
		log.Printf("   Workers: %s", "Activos")
		log.Printf("   Procesamiento asíncrono: %s", " HABILITADO")
	} else {
		log.Printf("    RabbitMQ: %s", " NO DISPONIBLE")
		log.Printf("    Workers: %s", "Inactivos")
		log.Printf("    Procesamiento asíncrono: %s", " DESHABILITADO")
	}

	log.Printf("    API: http://localhost:%s", os.Getenv("SERVER_PORT"))
	log.Println("")
	log.Println("")
}

// verificar salud del sistema
func (app *App) setupRoutes() {
	app.Router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		healthStatus := map[string]interface{}{
			"status":    "healthy",
			"service":   "Amestris Dept - Alquimia Estatal",
			"version":   "2.0.0",
			"timestamp": time.Now().Format(time.RFC3339),
			"features": map[string]bool{
				"database":     app.DB != nil,
				"redis":        app.Redis != nil,
				"async_queues": app.Queue != nil,
				"workers":      app.Workers != nil,
			},
		}
		if app.DB != nil {
			var dbCheck int
			if app.DB.Raw("SELECT 1").Scan(&dbCheck).Error == nil {
				healthStatus["database_status"] = "connected"
			} else {
				healthStatus["database_status"] = "disconnected"
			}
		}

		if app.Redis != nil {
			if app.Redis.Ping(context.Background()).Err() == nil {
				healthStatus["redis_status"] = "connected"
			} else {
				healthStatus["redis_status"] = "disconnected"
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(healthStatus)
	})
	api := app.Router.PathPrefix("/api").Subrouter()
	// Alquimistas
	api.HandleFunc("/alchemists", app.GetAlchemists).Methods("GET")
	api.HandleFunc("/alchemists", app.CreateAlchemist).Methods("POST")
	api.HandleFunc("/alchemists/{id}", app.GetAlchemist).Methods("GET")
	// Transmutaciones
	api.HandleFunc("/transmutations", app.GetTransmutations).Methods("GET")
	api.HandleFunc("/transmutations", app.CreateTransmutation).Methods("POST")
	api.HandleFunc("/transmutations/{id}", app.GetTransmutation).Methods("GET")
	// Misiones
	api.HandleFunc("/missions", app.GetMissions).Methods("GET")
	api.HandleFunc("/missions", app.CreateMission).Methods("POST")
	api.HandleFunc("/missions/{id}", app.GetMission).Methods("GET")
	// Materiales
	api.HandleFunc("/materials", app.GetMaterials).Methods("GET")
	api.HandleFunc("/materials/{id}", app.GetMaterial).Methods("GET")
	// Rutas para el sistema asíncrono
	api.HandleFunc("/queue/stats", app.GetQueueStats).Methods("GET")
	api.HandleFunc("/queue/daily-checks", app.RunDailyChecks).Methods("POST")
	api.HandleFunc("/audit/logs", app.GetAuditLogs).Methods("GET")
	api.HandleFunc("/system/status", app.GetSystemStatus).Methods("GET")
	app.Router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	})
	//login
	app.Router.Use(app.loggingMiddleware)
	// WebSocket notificaciones
	app.Router.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(app.WebsocketHub, w, r)
	})
}
func (app *App) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		log.Printf(" %s %s %s", r.Method, r.URL.Path, r.RemoteAddr)
		//registrar auditoría mensaje
		if app.Queue != nil && r.Method == "POST" {
			app.Queue.PublishAuditLog(AuditLog{
				Action:    fmt.Sprintf("API_%s", r.Method),
				UserID:    0,
				Resource:  r.URL.Path,
				Timestamp: time.Now().Format(time.RFC3339),
			})
		}
		next.ServeHTTP(w, r)
		duration := time.Since(start)
		log.Printf(" %s %s completed in %v", r.Method, r.URL.Path, duration)
	})
}
func (app *App) Run(port string) error {
	log.Printf("servidor en puerto %s", port)
	log.Printf("sistema asíncrono: %v", app.Queue != nil)
	log.Printf("workers: %v", app.Workers != nil)
	if app.Queue == nil {
		log.Println(" RABBITMQ_URL")
	}
	return http.ListenAndServe(":"+port, app.Router)
}
func (app *App) Close() {
	log.Println(" Cerrando conexiones")
	if app.Queue != nil {
		app.Queue.Close()
		log.Println("RabbitMQ cerrado")
	}
	if app.Redis != nil {
		app.Redis.Close()
		log.Println("Redis cerrado")
	}
	log.Println("aplicacion cerrada ")
}
