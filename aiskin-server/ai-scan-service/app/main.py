from fastapi import FastAPI
import py_eureka_client.eureka_client as eureka_client
from contextlib import asynccontextmanager

# Eureka configuration
EUREKA_SERVER = "http://localhost:8761/eureka"
APP_NAME = "ai-scan-service"
APP_PORT = 5000

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Register to Eureka on startup
    await eureka_client.init_async(
        eureka_server=EUREKA_SERVER,
        app_name=APP_NAME,
        instance_port=APP_PORT,
        instance_host="127.0.0.1"
    )
    print("Registered to Eureka successfully!")
    yield
    # Unregister from Eureka on shutdown
    await eureka_client.stop_async()
    print("Unregistered from Eureka successfully!")

app = FastAPI(title="AI Scan Service", version="1.0.0", lifespan=lifespan)

@app.get("/api/scans/health")
async def health_check():
    return {"status": "ok", "message": "ai-scan-service is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=APP_PORT, reload=True)
