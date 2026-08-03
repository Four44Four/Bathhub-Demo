#!/usr/bin/env bash
# Print Docker container IDs and data usage stats for local Redis and Supabase.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

SUPABASE_DB_CONTAINER="supabase_db_${SUPABASE_PROJECT_ID}"

require_docker

format_docker_volume_size() {
  local volume_name="$1"
  docker system df -v 2>/dev/null | awk -v volume="$volume_name" '
    $1 == "VOLUME" && $2 == "NAME" { in_volumes = 1; next }
    in_volumes && $1 == "Local" { in_volumes = 0 }
    in_volumes && $1 == volume { print $3; found = 1; exit }
    END { if (!found) print "unknown" }
  '
}

print_redis_status() {
  echo "=== Redis ==="

  if ! docker ps -a --format '{{.Names}}' | grep -qx "$REDIS_CONTAINER_NAME"; then
    echo "  Container: not found ($REDIS_CONTAINER_NAME)"
    echo "  Run './local-hosting/setup-redis.sh' to create it"
    return 0
  fi

  local container_id container_status container_size
  container_id="$(docker ps -a --filter "name=^${REDIS_CONTAINER_NAME}$" --format '{{.ID}}')"
  container_status="$(docker inspect --format '{{.State.Status}}' "$REDIS_CONTAINER_NAME")"
  container_size="$(docker ps -s --filter "name=^${REDIS_CONTAINER_NAME}$" --format '{{.Size}}' 2>/dev/null | head -n 1)"

  echo "  Name:      $REDIS_CONTAINER_NAME"
  echo "  ID:        $container_id"
  echo "  Status:    $container_status"
  if [[ -n "$container_size" ]]; then
    echo "  Disk:      $container_size"
  fi

  if [[ "$container_status" != "running" ]]; then
    echo "  Keys:      (container not running)"
    echo "  Memory:    (container not running)"
    return 0
  fi

  local key_count memory_used memory_peak
  key_count="$(docker exec "$REDIS_CONTAINER_NAME" redis-cli dbsize 2>/dev/null || echo "unknown")"
  memory_used="$(docker exec "$REDIS_CONTAINER_NAME" redis-cli info memory 2>/dev/null | awk -F: '
    $1 == "used_memory_human" { gsub(/\r$/, "", $2); print $2; exit }
  ')"
  memory_peak="$(docker exec "$REDIS_CONTAINER_NAME" redis-cli info memory 2>/dev/null | awk -F: '
    $1 == "used_memory_peak_human" { gsub(/\r$/, "", $2); print $2; exit }
  ')"

  echo "  Keys:      ${key_count:-unknown}"
  echo "  Memory:    ${memory_used:-unknown} (peak: ${memory_peak:-unknown})"
}

print_supabase_status() {
  echo "=== Supabase (project: $SUPABASE_PROJECT_ID) ==="

  local containers_found=0
  while IFS=$'\t' read -r container_id container_name container_status; do
    [[ -z "$container_name" ]] && continue
    containers_found=1
    echo "  Container: $container_name"
    echo "    ID:     $container_id"
    echo "    Status: $container_status"
  done < <(
    docker ps -a --format '{{.ID}}\t{{.Names}}\t{{.Status}}' \
      | awk -F'\t' -v project="$SUPABASE_PROJECT_ID" '$2 ~ project { print }'
  )

  if [[ "$containers_found" -eq 0 ]]; then
    echo "  Containers: none found"
    if ! supabase_instance_exists; then
      echo "  Run './local-hosting/setup-supabase.sh' to create a local instance"
    else
      echo "  Data volumes exist but containers are stopped"
      echo "  Run './local-hosting/setup-supabase.sh' to start Supabase"
    fi
  fi

  echo ""
  echo "  Volumes:"
  local volumes_found=0
  while IFS= read -r volume_name; do
    [[ -z "$volume_name" ]] && continue
    volumes_found=1
    local volume_size
    volume_size="$(format_docker_volume_size "$volume_name")"
    echo "    $volume_name: $volume_size"
  done < <(docker volume ls --format '{{.Name}}' 2>/dev/null | grep "$SUPABASE_PROJECT_ID" || true)

  if [[ "$volumes_found" -eq 0 ]]; then
    echo "    (none)"
  fi

  echo ""
  echo "  Database ($SUPABASE_DB_CONTAINER):"

  if ! docker ps --format '{{.Names}}' | grep -qx "$SUPABASE_DB_CONTAINER"; then
    echo "    Status: not running (cannot query row counts or database size)"
    return 0
  fi

  local db_size total_rows
  db_size="$(
    docker exec "$SUPABASE_DB_CONTAINER" psql -U postgres -d postgres -t -A -c \
      "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null \
      | tr -d '[:space:]'
  )"
  total_rows="$(
    docker exec "$SUPABASE_DB_CONTAINER" psql -U postgres -d postgres -t -A -c \
      "SELECT COALESCE(SUM(row_count), 0)::bigint
       FROM (
         SELECT (xpath('/row/c/text()', query_to_xml(
           format('select count(*) as c from %I.%I', table_schema, table_name),
           false, true, ''
         )))[1]::text::bigint AS row_count
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ) counts;" \
      2>/dev/null | tr -d '[:space:]'
  )"

  echo "    Size:        ${db_size:-unknown}"
  echo "    Total rows:  ${total_rows:-unknown} (public schema)"

  local table_rows
  table_rows="$(
    docker exec "$SUPABASE_DB_CONTAINER" psql -U postgres -d postgres -t -A -F ':' -c \
      "SELECT table_name,
              (xpath('/row/c/text()', query_to_xml(
                format('select count(*) as c from %I.%I', table_schema, table_name),
                false, true, ''
              )))[1]::text::bigint
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name;" 2>/dev/null || true
  )"

  if [[ -n "$table_rows" ]]; then
    echo "    Tables:"
    while IFS=':' read -r table_name row_count; do
      [[ -z "$table_name" ]] && continue
      echo "      $table_name: ${row_count:-0} rows"
    done <<<"$table_rows"
  else
    echo "    Tables:      (none in public schema)"
  fi
}

echo "local-hosting: Redis and Supabase data status"
echo ""
print_redis_status
echo ""
print_supabase_status
