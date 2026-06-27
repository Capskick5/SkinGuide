@echo off
echo ================================================
echo  AiSkin Backend - Khoi dong tat ca services
echo ================================================
echo.

echo [1/7] Khoi dong Discovery Server (Eureka)...
start "Discovery Server" cmd /k "cd /d %~dp0discovery-server && call mvnw.cmd spring-boot:run"

echo Doi 20 giay cho Eureka san sang...
ping -n 21 127.0.0.1 > nul

echo.
echo [2/7] Khoi dong User Service...
start "User Service" cmd /k "cd /d %~dp0user-service && call run.bat"

echo Doi 15 giay cho User Service san sang...
ping -n 16 127.0.0.1 > nul

echo.
echo [3/7] Khoi dong Product Service...
start "Product Service" cmd /k "cd /d %~dp0product-service && call run.bat"

echo Doi 15 giay cho Product Service san sang...
ping -n 16 127.0.0.1 > nul

echo.
echo [4/7] Khoi dong Order Service...
start "Order Service" cmd /k "cd /d %~dp0order-service && call mvnw.cmd spring-boot:run"

echo Doi 15 giay cho Order Service san sang...
ping -n 16 127.0.0.1 > nul

echo.
echo [5/7] Khoi dong API Gateway...
start "API Gateway" cmd /k "cd /d %~dp0api-gateway && call mvnw.cmd spring-boot:run"

echo.
echo [6/7] Khoi dong AI Scan Service (Python)...
start "AI Scan Service" cmd /k "cd /d %~dp0ai-scan-service && call venv\Scripts\activate.bat && python -m app.main"

echo.
echo [7/7] Khoi dong Recommendation Service (Python)...
start "Recommendation Service" cmd /k "cd /d %~dp0recommendation-service && call ..\ai-scan-service\venv\Scripts\activate.bat && python -m app.main"

echo.
echo ================================================
echo  Tat ca services dang duoc khoi dong!
echo  - Eureka Dashboard : http://localhost:8761
echo  - API Gateway      : http://localhost:8080
echo  - User Service     : http://localhost:8081
echo  - Product Service  : http://localhost:8082
echo  - Order Service    : http://localhost:8083
echo  - AI Scan Service  : http://localhost:5000
echo  - Recommend Serv   : http://localhost:5001
echo ================================================

