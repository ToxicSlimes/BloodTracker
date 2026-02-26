# VPS BloodTracker — Production Management Skill

## Connection

```
Host: 77.232.42.99
User: root
Auth: SSH key (~/.ssh/id_rsa) — key already deployed
```

**SSH command pattern (Windows):**
```powershell
ssh -o BatchMode=yes root@77.232.42.99 "COMMAND"
```

For commands with shell expansions/globs, wrap in `sh -c`:
```powershell
ssh -o BatchMode=yes root@77.232.42.99 "sh -c 'ls /data/*.db'"
```

## Docker Setup

| Container | Purpose |
|-----------|---------|
| `bloodtracker-app` | ASP.NET 8 API + SPA (port 5000 internal) |
| `bloodtracker-caddy` | Reverse proxy + TLS (blood.txcslm.net) |

**Volume:** `/var/lib/docker/volumes/bloodtracker_bloodtracker-data/_data` → `/data` inside container

**Project dir on VPS:** `/opt/bloodtracker`

## Common Commands

### Container status
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Logs
```bash
docker logs bloodtracker-app --tail 100
docker logs bloodtracker-app --since 1h
docker logs bloodtracker-caddy --tail 50
```

### Restart
```bash
cd /opt/bloodtracker && docker compose restart app
cd /opt/bloodtracker && docker compose restart  # both
```

### Rebuild & deploy
```bash
cd /opt/bloodtracker && docker compose up -d --build
```

### Shell into container
```bash
docker exec -it bloodtracker-app sh
```

From outside (non-interactive):
```bash
docker exec bloodtracker-app sh -c 'COMMAND'
```

## Database

**Engine:** LiteDB (binary format, NOT SQLite)
**Location inside container:** `/data/`

| File | Purpose |
|------|---------|
| `auth.db` | Auth/users (shared) |
| `catalog.db` | Drug/exercise catalogs |
| `user_{guid}.db` | Per-user data (courses, drugs, logs, purchases, workouts) |

**IMPORTANT:** LiteDB files are binary. Cannot query with sqlite3 or text tools.
To inspect data, use the API endpoints (see below) or the admin impersonation endpoint.

### Backup
```bash
docker exec bloodtracker-app sh -c 'cp /data/user_*.db /data/backup_$(date +%Y%m%d)/'
```

Or copy to host:
```bash
docker cp bloodtracker-app:/data/ /opt/bloodtracker/backup/
```

## API Access (via curl from VPS)

All API endpoints require JWT auth. To get data:

### 1. Get admin token (if admin user exists)
```bash
# Use impersonation from admin controller, or login:
curl -s http://localhost:5000/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"EMAIL","password":"PASS"}'
```

### 2. Use token
```bash
TOKEN="..."
curl -s http://localhost:5000/api/v1/inventory -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:5000/api/v1/drugs -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:5000/api/v1/intakelogs -H "Authorization: Bearer $TOKEN"
```

### Key endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/inventory` | Full inventory with stock counts |
| GET | `/api/v1/drugs` | All drugs in current course |
| GET | `/api/v1/drugs/{id}` | Single drug details |
| GET | `/api/v1/drugs/{id}/statistics` | Drug consumption stats |
| GET | `/api/v1/intakelogs` | All intake logs |
| GET | `/api/v1/intakelogs?drugId={id}` | Logs filtered by drug |
| GET | `/api/v1/purchases` | All purchases |
| GET | `/api/v1/courses` | All courses |
| GET | `/api/v1/admin/users` | All users (admin only) |
| GET | `/api/v1/admin/impersonate/{userId}` | Get token as user (admin only) |

## Environment

**Config:** `/opt/bloodtracker/.env`
**Compose:** `/opt/bloodtracker/docker-compose.yml`

### .env contents (key vars)
- `JWT_SECRET` — JWT signing key
- `ADMIN_EMAIL` — admin user email
- `GOOGLE_CLIENT_ID` — Google OAuth
- `DATA_PATH` — LiteDB data volume path

## Deploy Pipeline

**Primary:** Push to `master` → GitHub Actions → builds Docker image → SSH deploys to VPS

**Manual (emergency):**
```bash
ssh root@77.232.42.99 "cd /opt/bloodtracker && git pull && docker compose up -d --build"
```

## Troubleshooting

### App not responding
```bash
docker logs bloodtracker-app --tail 50
docker restart bloodtracker-app
```

### Caddy TLS issues
```bash
docker logs bloodtracker-caddy --tail 50
docker exec bloodtracker-caddy caddy reload --config /etc/caddy/Caddyfile
```

### Disk space
```bash
df -h
docker system df
docker system prune -f  # clean unused images/containers
```

### DB corruption (LiteDB)
```bash
# Backup first!
docker cp bloodtracker-app:/data/user_GUID.db ./backup.db
# Restart container (LiteDB auto-repairs on startup)
docker restart bloodtracker-app
```
