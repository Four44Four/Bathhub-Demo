#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

setup_supabase_project() {
  cp "$SCRIPT_DIR/supabase/config.toml" "$WORKSPACE_DIR/supabase/config.toml"
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

echo "run-tests: starting local Supabase stack..."
if ! supabase start; then
  echo "run-tests: supabase start failed" >&2
  supabase status >&2 || true
  exit 1
fi

echo "run-tests: applying migrations from ./supabase/migrations..."
if ! supabase db reset --yes; then
  echo "run-tests: supabase db reset failed" >&2
  exit 1
fi

export_supabase_env

echo "run-tests: running CRUD integration checks via Crud.ts..."
npx jest --verbose "$SCRIPT_DIR/Crud.integration.test.ts"

echo "run-tests: SUCCESS"
