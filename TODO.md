# Sprint 2 (basic backend)
    - (for all Bathroom CRUD) Have REMOTE rate limits on all Bathroom DB operations
    - (for all Bathroom CRUD) Make integration tests in ./supabase/migrations
 - add dark gradient/shadow behind swipe-up menu pull handle bg
 - add hover/interact animations to the Globe viewport buttons
 - move find nearest bathroom onto the Globe viewport
    - make it pathfind from the user to the actual nearest bathroom
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