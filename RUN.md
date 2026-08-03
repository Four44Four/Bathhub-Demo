# Environment Variables
## Required
 - OPEN_ROUTE_SERVICE_API_KEY
 - SUPABASE_URL
 - SUPABASE_KEY
 - REDIS_URL

# Run tests
 - `npm run unit-tests`
 - `npm run integration-tests`

# Development server
 - Create a .env file with environment variables outlined [above](#environment-variables)
 - `npm install`
 - `npm run dev`
 - Go to http://localhost:3000

# Production/Deployment server
 - If `.env.production.vault` doesn't exist: create a .env.production.vault file with all [required env vars](#environment-variables) and encrypt it
    - If using local Supabase + Redis on same machine as deployment host:
       - Copy `./local-hosting/` directory onto that machine
       - Copy `./supabase/migrations` directory onto that machine
       - Refer to local-hosting [README](./local-hosting/README.md) for how to start, stop, and clear locally hosted DBs
       - Env vars: `SUPABASE_URL=http://127.0.0.1:54331`, `REDIS_URL=redis://127.0.0.1:6380`, `SUPABASE_KEY=<result-of-"npx supabase --workdir ./local-hosting status">`
    - The source file must be named .env.production.vault to ensure the correct env vars are generated
    - `npx dotenvx encrypt -f .env.production.vault`
    - Store the produced .env.keys file/the decryption key produced by it somewhere secure
    - Delete the .env.keys file
 - Build the docker image
    - `docker build -f Dockerfile.production -t bathhub-demo:test ./`
 - Optional: compress image and SSH it
    - `docker save -o <dst-file-path-with-.tar-ext> bathhub-demo:test`
    - `scp <dst-file-path-with-.tar-ext> <user>@<ssh-ip>:<ssh-dst-directory-path>`
    - (On SSH server)
    - `docker load -i <dst-file-path-with-.tar-ext>`
 - Run styles (same image; vault URLs/keys must match the style you choose):
    - Remote/cloud Supabase + Redis
       - `docker run --env-file <.env.keys-file-path> -p <server-exposed-port>:3000 -d --name bathhub-demo --memory="<memory-limit>" --cpus="<cpu-limit>" bathhub-demo:test`
    - Local Supabase + Redis on the same machine
       - Host networking is required so `127.0.0.1` reaches host services (Linux; no `-p` needed — app listens on host port 3000)
       - `docker run --network host --env-file <.env.keys-file-path> -e PORT=<server-exposed-port> -d --name bathhub-demo --memory="<memory-limit>" --cpus="<cpu-limit>" bathhub-demo:test`