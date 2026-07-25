# Constants
## Bathroom existence value deletion start threshold
 - -10.0

# Scheduled tasks
 - Uses `pg_cron` extension
## Daily
 - Run at 12:00 am UTC+0
### Decay bathroom existence value (daily scheduled task)
 - All bathrooms' [`existence_value` column](./bathroom_db.md#table-schema) will by multiplied by 0.995 (decrease by 0.5%)

# Functions
## Vote for bathroom existence
### Parameters (vote for bathroom existence)
#### bathroom_id (vote for bathroom existence)
 - Type:
    - Bigint
### Description (vote for bathroom existence)
 - Increment the `existence_value` column of the bathroom DB record for [bathroom_id parameter](#bathroom_id-vote-for-bathroom-existence) by 1.0
 - This is rate limited on the serverside with [this rate limit](./server_rate_limits.md#updating-bathrooms)

## Vote against bathroom existence
### Parameters (vote against bathroom existence)
#### bathroom_id (vote against bathroom existence)
 - Type:
    - Bigint
### Description (vote against bathroom existence)
 - Decrement the `existence_value` column of the bathroom DB record for [bathroom_id parameter](#bathroom_id-vote-against-bathroom-existence) by 1.0
 - This is rate limited on the serverside with [this rate limit](./server_rate_limits.md#updating-bathrooms)
