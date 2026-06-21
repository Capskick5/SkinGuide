@echo off
echo ================================================
echo  AiSkin Backend - Khoi dong tat ca services
echo ================================================
echo.

echo [1/3] Khoi dong Discovery Server (Eureka)...
start "Discovery Server" cmd /k "cd /d %~dp0discovery-server && call mvnw.cmd spring-boot:run"

echo Doi 25 giay cho Eureka san sang...
ping -n 26 127.0.0.1 > nul

echo.
echo [2/3] Khoi dong User Service...
start "User Service" cmd /k "cd /d %~dp0user-service && call run.bat"

echo Doi 20 giay cho User Service san sang...
ping -n 21 127.0.0.1 > nul

echo.
echo [3/3] Khoi dong API Gateway...
start "API Gateway" cmd /k "cd /d %~dp0api-gateway && call mvnw.cmd spring-boot:run"

echo.
echo ================================================
echo  Tat ca services da duoc khoi dong!
echo  - Eureka Dashboard : http://localhost:8761
echo  - API Gateway      : http://localhost:8080
echo  - User Service     : http://localhost:8081
echo ================================================
