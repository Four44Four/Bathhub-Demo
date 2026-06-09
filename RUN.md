# Environment Variables
## Required
 - OPEN_ROUTE_SERVICE_API_KEY
 - SUPABASE_URL
 - SUPABASE_KEY
## Optional

# Test/Dev
 - Create a .env file with environment variables outlined in [Custom foo description](#environment-variables)
 - `npm install`
 - `npm run dev`
 - Go to http://localhost:3000

# Production/Deploy
 - If `.env.production.vault` doesn't exist: create a .env.production file and encrypt a it file into `.env.production.vault`
    - The source file must be named .env.production to ensure the correct env vars are generated
    - `npx dotenvx encrypt --stdout -f .env.production > .env.production.vault`
    - Delete the original .env.production
    - Store the produced .env.keys file/the decryption key inside of it somewhere secure
    - Delete the .env.keys file
 - Build the docker image
    - `docker build -t bathhub-demo:test ./`
 - Optional: compress image and SSH it
    - `docker save -o <dst-file-path-with-.tar-ext> bathhub-demo:test`
    - `scp <dst-file-path-with-.tar-ext> <user>@<ssh-ip>:<ssh-dst-directory-path>`
    - (On SSH server)
    - `docker load -i <dst-file-path-with-.tar-ext>`
 - Run image:
    - `docker run --env-file <.env.keys-file-path> -p <server-exposed-port>:3000 -d --name bathhub-demo --memory="<memory-limit>" --cpus="<cpu-limit>" bathhub-demo:test`