# Test/Dev
 - Create a .env file with environment variables outlined in README.md
 - `npm install`
 - `npm run dev`
 - Go to http://localhost:3000

# Production/Deploy
 - Build the docker image
    - `docker build -t bathhub-demo:test ./`
 - Optional: compress image and SSH it
    - `docker save -o <dst-file-path-with-.tar-ext> bathhub-demo:test`
    - `scp <dst-file-path-with-.tar-ext> <user>@<ssh-ip>:<ssh-dst-directory-path>`
    - (On SSH server)
    - `docker load -i <dst-file-path-with-.tar-ext>`
 - Run image:
    - `docker run -e <env-var-key-0>=<value> -e <env-var-key-1>=<value> <more-env-vars...> -p <server-exposed-port>:3000 -d --name bathhub-demo --memory="<memory-limit>" --cpus="<cpu-limit>" bathhub-demo:test`