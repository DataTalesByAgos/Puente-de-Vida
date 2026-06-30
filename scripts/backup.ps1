# Backup de la base de datos + ingesta de fuentes externas
# Uso: .\scripts\backup.ps1
# Para programarlo: abrí "Task Scheduler" > crear tarea > ejecutar powershell cada 6h

param(
  [string]$OutputDir = ".\backups",
  [switch]$SkipIngest
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutputDir = Join-Path (Resolve-Path ".") "backups"
if (!(Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null }

# 1) Ingesta de fuentes externas
if (-not $SkipIngest) {
  Write-Host "[backup] Sincronizando fuentes externas..."
  npm run ingest -w @pdv/api 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host "[backup] Ingesta OK" }
  else { Write-Host "[backup] Ingesta falló (continuando)" -ForegroundColor Yellow }
}

# 2) Backup PostgreSQL
$dbUrl = $env:DATABASE_URL
if (-not $dbUrl) { $dbUrl = "postgres://pdv:pdv_dev_password@localhost:5432/puente_de_vida" }

$outFile = Join-Path $OutputDir "pdv-backup-$timestamp.sql"
$outFileGz = "$outFile.gz"

Write-Host "[backup] Respaldo → $outFileGz"

# Extraer partes de la URL
$uri = [System.Uri]$dbUrl
$user = $uri.UserInfo.Split(':')[0]
$pass = $uri.UserInfo.Split(':')[1]
$hostPort = $uri.Host
$port = $uri.Port
$db = $uri.AbsolutePath.Trim('/')

# pg_dump con contraseña inline
$env:PGPASSWORD = $pass
& "pg_dump" -h $hostPort -p $port -U $user -d $db -F c -f "$outFile" 2>&1
if ($LASTEXITCODE -eq 0) {
  # Comprimir
  & "gzip" -f "$outFile" 2>$null
  # Borrar backups viejos (>7 días)
  Get-ChildItem $OutputDir -Filter "pdv-backup-*.sql.gz" | Where-Object {
    $_.LastWriteTime -lt (Get-Date).AddDays(-7)
  } | Remove-Item -Force
  Write-Host "[backup] OK → $outFileGz ($((Get-Item $outFileGz).Length / 1MB, 2) MB)"
} else {
  Write-Host "[backup] ERROR: pg_dump falló. Asegurate de tener PostgreSQL en el PATH." -ForegroundColor Red
}
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
