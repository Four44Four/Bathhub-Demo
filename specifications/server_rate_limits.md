# Description
 - Store all rate limits as constants in the dedicated constants file in the server directory
 - Should be per IP address if user is not logged into an account or account ID if user is logged into an account
    - IP address should be valid even if application backend server is behind a proxy
 - Use Redis for keeping track of the current rate limit
    - Create a wrapper over all Redis calls to centralize Redis logic in a single directory, so that the Redis client can be switched out later if necessary without mass refactoring
    - The Redis URL should be passed through the environment variable REDIS_URL
 - When rate limits are violated:
    - Display a negative alert band with white text "Violated rate limit for <server-task-name>"
    - EXAMPLE:
       - "Violated rate limit for bathroom creation" for bathroom creation
       - "Violated rate limit for retrieving bathrooms" for bathroom reading sync
       - "Violated rate limit for finding nearest bathroom" for nearest bathroom query
 - [Redis maximum memory eviction policy is least recently used](./serverside_caching.md)

## Accounts
### Creation (account)
 - 1 per 12 hours
### Login (account)
 - 10 per 5 minutes
### Reading (account)
 - 30 per minute
### Image uploading (account)
 - 10 per 10 minutes

## Bathrooms
### Creation (bathrooms)
 - 5 per minute
 - 15 per day
### Reading/sync with client bounds (bathrooms)
 - User is logged into an account:
    - 100 per 30 seconds
 - User is logged out of an account (rate-limiting by IP):
    - 70 per 30 seconds
### Querying about nearest bathroom to coordinates (bathrooms)
 - 20 per minute
### Updating (bathrooms)
 - 20 per minute

## Path data generation via ORS
 - 10 per minute
 - 300 per day

## User config rate limits
 - Pulling current default DB:
    - 5 per minute
    - 20 per day
 - Pulling migration scripts:
    - 5 per minute
    - 50 per day