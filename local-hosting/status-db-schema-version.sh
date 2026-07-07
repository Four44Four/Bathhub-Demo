#!/usr/bin/env bash
# Print the current server PostgreSQL schema version from local Supabase.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

SUPABASE_DB_CONTAINER="supabase_db_${SUPABASE_PROJECT_ID}"
SCHEMA_VERSION_QUERY="SELECT version FROM server_db_schema_version WHERE singleton IS TRUE"

require_docker
ensure_supabase_cli

if ! supabase_instance_exists; then
  echo "local-hosting: no local Supabase data volume found for project '$SUPABASE_PROJECT_ID'" >&2
  echo "local-hosting: run './local-hosting/setup-supabase.sh' or './local-hosting/entrypoint.sh' to start Supabase" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$SUPABASE_DB_CONTAINER"; then
  echo "local-hosting: Supabase database container '$SUPABASE_DB_CONTAINER' is not running" >&2
  echo "local-hosting: run './local-hosting/setup-supabase.sh' or './local-hosting/entrypoint.sh' to start Supabase" >&2
  exit 1
fi

query_stderr_file="$(mktemp)"
trap 'rm -f "$query_stderr_file"' EXIT

if ! query_stdout="$(
  run_supabase db query --local -o csv "$SCHEMA_VERSION_QUERY" 2>"$query_stderr_file"
)"; then
  if grep -q 'server_db_schema_version.*does not exist' "$query_stderr_file"; then
    echo "local-hosting: server_db_schema_version table was not found (schema version tracking migration not applied)" >&2
    echo "local-hosting: run './local-hosting/setup-supabase.sh' to apply pending migrations" >&2
  else
    echo "local-hosting: failed to query server database schema version" >&2
    cat "$query_stderr_file" >&2
  fi
  exit 1
fi

schema_version="$(printf '%s\n' "$query_stdout" | awk 'NR == 2 { print $1; exit }')"

if [[ -z "$schema_version" || ! "$schema_version" =~ ^[0-9]+$ ]]; then
  echo "local-hosting: server_db_schema_version table exists but no version row was found" >&2
  exit 1
fi

echo "local-hosting: server database schema version: $schema_version"
