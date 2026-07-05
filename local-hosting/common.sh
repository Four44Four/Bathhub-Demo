#!/usr/bin/env bash
# Shared helpers for bathhub local development hosting (Supabase + Redis).
set -euo pipefail

LOCAL_HOSTING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$LOCAL_HOSTING_DIR/.." && pwd)"
SUPABASE_PROJECT_DIR="$LOCAL_HOSTING_DIR"
REPO_MIGRATIONS_DIR="$WORKSPACE_DIR/supabase/migrations"
LOCAL_MIGRATIONS_DIR="$LOCAL_HOSTING_DIR/supabase/migrations"

REDIS_CONTAINER_NAME="bathhub-dev-redis"
REDIS_PORT="6380"
SUPABASE_PROJECT_ID="bathhub-dev-local"
SUPABASE_API_PORT="54331"
SUPABASE_DB_PORT="54332"

# Resolved by ensure_supabase_cli: path to node_modules/.bin/supabase.
SUPABASE_CMD=""

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "local-hosting: docker is required but was not found in PATH" >&2
    echo "local-hosting: install Docker Desktop (Windows/macOS) or Docker Engine (Linux)" >&2
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "local-hosting: docker daemon is not running" >&2
    exit 1
  fi
}

ensure_supabase_cli() {
  local local_cli="$WORKSPACE_DIR/node_modules/.bin/supabase"
  if [[ -x "$local_cli" ]]; then
    SUPABASE_CMD="$local_cli"
    return 0
  fi

  echo "local-hosting: Supabase CLI is required but was not found at node_modules/.bin/supabase" >&2
  echo "local-hosting: run 'npm install' from the repo root (supabase is a devDependency)" >&2
  exit 1
}

ensure_supabase_project_layout() {
  if [[ ! -f "$LOCAL_HOSTING_DIR/supabase/config.toml" ]]; then
    echo "local-hosting: missing $LOCAL_HOSTING_DIR/supabase/config.toml" >&2
    exit 1
  fi

  if [[ ! -d "$REPO_MIGRATIONS_DIR" ]]; then
    echo "local-hosting: missing migrations directory at $REPO_MIGRATIONS_DIR" >&2
    exit 1
  fi

  if [[ -L "$LOCAL_MIGRATIONS_DIR" ]]; then
    rm "$LOCAL_MIGRATIONS_DIR"
  fi

  if [[ -e "$LOCAL_MIGRATIONS_DIR" && ! -d "$LOCAL_MIGRATIONS_DIR" ]]; then
    echo "local-hosting: $LOCAL_MIGRATIONS_DIR exists but is not a directory" >&2
    exit 1
  fi

  mkdir -p "$LOCAL_MIGRATIONS_DIR"
}

run_supabase() {
  if [[ -z "$SUPABASE_CMD" ]]; then
    echo "local-hosting: ensure_supabase_cli must run before run_supabase" >&2
    exit 1
  fi
  "$SUPABASE_CMD" --workdir "$SUPABASE_PROJECT_DIR" "$@"
}

supabase_instance_exists() {
  docker volume ls --format '{{.Name}}' 2>/dev/null | grep -q "$SUPABASE_PROJECT_ID"
}

wait_for_redis() {
  local attempt
  for attempt in $(seq 1 30); do
    if docker exec "$REDIS_CONTAINER_NAME" redis-cli ping 2>/dev/null | grep -q PONG; then
      return 0
    fi
    sleep 1
  done
  return 1
}

print_connection_summary() {
  echo ""
  echo "local-hosting: connection URLs"
  echo "  SUPABASE_URL=http://127.0.0.1:${SUPABASE_API_PORT}"
  echo "  REDIS_URL=redis://127.0.0.1:${REDIS_PORT}"
  echo "  Database (direct): postgresql://postgres:postgres@127.0.0.1:${SUPABASE_DB_PORT}/postgres"
  echo ""
  echo "local-hosting: run 'npx supabase --workdir ./local-hosting status' for ANON_KEY / SERVICE_ROLE_KEY"
}
