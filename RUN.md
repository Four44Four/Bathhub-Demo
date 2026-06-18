# Environment Variables
## Required
 - OPEN_ROUTE_SERVICE_API_KEY
 - SUPABASE_URL
 - SUPABASE_KEY

# Run tests
 - `npm run unit-tests`
 - `npm run integration-tests`

# Development server
 - Create a .env file with environment variables outlined [above](#environment-variables)
 - `npm install`
 - `npm run dev`
 - Go to http://localhost:3000

# Production/Deployment server
 - If `.env.production.vault` doesn't exist: create a .env.production.vault file and encrypt it
    - The source file must be named .env.production.vault to ensure the correct env vars are generated
    - `npx dotenvx encrypt -f .env.production.vault`
    - Store the produced .env.keys file/the decryption key inside of it somewhere secure
    - Delete the .env.keys file
 - Build the docker image
    - `docker build -f Dockerfile.production -t bathhub-demo:test ./`
 - Optional: compress image and SSH it
    - `docker save -o <dst-file-path-with-.tar-ext> bathhub-demo:test`
    - `scp <dst-file-path-with-.tar-ext> <user>@<ssh-ip>:<ssh-dst-directory-path>`
    - (On SSH server)
    - `docker load -i <dst-file-path-with-.tar-ext>`
 - Run image:
    - `docker run --env-file <.env.keys-file-path> -p <server-exposed-port>:3000 -d --name bathhub-demo --memory="<memory-limit>" --cpus="<cpu-limit>" bathhub-demo:test`