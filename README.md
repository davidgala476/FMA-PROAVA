# 🧪 FMA-ProAva: Departamento de Alquimia Estatal

Sistema de gestión integral para el Departamento de Alquimia Estatal, desarrollado con tecnologías modernas para administrar alquimistas, transmutaciones, misiones y auditorías en tiempo real.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Instalación](#instalación)
- [Uso](#uso)
- [API](#api)
- [WebSocket - Notificaciones en Tiempo Real](#websocket---notificaciones-en-tiempo-real)
- [Desarrollo](#desarrollo)

---

## ✨ Características

### Core
- **Gestión de Alquimistas**: CRUD completo de alquimistas con especialización y rango militar
- **Solicitudes de Transmutación**: Crear, simular y procesar solicitudes de transmutación
- **Gestión de Misiones**: Asignar misiones con prioridad, plazo y seguimiento de estado
- **Auditoría del Sistema**: Registrar todas las acciones importantes (creación, aprobación, rechazo)
- **Verificaciones Diarias**: Chequeos automáticos de:
  - Uso de materiales
  - Misiones vencidas/estancadas
  - Backlog de transmutaciones
  - Salud del sistema

### Notificaciones en Tiempo Real (WebSocket)
- **Pop-ups instantáneos** para eventos críticos:
  - ✅ Nuevo alquimista creado
  - ⚙️ Solicitud de transmutación creada
  - ✔️ Transmutación aprobada/rechazada
  - 📋 Misión asignada/completada
  - ⚠️ Misión vencida o estancada (>30 días)
- **Deduplicación**: Solo se muestran mensajes únicos para cada recurso
- **Auto-dismiss**: Los pop-ups desaparecen automáticamente en 7 segundos
- **Persistencia**: Notificaciones propagadas a todos los clientes conectados

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
│  • TypeScript + React + Tailwind CSS                    │
│  • Componente Notifications (WebSocket)                 │
│  • Páginas: Alquimistas, Transmutaciones, Misiones      │
└────────────────────┬────────────────────────────────────┘
                     │ WebSocket + HTTP/REST
     ┌───────────────┴──────────────────┐
     │                                   │
┌────▼─────────────────────────┐  ┌────▼────────────────────┐
│  BACKEND (Go + Gorilla)      │  │  WebSocket Hub          │
│  • API REST                  │  │  • Broadcast channel    │
│  • Handlers (alquimistas,    │  │  • Cliente management   │
│    transmutaciones, misiones)│  │  • Message propagation  │
│  • Queue Publisher           │  └─────────────────────────┘
└────┬─────────────────────────┘
     │
     ├──────────────────┬─────────────────┬──────────────────┐
     │                  │                 │                  │
┌────▼──────────┐  ┌───▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐
│ PostgreSQL    │  │   Redis      │  │  RabbitMQ   │  │   Workers   │
│  Datos        │  │   Cache      │  │   Queues    │  │  (Go)       │
│  Persistencia │  │   Sesiones   │  │   Async     │  │  Listeners  │
└───────────────┘  └──────────────┘  └─────────────┘  └──────┬──────┘
                                                               │
                                  ┌────────────────────────────┤
                                  │  Procesa eventos de:       │
                                  │  • Transmutaciones         │
                                  │  • Auditorías              │
                                  │  • Chequeos Diarios        │
                                  └────────────────────────────┘
```

---

## 🚀 Instalación

### Prerrequisitos
- Docker & Docker Compose
- Git (opcional)
- PowerShell 5.1+ (para Windows) o bash (Linux/Mac)

### Pasos de Instalación

#### 1. Clonar o descomprimir el proyecto
```bash
cd FMA-ProAva
cd infra
```

#### 2. Ejecutar con Docker Compose
```bash
docker-compose up --build
```

Esto levantará todos los contenedores:
- **fmaproava_postgres** → Base de datos (Puerto: 5432)
- **fmaproava_redis** → Cache (Puerto: 6379)
- **fmaproava_rabbitmq** → Colas de mensajes (Puerto: 5672, Web UI: 15672)
- **fmaproava_backend** → API REST + WebSocket (Puerto: 8080)
- **fmaproava_workers** → Procesadores asíncrono
- **fmaproava_frontend** → Next.js (Puerto: 3000)

#### 3. Acceder a la aplicación
- **Frontend**: http://localhost:3000
- **API REST**: http://localhost:8080/api
- **RabbitMQ Management**: http://localhost:15672 (user: `admin` / password: `admin123`)

---

## 📖 Uso

### Acceder a la Aplicación
1. Abre http://localhost:3000 en tu navegador
2. Navega entre las secciones:
   - **Gestión de Alquimistas**: Ver, crear alquimistas
   - **Transmutaciones**: Solicitar, revisar, aprobar/rechazar
   - **Misiones**: Asignar y seguimiento
   - **Auditoría**: Historial de acciones

### Ver Notificaciones en Tiempo Real
Las notificaciones aparecen automáticamente en la esquina superior derecha de la pantalla:
- Cada evento importante (crear alquimista, solicitar transmutación, etc.) genera un pop-up
- Los pop-ups se cierran automáticamente tras 7 segundos
- Solo aparece la notificación más reciente para cada recurso (sin duplicados)

---

## 🔌 API

### Endpoints Principales

#### Alquimistas
```bash
# Obtener todos
curl http://localhost:8080/api/alchemists

# Crear nuevo
curl -X POST http://localhost:8080/api/alchemists \
  -H "Content-Type: application/json" \
  -d '{
    "military_id": "A-999",
    "name": "Edward Elric",
    "title": "Alquimista de Acero",
    "specialization": "Metales"
  }'

# Obtener por ID
curl http://localhost:8080/api/alchemists/1
```

#### Transmutaciones
```bash
# Obtener todas
curl http://localhost:8080/api/transmutations

# Crear solicitud
curl -X POST http://localhost:8080/api/transmutations \
  -H "Content-Type: application/json" \
  -d '{
    "alchemist_id": 1,
    "input_material": "Hierro",
    "output_material": "Acero",
    "objective": "Crear armadura"
  }'

# Simular transmutación
curl -X POST http://localhost:8080/api/transmutations/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "input_material": "Hierro",
    "output_material": "Acero",
    "quantity": 10
  }'
```

#### Misiones
```bash
# Obtener todas
curl http://localhost:8080/api/missions

# Crear misión
curl -X POST http://localhost:8080/api/missions \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Patrullar región Este",
    "assigned_to": 1,
    "priority": "high",
    "deadline": "2025-12-31T00:00:00Z"
  }'
```

#### Sistema
```bash
# Health check
curl http://localhost:8080/health

# Estadísticas de workers
curl http://localhost:8080/api/queue/stats

# Ejecutar verificaciones diarias manuales
curl -X POST http://localhost:8080/api/queue/daily-checks
```

---

## 🔌 WebSocket - Notificaciones en Tiempo Real

### Conexión
```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => console.log('Conectado');
ws.onmessage = (evt) => {
  const payload = JSON.parse(evt.data);
  console.log('Notificación:', payload);
};
```

### Tipos de Notificaciones

#### Envelopes de Notificación (Inmediatos)
```json
{
  "type": "notification",
  "action": "ALCHEMIST_CREATED",
  "alchemist": { "id": 1, "name": "Edward", ... },
  "timestamp": "2025-11-15T12:00:00Z"
}
```

#### Logs de Auditoría (desde Workers)
```json
{
  "action": "TRANSMUTATION_APPROVED",
  "resource": "transmutation:5",
  "user_id": 1,
  "timestamp": "2025-11-15T12:00:00Z",
  "details": "Verificación: Valor < 1000"
}
```

### Acciones Soportadas
| Acción | Origen | Descripción |
|--------|--------|-------------|
| `ALCHEMIST_CREATED` | Handlers (inmediato) | Nuevo alquimista creado |
| `TRANSMUTATION_CREATED` | Handlers (inmediato) | Solicitud de transmutación creada |
| `TRANSMUTATION_APPROVED` | Workers (auditoría) | Transmutación aprobada |
| `TRANSMUTATION_REJECTED` | Workers (auditoría) | Transmutación rechazada |
| `MISSION_CREATED` | Handlers (inmediato) | Misión asignada |
| `OVERDUE_MISSION` | Workers (auditoría) | Misión vencida |
| `STALE_MISSION` | Workers (auditoría) | Misión sin cerrar >30 días |
| `HIGH_MATERIAL_USAGE` | Workers (auditoría) | Alto uso de materiales |

---

## 💻 Desarrollo

### Estructura de Directorios
```
FMA-ProAva/
├── backend/               # API en Go
│   ├── cmd/
│   │   ├── main.go        # Servidor principal
│   │   └── workers/       # Procesadores asíncrono
│   ├── internal/
│   │   ├── app.go         # Inicialización
│   │   ├── handlers.go    # Endpoints REST
│   │   ├── websocket.go   # Hub y client WS
│   │   ├── workers.go     # Lógica de workers
│   │   ├── queue.go       # RabbitMQ publisher
│   │   ├── models.go      # Estructuras de datos
│   │   └── ...
│   ├── Dockerfile
│   ├── Dockerfile.workers
│   ├── go.mod / go.sum
│   └── init.sql           # Esquema inicial BD
│
├── frontend/              # Next.js + React
│   ├── pages/
│   │   ├── _app.tsx       # Layout principal
│   │   ├── index.tsx      # Home
│   │   ├── alquimistas.tsx
│   │   ├── transmutaciones.tsx
│   │   ├── misiones.tsx
│   │   └── ...
│   ├── components/
│   │   └── Notifications.tsx  # WebSocket listener
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   └── tsconfig.json
│
├── infra/
│   ├── docker-compose.yml
│   └── ...
│
└── docs/
    └── openapi.yaml       # Especificación API
```

### Modificar la Aplicación

#### Backend (Go)
1. Editar archivos en `backend/internal/`
2. Reconstruir:
   ```bash
   cd infra
   docker-compose build backend
   docker-compose up -d backend
   ```

#### Frontend (React/Next.js)
1. Editar archivos en `frontend/` (excepto `.next/`)
2. Reconstruir:
   ```bash
   cd infra
   docker-compose build frontend
   docker-compose up -d frontend
   ```

### Variables de Entorno (en docker-compose.yml)
```yaml
# Backend
DB_HOST=postgres
DB_PORT=5432
DB_USER=alchemist
DB_PASS=equivalent_exchange
DB_NAME=fmaproava_dept
REDIS_ADDR=redis:6379
RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672
JWT_SECRET=your_secret_key
SERVER_PORT=8080

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

---

## 🧹 Limpieza

### Detener contenedores
```bash
docker-compose down
```

### Eliminar volúmenes (reset completo)
```bash
docker-compose down -v
```

### Limpiar imágenes sin usar
```bash
docker image prune
```

---

## 🐛 Troubleshooting

### Problema: WebSocket desconecta constantemente
**Solución**: Verifica que el frontend pueda alcanzar `ws://localhost:8080/ws`. Comprueba `NEXT_PUBLIC_WS_URL` en `docker-compose.yml`.

### Problema: No llega notificación de transmutación
**Solución**: 
1. Verifica que al menos un cliente WebSocket esté conectado (`WebSocket: client registered` en logs)
2. Revisa logs del backend: `docker-compose logs backend --tail=100`
3. Confirma que RabbitMQ está activo: `docker-compose ps`

### Problema: Base de datos vacía al iniciar
**Solución**: Verifica que el volumen `postgres_data` se haya creado:
```bash
docker volume ls | grep postgres
```

### Problema: Puerto ya en uso
**Solución**: Cambia el mapeo en `docker-compose.yml`:
```yaml
ports:
  - "8081:8080"  # Si 8080 está ocupado, usa 8081
```

---

## 📝 Licencia

MIT - Departamento de Alquimia Estatal

---

## 📧 Contacto

Para preguntas o reportar bugs, contacta al equipo de desarrollo.

**Última actualización**: 15 de Noviembre de 2025
