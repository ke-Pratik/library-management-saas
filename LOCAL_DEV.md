# Local Development

## One-time setup (first run)

```powershell
# 1. Start Postgres (auto-applies V1__saas_schema.sql on first boot)
docker compose up -d

# 2. Wait ~5 seconds for the schema to apply, then verify:
docker exec -it lms-pg psql -U postgres -d postgres -c "\dt"
# Expect to see: tenants, users, students, fee_records, etc.
```

## Daily workflow

**Terminal 1 - backend:**
```powershell
cd backend
.\run-local.ps1
```

**Terminal 2 - frontend:**
```powershell
cd frontend
npm install     # first time only
npm run dev
```

Open <http://localhost:5173>.

## Default credentials

- **Sysadmin** (super-admin portal at `/sysadmin/login`):
  - username: `pratik`
  - password: `ChangeMe@123`

- **Tenants**: created via `/signup` flow.

## Reset the database (wipe everything)

```powershell
docker compose down -v
docker compose up -d
```

The `-v` flag deletes the data volume so the init script re-runs.

## Stop / start without losing data

```powershell
docker compose stop      # pause
docker compose start     # resume - data preserved
```

## Switching to Supabase later

Just change the three env vars in `backend/run-local.ps1`:

```powershell
$env:DB_URL      = "jdbc:postgresql://<host>.supabase.co:5432/postgres?sslmode=require"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "<supabase-pw>"
```

**Important**: use port **5432** (direct connection), not 6543 (pgbouncer transaction-mode pooler).
`SET LOCAL app.current_tenant` does NOT survive pgbouncer transaction-mode, which would
silently break tenant isolation.

Apply the schema once via the Supabase SQL editor (paste `V1__saas_schema.sql`).
