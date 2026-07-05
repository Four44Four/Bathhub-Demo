# Local Hosting

These scripts start and manage local Supabase and Redis services for bathhub development.

## Prerequisites

- Docker must be installed and running.
- Run `npm install` from the repository root before starting Supabase. The scripts use the local Supabase CLI from `node_modules/.bin/supabase`.
- Run the scripts from a Bash-compatible shell. On Windows, use Git Bash or WSL.

## Connection URLs

After `entrypoint.sh` succeeds, use these local service URLs:

- Supabase API: `http://127.0.0.1:54331`
- Redis: `redis://127.0.0.1:6380`
- Supabase direct database URL: `postgresql://postgres:postgres@127.0.0.1:54332/postgres`

To get the Supabase anon and service role keys, run:

```bash
npx supabase --workdir ./local-hosting status
```

## Start Everything

From the repository root:

```bash
./local-hosting/entrypoint.sh
```

This starts Supabase and Redis. If no local Supabase data volume exists for the configured project, Supabase creates a new local database and the script applies migrations from `./supabase/migrations`.

## Start Services Separately

Start only Supabase:

```bash
./local-hosting/setup-supabase.sh
```

Start only Redis:

```bash
./local-hosting/setup-redis.sh
```

## Check Redis Status

From the repository root:

```bash
./local-hosting/status-redis.sh
```

This checks Docker for the local Redis container, verifies the Redis server responds to `redis-cli ping`, and prints the Redis URL, version, and uptime. If the container is missing or stopped, run `./local-hosting/setup-redis.sh`.

## Stop Without Deleting Data

```bash
./local-hosting/stop.sh
```

This stops running containers but preserves local Supabase database volumes and the Redis container for reuse.

## Delete Local Data

```bash
./local-hosting/tear-down.sh
```

This asks for confirmation, stops the services, removes the Redis container, and deletes Supabase containers and volumes for the local project. The next `entrypoint.sh` or `setup-supabase.sh` run will create a fresh Supabase database and apply migrations again.

