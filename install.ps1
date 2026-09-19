$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  IVA Pequeño Contribuyente - INSTALADOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$puerto = Read-Host "Ingrese el puerto del servidor (debe ser mayor a 40000)"

try {
    $puertoInt = [int]$puerto
    if ($puertoInt -le 40000) {
        Write-Host "ERROR: El puerto debe ser mayor a 40000. Intente de nuevo." -ForegroundColor Red
        exit 1
    }
    if ($puertoInt -gt 65535) {
        Write-Host "ERROR: El puerto debe ser menor a 65536." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: Debe ingresar un numero valido." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Puerto seleccionado: $puerto" -ForegroundColor Green

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$dockerComposePath = Join-Path $scriptPath "docker-compose.yml"

if (-not (Test-Path $dockerComposePath)) {
    Write-Host "ERROR: No se encontro docker-compose.yml en $scriptPath" -ForegroundColor Red
    exit 1
}

$dockerFile = Join-Path $scriptPath "Dockerfile"
if (-not (Test-Path $dockerFile)) {
    Write-Host "ERROR: No se encontro Dockerfile en $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = & docker version --format "{{.Server.Version}}" 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Docker no responde" }
    Write-Host "Docker encontrado: version $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker no esta instalado o no esta corriendo. Instale Docker Desktop primero." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Creando archivo .env..." -ForegroundColor Yellow
$envContent = "APP_PORT=$puerto"
$envPath = Join-Path $scriptPath ".env"
Set-Content -Path $envPath -Value $envContent -Force
Write-Host "Archivo .env creado con puerto $puerto" -ForegroundColor Green

Write-Host ""
Write-Host "Construyendo imagen Docker..." -ForegroundColor Yellow
& docker compose -f $dockerComposePath build | Out-Null 2>&1
$buildCode = $LASTEXITCODE
if ($buildCode -ne 0) {
    Write-Host "ERROR: Falla al construir la imagen Docker" -ForegroundColor Red
    exit 1
}
Write-Host "Imagen construida correctamente" -ForegroundColor Green

Write-Host ""
Write-Host "Iniciando contenedores..." -ForegroundColor Yellow
& docker compose -f $dockerComposePath up -d | Out-Null 2>&1
$upCode = $LASTEXITCODE
if ($upCode -ne 0) {
    Write-Host "ERROR: Falla al iniciar los contenedores" -ForegroundColor Red
    exit 1
}
Write-Host "Contenedores iniciados correctamente" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  INSTALACION COMPLETADA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "La aplicacion esta corriendo en:" -ForegroundColor Cyan
Write-Host "  http://localhost:$puerto" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para detener:" -ForegroundColor Yellow
Write-Host "  docker compose -f $dockerComposePath down" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para ver logs:" -ForegroundColor Yellow
Write-Host "  docker compose -f $dockerComposePath logs -f" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para acceder a la aplicacion:" -ForegroundColor Yellow
Write-Host "  http://localhost:$puerto" -ForegroundColor Cyan
Write-Host "  API: http://localhost:$puerto/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para detener:" -ForegroundColor Yellow
Write-Host "  docker compose -f $dockerComposePath down" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para ver logs:" -ForegroundColor Yellow
Write-Host "  docker compose -f $dockerComposePath logs -f" -ForegroundColor Yellow
Write-Host ""

$keepOpen = Read-Host "Presione Enter para salir"
