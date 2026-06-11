# Sprint 2 (basic backend)
    - (for all Bathroom CRUD) Have REMOTE rate limits on all Bathroom DB operations
    - (for all Bathroom CRUD) Make integration tests in ./supabase/migrations
 - When zooming close enough to the Globe:
    - Automatically start querying for bathrooms in viewport
    - Render them as they are received by the client
    - Indicate whether they are "Pending" or "Verified"
    - Change behavior of tapping on Globe to not move GlobeImage to that point if there is a Bathroom marker on that spot and the zoom is close enough
    - When a visible Bathroom marker is tapped on:
       - Open up its bathroom page from the slide up menu
       - Show some dummy info on each bathroom that is unique for now
 - Cache the Bathroom locations that are found in a local SQLite DB so that repeated zooming in and out doesn't DOS the DB
    - Use GeoPackage ?
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