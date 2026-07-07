#!/usr/bin/env bash
# Prepare storage for the inner Docker daemon data-root.
# Overlay2 on tmpfs/ext4 is much faster than vfs and works regardless of the host FS.
#
# We intentionally avoid loopback+ext4 here: losetup loop devices leak across
# consecutive `docker run --rm` invocations on Docker Desktop (and some DinD
# hosts), causing "device node /dev/loopN is lost" on the next run.
#
# When run-docker.mjs mounts the bathhub-integration-inner-docker volume at
# /var/lib/docker-data, Supabase service images persist between test runs and
# `supabase start` skips the slow cold-pull path on subsequent runs.
set -euo pipefail

docker_data_mnt="${DOCKER_DATA_MNT:-/var/lib/docker-data}"
docker_data_size_mb="${DOCKER_DATA_SIZE_MB:-20480}"
daemon_json="${DOCKER_DAEMON_JSON:-/etc/docker/daemon.json}"

mkdir -p "$docker_data_mnt" "$(dirname "$daemon_json")"

cleanup_stale_containerd_locks() {
  # Interrupted `docker run --rm` runs can leave bolt/meta locks on the persisted
  # inner-docker volume and cause "timeout waiting for containerd to start".
  find "$docker_data_mnt/containerd" -name '*.lock' -delete 2>/dev/null || true
}

if mountpoint -q "$docker_data_mnt" 2>/dev/null; then
  echo "setup-docker-storage: using persisted docker data volume at $docker_data_mnt"
  cleanup_stale_containerd_locks
else
  echo "setup-docker-storage: mounting ${docker_data_size_mb}MB tmpfs at $docker_data_mnt"
  mount -t tmpfs -o "size=${docker_data_size_mb}m" tmpfs "$docker_data_mnt"
fi

cat >"$daemon_json" <<EOF
{
  "data-root": "$docker_data_mnt"
}
EOF
echo "setup-docker-storage: configured inner Docker data-root at $docker_data_mnt"
