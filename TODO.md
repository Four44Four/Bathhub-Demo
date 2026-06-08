# Sprint 2 (basic backend)
 - Configure Supabase
 - Disable tapping on globe triggering anything
 - Add a button to enter "Mark a new bathroom" mode
    - Add a Globe viewport mode that is activated when that button is tapped
       - Mostly identical to normal Globe viewport mode
       - But render a 2D Globe marker pointing at center of screen
       - And add a new, salient button for marking the center as a new bathroom
          - When this button is tapped:
             - Trigger a request to the remote DB to make a new "Pending" bathroom
                - Apply debounce to making new bathroom
             - Tell user that a new bathroom was marked
             - Return to normal Globe viewport mode
             - Refresh the Globe viewport
 - When zooming close enough to the Globe:
    - Automatically start querying for bathrooms in viewport
    - Render them as they are received by the client
    - Indicate whether they are "Pending" or "Verified"
    - When tapped on:
       - Open up its bathroom page from the slide up menu
       - Show some dummy info on each bathroom that is unique for now
 - Add rating system on bathrooms (stars 1-5)
 - Add comments system on bathrooms
 - Setup S3 for Supabase
 - Add media upload system on bathrooms

~~~
# Sprint 2 (basic backend)
 - Add dummy backend
 - Add buttons on home page trigger dummy backend
 - Add creating new Bathroom entries to frontend and backend
 - Replace Find path to clocked location button with Find nearest bathroom button
 - Update path at regular intervals
    - Move the map center whenever it 
 - Make settings that affect which bathrooms Find nearest bathroom returns
 - Write Sprint reflection
~~~

# Sprint 3 (offline caching)
 - Add way to save map data and all bathrooms visible in viewport
 - Add page to view and run path finding on saved map data
 - Add way to/button to enable automatically caching data about:
    - Nearby bathrooms of current geographic location
    - Bathrooms of custom selected area
 - Add page to switch to using cached local map/bathroom data