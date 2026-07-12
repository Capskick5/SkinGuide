#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"

setup_service() {
  local service_dir="$1"
  local name="$2"
  local venv_dir="$service_dir/venv"

  if [[ ! -x "$venv_dir/bin/python" ]]; then
    echo "Creating Python environment for $name..."
    "$PYTHON_BIN" -m venv "$venv_dir"
  fi

  "$venv_dir/bin/python" -m pip install --upgrade pip
  "$venv_dir/bin/python" -m pip install -r "$service_dir/requirements.txt"
}

setup_service "$ROOT_DIR/aiskin-server/ai-scan-service" "AI Scan"
setup_service "$ROOT_DIR/aiskin-server/recommendation-service" "Recommendation"

echo "Python environments are ready."
