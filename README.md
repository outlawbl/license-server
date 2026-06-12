# Panconnect License Server

Centralizirani server za upravljanje licencama za Panconnect aplikaciju.

## Arhitektura

```
┌─────────────────────────────────────────────────────────────┐
│                VAŠ SERVER (cloud)                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  License Server (ovaj repo)                          │  │
│  │  - FastAPI backend                                   │  │
│  │  - PostgreSQL baza                                   │  │
│  │  - JWT token signing                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              KLIJENT (Panconnect)                           │
│  - Šalje license_key + hardware_id                         │
│  - Prima JWT token (važi 24h)                              │
│  - Svi podaci ostaju lokalno (GDPR)                        │
└─────────────────────────────────────────────────────────────┘
```

## Brzi start

### Development (docker-compose)

```bash
# Kopiraj .env.template u .env i podesi JWT_SECRET_KEY
cp .env.template .env

# Generiraj JWT secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Start sve (postgres + api)
docker-compose up -d

# API docs
open http://localhost:8000/api/docs
```

### Production

```bash
# Build image
docker build -t license-server .

# Run s PostgreSQL
docker run -d \
  --name license-server \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://..." \
  -e JWT_SECRET_KEY="..." \
  license-server
```

## API Endpointi

### Public (za Panconnect klijente)

| Method | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/v1/license/validate` | Validacija licence (šalje JWT token) |
| GET | `/api/v1/license/check/{key}` | Brza provjera da li postoji |

### Admin (za vašu upravu)

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/v1/admin/stats` | Statistika |
| GET | `/api/v1/admin/licenses` | Lista licenci (paginacija) |
| GET | `/api/v1/admin/licenses/{id}` | Detalji licence |
| POST | `/api/v1/admin/licenses` | Kreiraj novu licencu |
| PUT | `/api/v1/admin/licenses/{id}` | Ažuriraj licencu |
| DELETE | `/api/v1/admin/licenses/{id}` | Obriši licencu |
| POST | `/api/v1/admin/licenses/{id}/suspend` | Suspenduj |
| POST | `/api/v1/admin/licenses/{id}/activate` | Aktiviraj |

## Status licence

- **active** - Licenca je aktivna, može se koristiti
- **suspended** - Privremeno suspendirana (može se re-aktivirati)
- **expired** - Istekla (datum isteka prošao)
- **revoked** - Trajno opozvana (nije važeca)

## Hardware binding

Licence se mogu vezati za specifični hardware (CPU + MAC + machine-id).

- Prvi request automatski veže licencu za taj hardware
- Za promjenu hardware-a, admin mora ručno ažurirati `hardware_id`

## Sigurnosne napomene

1. **JWT_SECRET_KEY** mora biti jako tajna i jedinstvena
2. Koristite HTTPS u production
3. Ograničite CORS samo na vaš admin panel
4. Redovno backup-ajte bazu

## Integracija sa Panconnect

Vidi `CLIENT_LIBRARY.md` za instrukcije kako dodati license klijent u Panconnect.

## Admin panel

TODO: Next.js admin panel za vizualno upravljanje licencama.

Trenutno koristite Swagger UI na `/api/docs` ili Postman/curl.
