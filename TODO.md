# Sprint 2 (basic backend)
 - Fix bottleneck behind path LOD updates
 - Add a schema snapshot system for sending default user settings DB to client if they didnt have a DB prior
 - (for all Bathroom CRUD) Add REMOTE rate limits on all Bathroom DB operations + the pathfinding operation
 - Add rating system on bathrooms (stars 1-5)
 - Add comments system on bathrooms
 - Setup S3 for Supabase
 - Add media upload system on bathrooms

# Sprint 3 (accounts)
 - Restrict destructive Bathroom DB operations to authenticated users

# Sprint 4 (offline caching)
 - Add way to save map data and all bathrooms visible in viewport
 - Add page to view and run path finding on saved map data
 - Add way to/button to enable automatically caching data about:
    - Nearby bathrooms of current geographic location
    - Bathrooms of custom selected area
 - Add page to switch to using cached local map/bathroom data