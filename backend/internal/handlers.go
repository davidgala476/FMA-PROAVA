package internal

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// obtener alquimistas
func (app *App) GetAlchemists(w http.ResponseWriter, r *http.Request) {
	var alchemists []Alchemist
	result := app.DB.Find(&alchemists)
	if result.Error != nil {
		http.Error(w, "error buscando alquimistas", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse(alchemists))
}

// nuevo alquimista
func (app *App) CreateAlchemist(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var alchemist Alchemist
	if err := json.NewDecoder(r.Body).Decode(&alchemist); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "datos no validos " + err.Error(),
			"message": "ERROR",
		})
		return
	}
	//id y nombreobligatorios
	if alchemist.MilitaryID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "El campo military_id es obligatorio",
			"message": "El ID  no puede estar vacío",
		})
		return
	}
	if alchemist.Name == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "El campo name es obligatorio",
			"message": "El Nombre no puede estar vacío",
		})
		return
	}
	//verificar id
	var existing Alchemist
	if err := app.DB.Where("military_id = ?", alchemist.MilitaryID).First(&existing).Error; err == nil {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "El ID militar ya está registrado",
			"message": "Ya existe un alquimista con este ID",
		})
		return
	}
	if alchemist.Rank == "" {
		alchemist.Rank = "Lieutenant"
	}
	if alchemist.Status == "" {
		alchemist.Status = "active"
	}
	result := app.DB.Create(&alchemist)
	if result.Error != nil {
		log.Printf(" Error al crear alquimista: %v", result.Error)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Error al crear alquimista: " + result.Error.Error(),
			"message": "error en la base de datos de los alquimistas",
		})
		return
	}
	log.Printf("nuevo alquimista creado: ID=%d, MilitaryID=%s, Name=%s", alchemist.ID, alchemist.MilitaryID, alchemist.Name)

	// publicar auditoría y notificación en tiempo real si está disponible
	if app.Queue != nil {
		app.Queue.PublishAuditLog(AuditLog{
			Action:    "ALCHEMIST_CREATED",
			UserID:    alchemist.ID,
			Resource:  fmt.Sprintf("alchemist:%d", alchemist.ID),
			Timestamp: time.Now().Format(time.RFC3339),
		})
	}
	if app.WebsocketHub != nil {
		notif := map[string]interface{}{
			"type":      "notification",
			"action":    "ALCHEMIST_CREATED",
			"alchemist": alchemist,
			"timestamp": time.Now().Format(time.RFC3339),
		}
		if b, err := json.Marshal(notif); err == nil {
			app.WebsocketHub.Broadcast <- b
		}
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(SuccessResponse(alchemist))
}
func (app *App) GetAlchemist(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "ID inválido", http.StatusBadRequest)
		return
	}

	var alchemist Alchemist
	result := app.DB.First(&alchemist, id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			http.Error(w, "Alquimista no encontrado", http.StatusNotFound)
			return
		}
		http.Error(w, "Error al obtener alquimista", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse(alchemist))
}

