# Description
 - All required server environment variables will be centralized in one place
 - Before starting server:
    - Ensure that all required server env vars are present
    - Ensure that each env var endpoint is:
       - Reachable
       - Authenticatable (if they need an authentication key to access that endpoint)
    - If any are missing or non-usable:
       - Immediately stop the server
       - Print out to console in red which ones are missing or non-usable