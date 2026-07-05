#!/usr/bin/env bash
# Print local development Redis container and server status.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

require_docker

if ! docker ps -a --format '{{.Names}}' | grep -qx "$REDIS_CONTAINER_NAME"; then
  echo "local-hosting: Redis container '$REDIS_CONTAINER_NAME' was not found"
  echo "local-hosting: run './local-hosting/setup-redis.sh' to create and start it"
  exit 1
fi

container_status="$(docker inspect --format '{{.State.Status}}' "$REDIS_CONTAINER_NAME")"
echo "local-hosting: Redis container '$REDIS_CONTAINER_NAME' status: $container_status"

if [[ "$container_status" != "running" ]]; then
  echo "local-hosting: Redis is not running at redis://127.0.0.1:${REDIS_PORT}"
  echo "local-hosting: run './local-hosting/setup-redis.sh' to start it"
  exit 1
fi

if ! ping_response="$(docker exec "$REDIS_CONTAINER_NAME" redis-cli ping 2>/dev/null)"; then
  echo "local-hosting: Redis container is running, but redis-cli ping failed" >&2
  docker logs "$REDIS_CONTAINER_NAME" >&2 || true
  exit 1
fi

if [[ "$ping_response" != "PONG" ]]; then
  echo "local-hosting: unexpected Redis ping response: $ping_response" >&2
  exit 1
fi

echo "local-hosting: Redis ping: $ping_response"
echo "local-hosting: Redis URL: redis://127.0.0.1:${REDIS_PORT}"
docker exec "$REDIS_CONTAINER_NAME" redis-cli info server | awk -F: '
  { gsub(/\r$/, "", $2) }
  $1 == "redis_version" { printf "local-hosting: Redis version: %s\n", $2 }
  $1 == "uptime_in_seconds" { printf "local-hosting: Redis uptime: %s seconds\n", $2 }
'
