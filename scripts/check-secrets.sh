#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

patterns=(
  '(mongodb(\+srv)?|postgres(ql)?|mysql|redis)://[^/@[:space:]]+:[^@[:space:]]+@'
  'AIza[0-9A-Za-z_-]{30,}'
  'gh[pousr]_[0-9A-Za-z]{20,}'
  '(^|[^0-9A-Za-z])sk-[0-9A-Za-z_-]{20,}'
)

failed=0
for pattern in "${patterns[@]}"; do
  matches="$(git grep -I -l -E "$pattern" -- . || true)"
  if [[ -n "$matches" ]]; then
    failed=1
    printf 'Potential committed secret in:\n%s\n' "$matches" >&2
  fi
done

if [[ "$failed" -ne 0 ]]; then
  exit 1
fi

echo "PASS: no common credential patterns found in tracked files"
