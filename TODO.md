# Sprint 2 (basic backend)
 - Centralize top band alerts in a dedicated alert type file
    - Multiple alert bands triggering will stack them vertically
       - The most recent alerts will be at the top
 - Make rate limit violations have a dedicated alert band
 - Make "schema out of date" screen only take up virtual phone interface
 - Add a spinner to "schema out of date" screen
 - Animate the "schema out of date" screen disappearing so it does not look so abrupt/flash for a second
 - Ensure that user settings migrations can be run repeatedly without side effects
 - Incorporate `coords.accuracy` to prevent browser geolocation jitter from being mistaken for movement ??
 - Redis caching for reads
 - Add rating system on bathrooms (stars 1-5)
 - Add comments system on bathrooms
 - Setup S3 for Supabase
 - Add media upload system on bathrooms
 - Make a Dockerfile for building a Docker container that exposes both the Supabase DB and the Redis server in one container when ran

# Sprint 3 (accounts)
 - Restrict destructive Bathroom DB operations to authenticated users

# Sprint 4 (offline caching)
 - Add way to save map data and all bathrooms visible in viewport
 - Add page to view and run path finding on saved map data
 - Add way to/button to enable automatically caching data about:
    - Nearby bathrooms of current geographic location
    - Bathrooms of custom selected area
 - Add page to switch to using cached local map/bathroom data