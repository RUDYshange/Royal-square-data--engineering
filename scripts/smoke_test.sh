#!/usr/bin/env bash
# Run after `make up`. Fails loudly if any layer is not actually working.
set -uo pipefail
PASS=0; FAIL=0

check() {
  local name="$1"; shift
  if "$@" > /dev/null 2>&1; then
    echo "  PASS  $name"; PASS=$((PASS+1))
  else
    echo "  FAIL  $name"; FAIL=$((FAIL+1))
  fi
}

echo "--- infrastructure ---"
check "postgres accepting connections" docker exec rs-postgres pg_isready -U rs
check "redpanda cluster healthy"       docker exec rs-redpanda rpk cluster health
check "minio reachable"                curl -sf http://localhost:9000/minio/health/live
check "kafka connect up"               curl -sf http://localhost:8083/
check "airflow web up"                 curl -sf http://localhost:8081/health
check "redis responding"               docker exec rs-redis redis-cli ping
check "api healthy"                    curl -sf http://localhost:8000/health

echo "--- data flow ---"
check "seed data loaded" \
  docker exec rs-postgres psql -U rs -d royalsquare -tAc \
  "SELECT 1 FROM ops.policies HAVING count(*) > 0"

check "cdc connector running" \
  bash -c "curl -sf http://localhost:8083/connectors/royalsquare-cdc/status | grep -q RUNNING"

check "cdc topics exist" \
  bash -c "docker exec rs-redpanda rpk topic list | grep -q rs.ops.claims"

check "stream view populated" \
  bash -c "docker exec rs-redis redis-cli exists claims:stage_counts | grep -q 1"

echo
echo "passed: $PASS   failed: $FAIL"
[ "$FAIL" -eq 0 ] || exit 1
