@echo off
if exist .env (
    for /f "usebackq tokens=*" %%a in (`type .env ^| findstr /v "^#"`) do (
        set "%%a"
    )
    echo Loaded environment variables from .env
) else (
    echo .env file not found. Running with default configurations.
)
call .\mvnw.cmd spring-boot:run
