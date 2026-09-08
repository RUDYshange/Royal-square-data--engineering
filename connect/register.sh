#!/usr/bin/env bash
# Registers the CDC connector. Safe to re-run: deletes then recreates.
set -euo pipefail
CONNECT=${CONNECT:-http://localhost:8083}

echo "waiting for Kafka Connect..."
until curl -sf "$CONNECT/connectors" > /dev/null; do sleep 3; done

curl -s -X DELETE "$CONNECT/connectors/royalsquare-cdc" > /dev/null || true
curl -s -X POST -H "Content-Type: application/json" \
     --data @"$(dirname "$0")/debezium-postgres.json" \
     "$CONNECT/connectors" | python3 -m json.tool

echo
echo "connector status:"
sleep 5
curl -s "$CONNECT/connectors/royalsquare-cdc/status" | python3 -m json.tool
