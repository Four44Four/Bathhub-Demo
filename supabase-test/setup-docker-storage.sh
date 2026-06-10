#!/usr/bin/env bash
# Prepare a loopback-mounted ext4 volume for the inner Docker daemon data-root.
# Overlay2 on ext4 is much faster than vfs and works regardless of the host FS.
set -euo pipefail

docker_data_img="${DOCKER_DATA_IMG:-/var/lib/docker-data.img}"
docker_data_mnt="${DOCKER_DATA_MNT:-/var/lib/docker-data}"
docker_data_size_mb="${DOCKER_DATA_SIZE_MB:-20480}"
daemon_json="${DOCKER_DAEMON_JSON:-/etc/docker/daemon.json}"

mkdir -p "$(dirname "$docker_data_img")" "$docker_data_mnt" "$(dirname "$daemon_json")"

if [[ ! -f "$docker_data_img" ]]; then
  echo "setup-docker-storage: creating ${docker_data_size_mb}MB image at $docker_data_img"
  truncate -s "${docker_data_size_mb}M" "$docker_data_img"
fi

loop_dev="$(losetup -f --show "$docker_data_img")"
echo "setup-docker-storage: attached $docker_data_img to $loop_dev"

if ! blkid -o value -s TYPE "$loop_dev" 2>/dev/null | grep -qx ext4; then
  echo "setup-docker-storage: formatting $loop_dev as ext4"
  mkfs.ext4 -F -q "$loop_dev"
fi

mount "$loop_dev" "$docker_data_mnt"
echo "setup-docker-storage: mounted $loop_dev at $docker_data_mnt"

cat >"$daemon_json" <<EOF
{
  "data-root": "$docker_data_mnt"
}
EOF
echo "setup-docker-storage: configured inner Docker data-root at $docker_data_mnt"
