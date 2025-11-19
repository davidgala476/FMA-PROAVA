
```bash
cd infra
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- RabbitMQ Admin: `http://localhost:15672` (admin/admin123)


- **Gestión de Alquimistas**: CRUD con especialización y rango
- **Transmutaciones**: Crear, simular y procesar solicitudes
- **Misiones**: Asignación con prioridad y seguimiento
- **Auditoría**: Registro de eventos en tiempo real
- **WebSocket**: Notificaciones instantáneas (pop-ups auto-dismiss)
- **Workers**: Procesamiento asincronno (verificaciones diarias, auditoría)


| Frontend  Next.js (React, TypeScript, Tailwind) 
| Backend  Go (Gorilla, GORM) 
| DB  PostgreSQL 15 
| Cache/Sessions Redis 7 
| Message Queue  RabbitMQ 3 
| Async Workers  Go 

**REST Endpoints**: `/api/alchemists`, `/api/transmutations`, `/api/missions`, `/api/materials`

**Health**: `GET /health`

**WebSocket**: `ws://localhost:8080/ws` (notificaciones en tiempo real)

**Eventos**: `ALCHEMIST_CREATED`, `TRANSMUTATION_*`, `MISSION_*`, `OVERDUE_MISSION`, etc.

```bash
# Backend
cd backend
go run cmd/main.go

# Frontend
cd frontend
npm install && npm run dev

# Con Docker
cd infra
docker-compose build backend
docker-compose up -d backend
```

Licencia

MIT
