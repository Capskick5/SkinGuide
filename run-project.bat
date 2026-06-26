@echo off
echo ================================================
echo  AiSkin - Khoi dong toan bo he thong (BE + FE)
echo ================================================
echo.

echo [1/2] Khoi dong cac backend services...
start "AiSkin Backend Services" cmd /c "cd /d %~dp0aiskin-server && call start-all.bat"

echo.
echo [2/2] Khoi dong frontend web app...
start "AiSkin Frontend Web" cmd /k "cd /d %~dp0aiskin-client\aiskin-web-app && npm run dev"

echo.
echo ================================================
echo  Tat ca dang duoc khoi dong trong cac cua so rieng!
echo  - Frontend Web     : http://localhost:5173
echo  - Eureka Dashboard : http://localhost:8761
echo  - API Gateway      : http://localhost:8080
echo ================================================
pause
