# Sprint 2 (basic backend)
    - (for all Bathroom CRUD) Have REMOTE rate limits on all Bathroom DB operations
    - (for all Bathroom CRUD) Make integration tests in ./supabase/migrations
 - add hover/interact animations to the Globe viewport buttons
    - invert the value of the button line, fill, text, and image over a specified duration
 - add bathroom preferences button + move find nearest bathroom onto the Globe viewport
 - impl bathroom preferences (clientside)
 - impl find nearest bathroom button
    - make it pathfind from the user to the actual nearest bathroom
    - save the original camera position/zoom level
    - nearest bathroom is calculated on the remote DB side
       - if it times out (> than specified amt of time):
          - make a notification to client
          - calculate it from the cached local bathrooms
             - respect client's bathroom preferences settings
    - if no nearest bathroom matching client's bathroom preferences is found:
       - notify them with an important negative notification
       - do nothing else
    - once client has found the nearest bathroom:
       - enter into Bathroom nevigation mode:
          - similar to Add bathroom mode, where most viewport2d elements + swipe-up menu are removed
          - has X and checkmark buttons at bottom to reject navigation or start navigating
          - camera animates (depending on config option) over found bathroom at same zoom level as when client loads into the app
          - if client rejects:
             - animate (depending on config option) camera back to position when the bathroom navigation started
          - if client accepts:
             - send request to server to retrieve path data from client current location to target bathroom location
             - ??? keep updating path every <some-amt-of-time> ???
             - once client reaches within specified distance from bathroom:
                - ??? stop updating path ????
                - notify client (non-intrusively) that they have reached the bathroom
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