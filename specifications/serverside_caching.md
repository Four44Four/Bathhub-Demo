# Constants
## Cached data TTL
 - 3600 seconds
# Description
 - All serverside DB reading will be cached in Redis
 - Redis TTL will be [this](#cached-data-ttl)
 - Updates to data will invalidate its cached equivalent (if it is cached)
 - Deletes to the data will remove it from the cache (if it is cached)
 - Max memory eviction policy will be least recently used
    - This will be shared across *all* Redis keys, including [rate limiting](./server_rate_limits.md)
 - If cache keys do not follow the below schemes:
    - They will be treated as cache misses
 - Cache keys will follow this naming scheme for individual resource queries:
    - <namespace>:<resource>:<id>
    - EXAMPLE:
       - prod:bathroom:9
       - test:bathroom:67
       - dev:bathroom:8
       - dev:user:193
 - [Bathroom bounds reads](./bathroom_db_reading.md) may be cached by complete h3 cells in Redis
    - Creation, updates, and deletions to the Bathroom data will invalidate the cached h3 cell they belong to
       - Caching and invalidation must use the identical rule regarding which cell to target
    - If the bounds read is too big to return h3 cells and falls back to direct bounding box query on the database:
       - Do not cache any h3 cells (as none should be read)
       - Individual bathroom rows may be cached
 - Cache keys will follow this naming scheme for bounds queries:
    - <namespace>:bathroom-h3-r<resolution>:<h3-cell>
    - EXAMPLE:
       - dev:bathroom-h3-r10:8a2a1072b59ffff