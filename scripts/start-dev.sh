#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/aiskin-server"
RUN_DIR="$ROOT_DIR/.run/skinguide"
LOG_DIR="$ROOT_DIR/logs-runtime/dev"
ENV_FILE="$SERVER_DIR/.env"

mkdir -p "$RUN_DIR" "$LOG_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

if [[ ! -x "$SERVER_DIR/ai-scan-service/venv/bin/python" || ! -x "$SERVER_DIR/recommendation-service/venv/bin/python" ]]; then
  echo "Python environments are missing. Run scripts/setup-python.sh first."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

docker compose -f "$SERVER_DIR/kafka-compose.yml" up -d
if docker container inspect redis-skinguide >/dev/null 2>&1; then
  docker start redis-skinguide >/dev/null
else
  docker run -d --name redis-skinguide -p 6379:6379 redis:7-alpine >/dev/null
fi

start_process() {
  local name="$1"
  local workdir="$2"
  shift 2
  local pid_file="$RUN_DIR/$name.pid"

  if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "$name is already running."
    return
  fi

  (
    cd "$workdir"
    nohup "$@" >"$LOG_DIR/$name.log" 2>&1 &
    echo $! >"$pid_file"
  )
  echo "Started $name (PID $(cat "$pid_file"))."
}

start_process discovery "$SERVER_DIR/discovery-server" bash ./mvnw spring-boot:run

for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:8761 >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    echo "Discovery server did not become ready. Check $LOG_DIR/discovery.log"
    exit 1
  fi
  sleep 1
done

start_process user "$SERVER_DIR/user-service" bash ./mvnw spring-boot:run
start_process product "$SERVER_DIR/product-service" bash ./mvnw spring-boot:run
start_process order "$SERVER_DIR/order-service" bash ./mvnw spring-boot:run
start_process gateway "$SERVER_DIR/api-gateway" bash ./mvnw spring-boot:run
start_process ai-scan "$SERVER_DIR/ai-scan-service" "$SERVER_DIR/ai-scan-service/venv/bin/python" -m app.main
start_process recommendation "$SERVER_DIR/recommendation-service" "$SERVER_DIR/recommendation-service/venv/bin/python" -m app.main
start_process frontend "$ROOT_DIR/aiskin-client/aiskin-web-app" npm run dev -- --host 127.0.0.1 --port 5174

ready=false
for attempt in {1..30}; do
  if SMOKE_ATTEMPTS=1 "$ROOT_DIR/scripts/smoke-test.sh" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 2
done

if [[ "$ready" != "true" ]]; then
  echo "SkinGuide did not become ready. Current status:"
  "$ROOT_DIR/scripts/status-dev.sh"
  "$ROOT_DIR/scripts/stop-dev.sh"
  exit 1
fi

shutdown() {
  trap - INT TERM HUP
  "$ROOT_DIR/scripts/stop-dev.sh"
  exit 0
}

trap shutdown INT TERM HUP

echo "SkinGuide is ready. All smoke checks passed."
echo "Press Ctrl+C to stop all SkinGuide services."

while true; do
  sleep 5
done
