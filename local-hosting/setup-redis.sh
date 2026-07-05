#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

require_docker

if docker ps --format '{{.Names}}' | grep -qx "$REDIS_CONTAINER_NAME"; then
  echo "local-hosting: Redis container '$REDIS_CONTAINER_NAME' is already running"
elif docker ps -a --format '{{.Names}}' | grep -qx "$REDIS_CONTAINER_NAME"; then
  echo "local-hosting: starting existing Redis container '$REDIS_CONTAINER_NAME'..."
  docker start "$REDIS_CONTAINER_NAME" >/dev/null
else
  echo "local-hosting: creating Redis container '$REDIS_CONTAINER_NAME' on port $REDIS_PORT..."
  docker run -d \
    --name "$REDIS_CONTAINER_NAME" \
    -p "${REDIS_PORT}:6379" \
    redis:7-alpine >/dev/null
fi

if ! wait_for_redis; then
  echo "local-hosting: Redis failed to respond within 30s" >&2
  docker logs "$REDIS_CONTAINER_NAME" >&2 || true
  exit 1
fi

echo "local-hosting: Redis is ready at redis://127.0.0.1:${REDIS_PORT}"
