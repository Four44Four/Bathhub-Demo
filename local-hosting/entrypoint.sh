#!/usr/bin/env bash
# Start local development Supabase and Redis for bathhub.
#
# Connection URLs (after this script succeeds):
#   SUPABASE_URL=http://127.0.0.1:54331
#   REDIS_URL=redis://127.0.0.1:6380
#   Database (direct): postgresql://postgres:postgres@127.0.0.1:54332/postgres
#
# Set SUPABASE_KEY from `npx supabase --workdir ./local-hosting status` (ANON_KEY) in your .env file.
# Requires Docker, npm install (supabase devDependency), and bash (Git Bash/WSL on Windows).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

echo "local-hosting: starting development Supabase and Redis..."

"$SCRIPT_DIR/setup-supabase.sh"
"$SCRIPT_DIR/setup-redis.sh"

print_connection_summary

echo "local-hosting: ready"
