@echo off
set BASE_DIR=%~dp0

echo Starting Discovery Server...
start "Discovery Server" cmd /k "cd /d %BASE_DIR%aiskin-server\discovery-server && mvnw.cmd spring-boot:run"
timeout /t 10

echo Starting API Gateway...
start "API Gateway" cmd /k "cd /d %BASE_DIR%aiskin-server\api-gateway && mvnw.cmd spring-boot:run"
timeout /t 5

echo Starting User Service...
start "User Service" cmd /k "cd /d %BASE_DIR%aiskin-server\user-service && mvnw.cmd spring-boot:run"

echo Starting Product Service...
start "Product Service" cmd /k "cd /d %BASE_DIR%aiskin-server\product-service && mvnw.cmd spring-boot:run"

if exist "%BASE_DIR%aiskin-server\recommendation-service" (
    echo Starting Recommendation Service...
    start "Recommendation Service" cmd /k "cd /d %BASE_DIR%aiskin-server\recommendation-service && mvnw.cmd spring-boot:run"
)

echo Starting AI Scan Service...
start "AI Scan Service" cmd /k "cd /d %BASE_DIR%aiskin-server\ai-scan-service && venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Web Frontend...
start "Web Frontend" cmd /k "cd /d %BASE_DIR%aiskin-client\aiskin-web-app && npm install && npm run dev"

echo All services launched!
