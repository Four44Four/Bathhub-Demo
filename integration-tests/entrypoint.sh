#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DATA_MNT="${DOCKER_DATA_MNT:-/var/lib/docker-data}"
dockerd_pid=""

cleanup() {
  if [[ -n "$dockerd_pid" ]] && kill -0 "$dockerd_pid" 2>/dev/null; then
    echo "entrypoint: stopping inner Docker daemon..."
    kill -TERM "$dockerd_pid" 2>/dev/null || true
    wait "$dockerd_pid" 2>/dev/null || true
  fi

  if mountpoint -q "$DOCKER_DATA_MNT" 2>/dev/null; then
    echo "entrypoint: unmounting $DOCKER_DATA_MNT..."
    umount "$DOCKER_DATA_MNT" 2>/dev/null || true
  fi
}

trap cleanup EXIT

echo "entrypoint: preparing tmpfs storage for inner Docker daemon..."
"$SCRIPT_DIR/setup-docker-storage.sh"

echo "entrypoint: starting in-container Docker daemon..."
dockerd >/var/log/dockerd.log 2>&1 &
dockerd_pid=$!

for attempt in $(seq 1 60); do
  if docker info >/dev/null 2>&1; then
    storage_driver="$(docker info -f '{{.Driver}}' 2>/dev/null || true)"
    echo "entrypoint: Docker daemon is ready (storage driver: ${storage_driver:-unknown})"
    exec ./integration-tests/run-tests.sh
  fi
  sleep 1
done

echo "entrypoint: Docker daemon failed to start within 60s" >&2
tail -n 50 /var/log/dockerd.log >&2 || true
exit 1