// obtener transmutaciones
func (app *App) GetTransmutations(w http.ResponseWriter, r *http.Request) {
	var transmutations []Transmutation
	result := app.DB.Preload("Alchemist").Find(&transmutations)
	if result.Error != nil {
		http.Error(w, "Error al obtener transmutaciones", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse(transmutations))
}

func (app *App) CreateTransmutation(w http.ResponseWriter, r *http.Request) {
	var transmutation Transmutation
	if err := json.NewDecoder(r.Body).Decode(&transmutation); err != nil {
		http.Error(w, "Datos inválidos", http.StatusBadRequest)
		return
	}

	simulator := NewTransmutationSimulator()

	if transmutation.InputMaterial != "" && transmutation.OutputMaterial != "" {
		transmutation.Cost = simulator.SimulateCost(transmutation.InputMaterial, transmutation.OutputMaterial)
		transmutation.SuccessRate = simulator.SimulateSuccessRate(transmutation.InputMaterial, transmutation.OutputMaterial)
		result, resultQuantity := simulator.SimulateResult(transmutation.InputMaterial, transmutation.OutputMaterial, 1.0)
		transmutation.Result = result
		transmutation.ResultQuantity = resultQuantity
	}
	result := app.DB.Create(&transmutation)
	if result.Error != nil {
		http.Error(w, "Error al crear transmutación", http.StatusInternalServerError)
		return
	}
	if app.Queue != nil {
		totalValue := transmutation.Cost

		err := app.Queue.PublishTransmutationRequest(TransmutationRequest{
			TransmutationID: transmutation.ID,
			AlchemistID:     transmutation.AlchemistID,
			Objective:       transmutation.Objective,
			TotalValue:      totalValue,
		})

		if err != nil {
			log.Printf("error cola de transmutación: %v", err)
		} else {
			app.Queue.PublishAuditLog(AuditLog{
				Action:    "TRANSMUTATION_CREATED",
				UserID:    transmutation.AlchemistID,
				Resource:  fmt.Sprintf("transmutation:%d", transmutation.ID),
				Timestamp: time.Now().Format(time.RFC3339),
			})
		}
	}

	// enviar notificación inmediata via WebSocket si está disponible
	if app.WebsocketHub != nil {
		notif := map[string]interface{}{
			"type":          "notification",
			"action":        "TRANSMUTATION_CREATED",
			"transmutation": transmutation,
			"timestamp":     time.Now().Format(time.RFC3339),
		}
		if b, err := json.Marshal(notif); err == nil {
			log.Printf("WebSocket broadcast (immediate): TRANSMUTATION_CREATED -> transmutation:%d", transmutation.ID)
			app.WebsocketHub.Broadcast <- b
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(SuccessResponse(transmutation))
}

// crear mision
func (app *App) CreateMission(w http.ResponseWriter, r *http.Request) {
	var mission Mission
	if err := json.NewDecoder(r.Body).Decode(&mission); err != nil {
		http.Error(w, "Datos inválidos", http.StatusBadRequest)
		return
	}
	result := app.DB.Create(&mission)
	if result.Error != nil {
		http.Error(w, "Error al crear misión", http.StatusInternalServerError)
		return
	}
	//crear auditoría
	if app.Queue != nil {
		app.Queue.PublishAuditLog(AuditLog{
			Action:    "MISSION_CREATED",
			UserID:    mission.AssignedTo,
			Resource:  fmt.Sprintf("mission:%d", mission.ID),
			Timestamp: time.Now().Format(time.RFC3339),
		})
	}

	// notificar por websocket inmediatamente si está disponible
	if app.WebsocketHub != nil {
		notif := map[string]interface{}{
			"type":      "notification",
			"action":    "MISSION_CREATED",
			"mission":   mission,
			"timestamp": time.Now().Format(time.RFC3339),
		}
		if b, err := json.Marshal(notif); err == nil {
			log.Printf("WebSocket broadcast (immediate): MISSION_CREATED -> mission:%d", mission.ID)
			app.WebsocketHub.Broadcast <- b
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(SuccessResponse(mission))
}
func (app *App) RunDailyChecks(w http.ResponseWriter, r *http.Request) {
	if app.Queue == nil {
		http.Error(w, "Sistema de colas no disponible", http.StatusServiceUnavailable)
		return
	}

	app.Queue.PublishDailyCheck(DailyCheck{
		CheckType: "material_usage",
		Timestamp: time.Now().Format(time.RFC3339),
	})

	app.Queue.PublishDailyCheck(DailyCheck{
		CheckType: "pending_missions",
		Timestamp: time.Now().Format(time.RFC3339),
	})

	app.Queue.PublishDailyCheck(DailyCheck{
		CheckType: "transmutation_backlog",
		Timestamp: time.Now().Format(time.RFC3339),
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse("Verificaciones diarias ejecutadas"))
}

func (app *App) GetMissions(w http.ResponseWriter, r *http.Request) {
	var missions []Mission
	result := app.DB.Preload("Alquimista").Find(&missions)
	if result.Error != nil {
		http.Error(w, "Error al buscar misiones", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse(missions))
}

// transmutacion por id
func (app *App) GetTransmutation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "ID no es el correcto", http.StatusBadRequest)
		return
	}

	var transmutation Transmutation
	result := app.DB.Preload("alquimista").First(&transmutation, id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			http.Error(w, "no hay dicha transmutacion", http.StatusNotFound)
			return
		}
		http.Error(w, "Error al obtener transmutacion", http.StatusInternalServerError)
		return
	}
	if app.Queue != nil {
		app.Queue.PublishAuditLog(AuditLog{
			Action:    "TRANSMUTATION_VIEWED",
			UserID:    0,
			Resource:  fmt.Sprintf("transmutation:%d", transmutation.ID),
			Timestamp: time.Now().Format(time.RFC3339),
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse(transmutation))
}

// mision por id
func (app *App) GetMission(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "ID inválido", http.StatusBadRequest)
		return
	}
	var mission Mission
	result := app.DB.Preload("Alchemist").First(&mission, id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			http.Error(w, "Misión no encontrada", http.StatusNotFound)
			return
		}
		http.Error(w, "Error al obtener misión", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse(mission))
}

// material por id
func (app *App) GetMaterial(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "ID inválido", http.StatusBadRequest)
		return
	}
	var material Material
	result := app.DB.First(&material, id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			http.Error(w, "Material no encontrado", http.StatusNotFound)
			return
		}
		http.Error(w, "Error al obtener material", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse(material))
}

// obtener los materiales
func (app *App) GetMaterials(w http.ResponseWriter, r *http.Request) {
	var materials []Material
	result := app.DB.Find(&materials)
	if result.Error != nil {
		http.Error(w, "Error al obtener materiales", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse(materials))
}
func (app *App) GetQueueStats(w http.ResponseWriter, r *http.Request) {
	if app.Queue == nil {
		http.Error(w, `{"error": "Sistema de colas no disponible"}`, http.StatusServiceUnavailable)
		return
	}

	stats := map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
	}

	if app.Workers != nil {
		stats["workers"] = app.Workers.GetWorkerStats()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse(stats))
}

// logs de auditoría
func (app *App) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	response := map[string]interface{}{
		"date": date,
		"logs": []interface{}{},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse(response))
}

// estado sistema
func (app *App) GetSystemStatus(w http.ResponseWriter, r *http.Request) {
	status := map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
		"version":   "2.0.0",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse(status))
}

// simulacion de lsa transmutaciones
func (app *App) SimulateTransmutation(w http.ResponseWriter, r *http.Request) {
	var request struct {
		InputMaterial  string  `json:"input_material"`
		OutputMaterial string  `json:"output_material"`
		Quantity       float64 `json:"quantity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse("Datos inválidos"))
		return
	}
	if request.InputMaterial == "" || request.OutputMaterial == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse("Material de entrada y salida son requeridos"))
		return
	}
	if request.Quantity <= 0 {
		request.Quantity = 1.0
	}
	simulator := NewTransmutationSimulator()
	simulation := simulator.GetSimulationDetails(
		request.InputMaterial,
		request.OutputMaterial,
		request.Quantity,
	)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse(simulation))
}
