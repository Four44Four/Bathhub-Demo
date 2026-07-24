# Custom types
## Verify_Status 
 - Enum of 'pending' and 'verified'

# Table name
 - bathroom_data_primary

# Table schema
 - `id` as type `BIGSERIAL`
 - `location` as type `GEOGRAPHY`
 - `verify_status` as type `Verify_Status`
 - `temp_data` as type `TEXT` with restrictions -> length of exactly 64
 - `created_at` as type `TIMESTAMP`
 - `version` as type `BIGINT NOT NULL`
     - Default value: 0
 - `rating_1_count` as type `BIGINT NOT NULL`
     - Default value: 0
 - `rating_2_count` as type `BIGINT NOT NULL`
     - Default value: 0
 - `rating_3_count` as type `BIGINT NOT NULL`
     - Default value: 0
 - `rating_4_count` as type `BIGINT NOT NULL`
     - Default value: 0
 - `rating_5_count` as type `BIGINT NOT NULL`
     - Default value: 0

# Description
 - Use PostGIS extension
 - Must be able to query all Bathroom entries efficiently given a rectangular area bounded by 2 latlong locations (opposing corners)