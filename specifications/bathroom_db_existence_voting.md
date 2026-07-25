# Constants
## Bathroom existence value deletion start threshold
 - -10.0
## Bathroom deletion time after deletion start
 - 180 days

# Scheduled tasks
 - Uses `pg_cron` extension
## Daily (scheduled tasks)
 - Run at 12:00 am UTC+0
### Decay bathroom existence value (daily scheduled task)
 - All bathrooms with `deletion_wait_started_timestamp` column that is `NULL` will have their [`existence_value` column](./bathroom_db.md#table-schema) will by multiplied by 0.995 (decrease by 0.5%)
### Delete all expired bathrooms that are pending deletion (daily scheduled task)
 - All bathrooms with `deletion_wait_started_timestamp` column that is not `NULL` which have a time difference greater than [the bathroom deletion time](#bathroom-deletion-time-after-deletion-start) will be deleted
    - <TODO:whenever-new-bathroom-data-is-added-delete-the-associated-data-with-this-bathroom-id-as-well-even-if-they-are-in-different-tables>

# Functions
## Vote for bathroom existence
### Parameters (vote for bathroom existence)
#### bathroom_id (vote for bathroom existence)
 - Type:
    - Bigint
### Description (vote for bathroom existence)
 - Increment the `existence_value` column of the bathroom DB record for [bathroom_id parameter](#bathroom_id-vote-for-bathroom-existence) by 1.0
 - This is rate limited on the serverside with [this rate limit](./server_rate_limits.md#updating-bathrooms)
 - If the `deletion_wait_started_timestamp` column for the bathroom DB record for [bathroom_id parameter](#bathroom_id-vote-for-bathroom-existence) is not `NULL`:
    - Set its `deletion_wait_started_timestamp` to `NULL`

## Vote against bathroom existence
### Parameters (vote against bathroom existence)
#### bathroom_id (vote against bathroom existence)
 - Type:
    - Bigint
### Description (vote against bathroom existence)
 - If [bathroom_id's](#bathroom_id-vote-against-bathroom-existence) `deletion_wait_started_timestamp` column is not `NULL`:
    - Do nothing
 - Else:
    - Decrement the `existence_value` column of the bathroom DB record for [bathroom_id parameter](#bathroom_id-vote-against-bathroom-existence) by 1.0
    - This is rate limited on the serverside with [this rate limit](./server_rate_limits.md#updating-bathrooms)
 - If the `deletion_wait_started_timestamp` column is `NULL` AND the resulting `existence_value` column of the bathroom DB record for [bathroom_id parameter](#bathroom_id-vote-against-bathroom-existence) is below or equal to -10.0:
    - Set its `deletion_wait_started_timestamp` column to the current timestamp