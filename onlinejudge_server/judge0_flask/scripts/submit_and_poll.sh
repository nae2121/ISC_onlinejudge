#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:5000}
LANG=${LANG:-71}
SRC="${1:-print(\"hello\")}"
STDIN="${2:-}"

# submit
RESP=$(curl -sS -X POST "$BASE_URL/api/submit" \
  -H 'Content-Type: application/json' \
  -d "{\"language_id\":${LANG},\"source_code\":\"${SRC}\",\"stdin\":\"${STDIN}\"}")

TOKEN=$(echo "$RESP" | jq -r .token)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Submit failed: $RESP" >&2
  exit 1
fi

echo "Submitted token: $TOKEN"

# poll
while true; do
  OUT=$(curl -sS "$BASE_URL/api/result/$TOKEN")
  DONE=$(echo "$OUT" | jq -r .done)
  if [ "$DONE" = "true" ]; then
    echo "Result:"
    echo "$OUT" | jq .result
    exit 0
  fi
  sleep 1
done