#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run/skinguide"

stop_process() {
  local name="$1"
  local pid_file="$RUN_DIR/$name.pid"

  if [[ ! -f "$pid_file" ]]; then
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  pkill -TERM -P "$pid" 2>/dev/null || true
  kill -TERM "$pid" 2>/dev/null || true
  rm -f "$pid_file"
  echo "Stopped $name."
}

for name in frontend recommendation ai-scan gateway order product user discovery; do
  stop_process "$name"
done

pkill -TERM -f "$ROOT_DIR/aiskin-server/.*/target/classes" 2>/dev/null || true
pkill -TERM -f "$ROOT_DIR/aiskin-server/ai-scan-service.*app.main" 2>/dev/null || true
pkill -TERM -f "$ROOT_DIR/aiskin-server/recommendation-service.*app.main" 2>/dev/null || true
pkill -TERM -f "$ROOT_DIR/aiskin-client/aiskin-web-app.*vite" 2>/dev/null || true

stop_repo_listeners() {
  local port pid cwd
  for port in 5000 5001 5174 8080 8081 8082 8083 8761; do
    for pid in $(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true); do
      cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
      if [[ "$cwd" == "$ROOT_DIR"* ]]; then
        kill -TERM "$pid" 2>/dev/null || true
      fi
    done
  done
}

stop_repo_listeners

docker compose -f "$ROOT_DIR/aiskin-server/kafka-compose.yml" stop >/dev/null
docker stop redis-skinguide >/dev/null 2>&1 || true

echo "SkinGuide development services are stopped."
