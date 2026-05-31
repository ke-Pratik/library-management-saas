# Local dev runner for the SaaS backend.
# Usage:   .\run-local.ps1
# Stops on first error so config typos surface immediately.

$ErrorActionPreference = "Stop"

# --- Connection to local Docker Postgres (see docker-compose.yml at repo root) ---
$env:DB_URL      = "jdbc:postgresql://localhost:5432/postgres"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "pass"

# --- JWT secret (local only - regenerate for prod) ---
$env:JWT_SECRET  = "local-dev-secret-make-it-at-least-32-chars-long-please"

# --- CORS origin for the Vite frontend ---
$env:FRONTEND_URL = "http://localhost:5173"

# --- Sysadmin bootstrap (matches default bcrypt in application.properties) ---
# Plaintext password for the default hash: ChangeMe@123
$env:SYSADMIN_USERNAME = "pratik"

Write-Host ""
Write-Host "==> Starting Spring Boot on http://localhost:8080" -ForegroundColor Cyan
Write-Host "    DB:        $env:DB_URL"
Write-Host "    Frontend:  $env:FRONTEND_URL"
Write-Host "    Sysadmin:  $env:SYSADMIN_USERNAME / ChangeMe@123"
Write-Host ""

mvn spring-boot:run
