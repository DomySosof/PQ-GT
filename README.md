# IVA Peque Contribuyente - RESICO

## Requisitos previos
- Docker Desktop instalado y corriendo
- Docker Compose incluido en Docker Desktop

## Instalacion rapida
1. Haz doble clic en `install.ps1`
2. Ingresa un puerto mayor a 40000 (ej: 50001)
3. Espera a que Docker construya e inicie los contenedores
4. Abre tu navegador en `http://localhost:PUERTO_QUE_ELIJISTE`

## Uso manual
```powershell
cd docker-app
.\install.ps1
```

## Comandos utiles
```powershell
# Detener todo
docker compose -f docker-app\docker-compose.yml down

# Ver logs
docker compose -f docker-app\docker-compose.yml logs -f

# Reiniciar
docker compose -f docker-app\docker-compose.yml restart
```

## Estructura del proyecto
```
docker-app/
├── docker-compose.yml    # Orquestacion de contenedores
├── Dockerfile            # Imagen de la app Node.js
├── package.json          # Dependencias Node.js
├── install.ps1           # Script de instalacion
├── src/
│   └── server.js         # Servidor Express + SQLite
├── db/
│   └── init.sql          # Base de datos inicial
└── public/
    └── index.html        # Aplicacion frontend
```

## Puertos
- App web: el puerto que elijas (>40000)
- Base de datos MySQL: 3307 en localhost

## Base de datos
- Motor: MariaDB 10.11
- Usuario: iva_user
- Contrasena: ivapass123
- Base de datos: iva_db

## Caracteristicas
- Dashboard con graficos (Chart.js)
- Tabla de 12 meses editable por clic
- Importar/Exportar JSON y CSV
- Configuracion de colores de graficos
- Configuracion de tipo de grafico y fondo
- Alerta automatica cuando superas el limite anual
- Calculo automatico de IVA al 5%
