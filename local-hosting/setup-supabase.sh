#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

require_docker
ensure_supabase_cli
ensure_supabase_project_layout

sync_supabase_migrations() {
  local copied_count=0
  local removed_count=0
  local migration_name
  local repo_file
  local local_file

  shopt -s nullglob

  for local_file in "$LOCAL_MIGRATIONS_DIR"/*; do
    [[ -f "$local_file" ]] || continue

    migration_name="$(basename "$local_file")"
    if [[ ! -f "$REPO_MIGRATIONS_DIR/$migration_name" ]]; then
      rm "$local_file"
      removed_count=$((removed_count + 1))
      echo "local-hosting: removed stale migration $migration_name"
    fi
  done

  for repo_file in "$REPO_MIGRATIONS_DIR"/*; do
    [[ -f "$repo_file" ]] || continue

    migration_name="$(basename "$repo_file")"
    local_file="$LOCAL_MIGRATIONS_DIR/$migration_name"
    if [[ ! -f "$local_file" || "$repo_file" -nt "$local_file" ]]; then
      cp -p "$repo_file" "$local_file"
      copied_count=$((copied_count + 1))
      echo "local-hosting: synced migration $migration_name"
    fi
  done

  shopt -u nullglob

  if [[ "$copied_count" -eq 0 && "$removed_count" -eq 0 ]]; then
    echo "local-hosting: local Supabase migrations already in sync"
  else
    echo "local-hosting: migration sync complete ($copied_count copied, $removed_count removed)"
  fi
}

sync_supabase_migrations

first_time=0
if ! supabase_instance_exists; then
  first_time=1
  echo "local-hosting: no existing Supabase volume found for project '$SUPABASE_PROJECT_ID'"
fi

start_args=()
if [[ "${SUPABASE_DEBUG:-}" == "1" ]]; then
  start_args+=(--debug)
fi

echo "local-hosting: starting Supabase (project: $SUPABASE_PROJECT_ID)..."
if ! run_supabase start "${start_args[@]}"; then
  echo "local-hosting: supabase start failed" >&2
  run_supabase status >&2 || true
  exit 1
fi

if [[ "$first_time" -eq 1 ]]; then
  echo "local-hosting: applying migrations from ./local-hosting/supabase/migrations..."
  if ! run_supabase migration up; then
    echo "local-hosting: supabase migration up failed" >&2
    exit 1
  fi
else
  echo "local-hosting: existing instance detected; database data is preserved"
  echo "local-hosting: applying any pending migrations (no reset)..."
  run_supabase migration up
fi

echo "local-hosting: Supabase is ready"
