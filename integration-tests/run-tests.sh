#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

setup_supabase_project() {
  cp "$SCRIPT_DIR/supabase/config.toml" "$WORKSPACE_DIR/supabase/config.toml"
}

start_supabase_stack() {
  local -a start_args=()

  if [[ "${SUPABASE_DEBUG:-}" == "1" ]]; then
    start_args+=(--debug)
  fi

  echo "run-tests: starting local Supabase stack..."
  echo "run-tests: after migrations, Supabase pulls and starts API containers through nested Docker."
  echo "run-tests: this step is slow on the first run; later runs reuse the bathhub-integration-inner-docker volume cache."
  echo "run-tests: set SUPABASE_DEBUG=1 for per-container progress from the Supabase CLI."

  if ! supabase start "${start_args[@]}"; then
    echo "run-tests: supabase start failed" >&2
    supabase status >&2 || true
    exit 1
  fi
}

export_supabase_env() {
  export SUPABASE_URL="http://127.0.0.1:54323"

  local status_env
  status_env="$(supabase status -o env)"
  eval "$status_env"

  if [[ -z "${ANON_KEY:-}" ]]; then
    echo "run-tests: ANON_KEY missing from 'supabase status -o env'" >&2
    exit 1
  fi

  export SUPABASE_KEY="$ANON_KEY"

  if [[ -z "${SERVICE_ROLE_KEY:-}" ]]; then
    echo "run-tests: SERVICE_ROLE_KEY missing from 'supabase status -o env'" >&2
    exit 1
  fi

  export SERVICE_ROLE_KEY

  case "$SUPABASE_URL" in
    http://127.0.0.1:*|http://localhost:*|https://127.0.0.1:*|https://localhost:*)
      ;;
    *)
      echo "run-tests: SUPABASE_URL must point at local Supabase, got $SUPABASE_URL" >&2
      exit 1
      ;;
  esac

  echo "run-tests: SUPABASE_URL=$SUPABASE_URL"
  echo "run-tests: SUPABASE_KEY set (${#SUPABASE_KEY} chars)"
}

cleanup() {
  if [[ -n "${WORKSPACE_DIR:-}" ]] && command -v supabase >/dev/null 2>&1; then
    (
      cd "$WORKSPACE_DIR"
      supabase stop --yes >/dev/null 2>&1 || true
    )
  fi
}

trap cleanup EXIT

cd "$WORKSPACE_DIR"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "run-tests: docker daemon is required" >&2
  exit 1
fi

setup_supabase_project

start_supabase_stack

echo "run-tests: applying migrations from ./supabase/migrations..."
if ! supabase db reset --yes; then
  echo "run-tests: supabase db reset failed" >&2
  exit 1
fi

export_supabase_env

echo "run-tests: running bathroom_data_primary CRUD integration checks..."
npx jest --runInBand --verbose "$SCRIPT_DIR/Crud.integration.test.ts"

echo "run-tests: running local cache integration checks against seeded locations.json rows..."
# sqlite-wasm loads through Node dynamic import; Jest needs VM module support.
NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--experimental-vm-modules" \
  npx jest --runInBand --verbose "$SCRIPT_DIR/LocalCache.integration.test.ts"

echo "run-tests: running Globe viewport Cesium orbit integration checks..."
NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--experimental-vm-modules" \
  npx jest --runInBand --verbose "$SCRIPT_DIR/GlobeViewport.integration.test.ts"

echo "run-tests: SUCCESS"
