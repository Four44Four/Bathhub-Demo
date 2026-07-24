#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INTEGRATION_JEST_CONFIG="$WORKSPACE_DIR/jest.integration.config.js"

setup_supabase_project() {
  cp "$SCRIPT_DIR/supabase/config.toml" "$WORKSPACE_DIR/supabase/config.toml"
}

SUPABASE_PROJECT_ID="bathhub-integration-tests"

stop_supabase_stack() {
  echo "run-tests: stopping any stale Supabase state from previous runs..."
  supabase stop --yes >/dev/null 2>&1 || true

  local container
  while IFS= read -r container; do
    [[ -z "$container" ]] && continue
    docker rm -f "$container" >/dev/null 2>&1 || true
  done < <(
    docker ps -aq --filter "name=supabase_.*_${SUPABASE_PROJECT_ID}" 2>/dev/null || true
  )
}

start_supabase_stack() {
  local -a start_args=()
  local attempt

  if [[ "${SUPABASE_DEBUG:-}" == "1" ]]; then
    start_args+=(--debug)
  fi

  echo "run-tests: starting local Supabase stack..."
  echo "run-tests: after migrations, Supabase pulls and starts API containers through nested Docker."
  echo "run-tests: this step is slow on the first run; later runs reuse the bathhub-integration-inner-docker volume cache."
  echo "run-tests: set SUPABASE_DEBUG=1 for per-container progress from the Supabase CLI."

  stop_supabase_stack

  for attempt in $(seq 1 3); do
    if supabase start "${start_args[@]}"; then
      return 0
    fi

    echo "run-tests: supabase start attempt ${attempt}/3 failed" >&2
    supabase status >&2 || true
    stop_supabase_stack
    sleep 5
  done

  echo "run-tests: supabase start failed after 3 attempts" >&2
  exit 1
}

export_supabase_env() {
  export SUPABASE_URL="http://127.0.0.1:54323"

  local status_env
  status_env="$(supabase status -o env)"
  eval "$status_env"

  if [[ -z "${ANON_KEY:-}" ]]; then
    echo "run-tests: ANON_KEY missing from 'supabase status -o env'" >&2
    exit 1
  fi

  export SUPABASE_KEY="$ANON_KEY"

  if [[ -z "${SERVICE_ROLE_KEY:-}" ]]; then
    echo "run-tests: SERVICE_ROLE_KEY missing from 'supabase status -o env'" >&2
    exit 1
  fi

  export SERVICE_ROLE_KEY
  export SUPABASE_DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

  case "$SUPABASE_URL" in
    http://127.0.0.1:*|http://localhost:*|https://127.0.0.1:*|https://localhost:*)
      ;;
    *)
      echo "run-tests: SUPABASE_URL must point at local Supabase, got $SUPABASE_URL" >&2
      exit 1
      ;;
  esac
  case "$SUPABASE_DB_URL" in
    postgresql://*@127.0.0.1:*/*|postgresql://*@localhost:*/*)
      ;;
    *)
      echo "run-tests: SUPABASE_DB_URL must point at local Postgres" >&2
      exit 1
      ;;
  esac

  echo "run-tests: SUPABASE_URL=$SUPABASE_URL"
  echo "run-tests: SUPABASE_KEY set (${#SUPABASE_KEY} chars)"
}

REDIS_CONTAINER_NAME="bathhub-test-redis"

start_redis() {
  echo "run-tests: starting local Redis container..."
  docker rm -f "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
  docker run -d --name "$REDIS_CONTAINER_NAME" -p 6379:6379 redis:7-alpine >/dev/null

  for attempt in $(seq 1 30); do
    if docker exec "$REDIS_CONTAINER_NAME" redis-cli ping 2>/dev/null | grep -q PONG; then
      export REDIS_URL="redis://127.0.0.1:6379"
      echo "run-tests: REDIS_URL=$REDIS_URL"
      return 0
    fi
    sleep 1
  done

  echo "run-tests: Redis failed to start within 30s" >&2
  docker logs "$REDIS_CONTAINER_NAME" >&2 || true
  exit 1
}

cleanup() {
  docker rm -f "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true

  if [[ -n "${WORKSPACE_DIR:-}" ]] && command -v supabase >/dev/null 2>&1; then
    (
      cd "$WORKSPACE_DIR"
      supabase stop --yes >/dev/null 2>&1 || true
    )
  fi
}

trap cleanup EXIT

cd "$WORKSPACE_DIR"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "run-tests: docker daemon is required" >&2
  exit 1
fi

setup_supabase_project

start_supabase_stack

echo "run-tests: applying migrations from ./supabase/migrations..."
if ! supabase db reset --yes; then
  echo "run-tests: supabase db reset failed" >&2
  exit 1
fi

export_supabase_env

start_redis

echo "run-tests: running repeatable server PostgreSQL migration checks..."
npx jest --config "$INTEGRATION_JEST_CONFIG" --runInBand --verbose "$SCRIPT_DIR/ServerDbMigrations.integration.test.ts"

echo "run-tests: running bathroom_data_primary CRUD integration checks..."
npx jest --config "$INTEGRATION_JEST_CONFIG" --runInBand --verbose "$SCRIPT_DIR/Crud.integration.test.ts"

echo "run-tests: running bathroom H3 cell RPC integration checks..."
npx jest --config "$INTEGRATION_JEST_CONFIG" --runInBand --verbose "$SCRIPT_DIR/H3CellRpc.integration.test.ts"

echo "run-tests: running Redis read cache integration checks..."
npx jest --config "$INTEGRATION_JEST_CONFIG" --runInBand --verbose "$SCRIPT_DIR/ReadCache.integration.test.ts"

echo "run-tests: running find nearest bathroom integration checks..."
npx jest --config "$INTEGRATION_JEST_CONFIG" --runInBand --verbose "$SCRIPT_DIR/FindNearestBathroom.integration.test.ts"

echo "run-tests: running Redis rate limit integration checks..."
npx jest --config "$INTEGRATION_JEST_CONFIG" --runInBand --verbose "$SCRIPT_DIR/RateLimit.integration.test.ts"

echo "run-tests: running local cache integration checks against seeded locations.json rows..."
# sqlite-wasm loads through Node dynamic import; Jest needs VM module support.
NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--experimental-vm-modules" \
  npx jest --config "$INTEGRATION_JEST_CONFIG" --runInBand --verbose "$SCRIPT_DIR/LocalCache.integration.test.ts"

echo "run-tests: running Globe viewport Cesium orbit integration checks..."
NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--experimental-vm-modules" \
  npx jest --config "$INTEGRATION_JEST_CONFIG" --runInBand --verbose "$SCRIPT_DIR/GlobeViewport.integration.test.ts"

echo "run-tests: running user settings SQLite persistence and migration checks..."
NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--experimental-vm-modules" \
  npx jest --config "$INTEGRATION_JEST_CONFIG" --runInBand --verbose "$SCRIPT_DIR/UserSettingsDbSqlite.integration.test.ts"

echo "run-tests: running default user settings DB snapshot checks..."
NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--experimental-vm-modules" \
  npx jest --config "$INTEGRATION_JEST_CONFIG" --runInBand --verbose "$SCRIPT_DIR/DefaultUserSettingsDbSnapshot.integration.test.ts"

echo "run-tests: SUCCESS"
