package internal

import (
	"github.com/gorilla/mux"
)

func RegisterRoutes(r *mux.Router, app *App) {
	r.HandleFunc("/api/alchemists", app.GetAlchemists).Methods("GET")
	r.HandleFunc("/api/alchemists", app.CreateAlchemist).Methods("POST")
	r.HandleFunc("/api/alchemists/{id}", app.GetAlchemist).Methods("GET")
	r.HandleFunc("/api/transmutations", app.GetTransmutations).Methods("GET")
	r.HandleFunc("/api/transmutations", app.CreateTransmutation).Methods("POST")
	r.HandleFunc("/api/transmutations/{id}", app.GetTransmutation).Methods("GET")
	r.HandleFunc("/api/transmutations/simulate", app.SimulateTransmutation).Methods("POST")
	r.HandleFunc("/api/missions", app.GetMissions).Methods("GET")
	r.HandleFunc("/api/missions", app.CreateMission).Methods("POST")
	r.HandleFunc("/api/missions/{id}", app.GetMission).Methods("GET")
	r.HandleFunc("/api/materials", app.GetMaterials).Methods("GET")
	r.HandleFunc("/api/materials/{id}", app.GetMaterial).Methods("GET")
	r.HandleFunc("/api/queue/stats", app.GetQueueStats).Methods("GET")
	r.HandleFunc("/api/audit/logs", app.GetAuditLogs).Methods("GET")
	r.HandleFunc("/api/system/status", app.GetSystemStatus).Methods("GET")
}
