#!/usr/bin/env bash
# Stop local Supabase and Redis, remove containers, and delete all persistent data.
# Requires typing "yes" to proceed.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

echo "local-hosting: this will stop local Supabase and Redis, remove their containers,"
echo "local-hosting: and permanently delete all persistent Supabase and Redis data."
echo ""
printf "local-hosting: type 'yes' and press Enter to continue: "
read -r confirmation
if [[ "$confirmation" != "yes" ]]; then
  echo "local-hosting: aborted (no changes made)"
  exit 0
fi

require_docker

echo "local-hosting: stopping active services..."
"$SCRIPT_DIR/stop.sh"

if docker ps -a --format '{{.Names}}' | grep -qx "$REDIS_CONTAINER_NAME"; then
  echo "local-hosting: removing Redis container '$REDIS_CONTAINER_NAME'..."
  docker rm "$REDIS_CONTAINER_NAME" >/dev/null
else
  echo "local-hosting: Redis container '$REDIS_CONTAINER_NAME' not found"
fi

if [[ -x "$WORKSPACE_DIR/node_modules/.bin/supabase" ]]; then
  ensure_supabase_cli
  ensure_supabase_project_layout
  if supabase_instance_exists || run_supabase status >/dev/null 2>&1; then
    echo "local-hosting: removing Supabase containers and data volumes..."
    run_supabase stop --no-backup --yes
  else
    echo "local-hosting: no Supabase instance found for project '$SUPABASE_PROJECT_ID'"
  fi
else
  echo "local-hosting: Supabase CLI not found at node_modules/.bin/supabase" >&2
fi

while IFS= read -r volume; do
  [[ -z "$volume" ]] && continue
  echo "local-hosting: removing leftover Supabase volume '$volume'..."
  docker volume rm "$volume" >/dev/null
done < <(docker volume ls --format '{{.Name}}' 2>/dev/null | grep "$SUPABASE_PROJECT_ID" || true)

while IFS= read -r container; do
  [[ -z "$container" ]] && continue
  echo "local-hosting: removing leftover Supabase container '$container'..."
  docker rm -f "$container" >/dev/null
done < <(docker ps -a --format '{{.Names}}' 2>/dev/null | grep "$SUPABASE_PROJECT_ID" || true)

echo "local-hosting: tear-down complete (all persistent Supabase and Redis data was deleted)"
