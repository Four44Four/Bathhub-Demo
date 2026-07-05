#!/usr/bin/env bash
# Stop local development Supabase and Redis without removing data volumes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

if docker ps --format '{{.Names}}' | grep -qx "$REDIS_CONTAINER_NAME"; then
  echo "local-hosting: stopping Redis container '$REDIS_CONTAINER_NAME' (container kept for reuse)..."
  docker stop "$REDIS_CONTAINER_NAME" >/dev/null
else
  echo "local-hosting: Redis container '$REDIS_CONTAINER_NAME' is not running"
fi

if [[ -x "$WORKSPACE_DIR/node_modules/.bin/supabase" ]]; then
  ensure_supabase_cli
  ensure_supabase_project_layout
  if run_supabase status >/dev/null 2>&1; then
    echo "local-hosting: stopping Supabase (database volumes preserved)..."
    run_supabase stop --yes
  else
    echo "local-hosting: Supabase is not running"
  fi
else
  echo "local-hosting: Supabase CLI not found at node_modules/.bin/supabase; skipped Supabase stop" >&2
fi

echo "local-hosting: stopped (Supabase DB and Redis data were not cleared)"
