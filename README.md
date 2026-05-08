# Finds Bathrooms Near You
 - Powered by Cesium Ion

# Frontend
## Home page
    - Has map centered on your location
    - Map has bathrooms on it
    - Buttons to quickly find nearest bathroom
    - Button to add a new bathroom
        - Prompts for location selection on map
        - On selection completion:
           - Run #Backend##Add new bathroom
## Bathroom page
    - Opened when a bathroom is opened
    - Can see and post: 
        - Pictures of the bathroom
        - Ratings of the bathroom
        - Comments about the bathroom
        - Extra info about the bathroom
## Settings page
    - Set urgent bathroom preferences:
        - Minimum bathroom quality
        - Maximum bathroom distance
        - AI summaries of bathrooms near you
        - More...
### Visual settings:
    - Dark/light mode
    - High contrast mode
    - Custom color themes
    - Bathroom icons

# Backend
## Add new bathroom
## Add new bathroom rating
## Add new bathroom review
## Add new bathroom pic
## Add new bathroom misc info

# Required API keys (in env vars)

# TODO
 - Make clicking on the globe spawn a red box there
    - Make the previous red box disappear when it is clicked again
 - Ask for access to device's realtime location
 - Integrate a real API for finding walking distance to that nearest bathroom from your current location
 - Display on the left side/gutter what the API call for the nearest bathroom walking info returns
 - On clicking globe, draw a path from current location to clicked location
 - Add Find nearest bathroom button
 - Make clicking on globe spawn a 2D bathroom image that always faces the camera
    - Bathroom will be stored in memory for now
    - Bathroom should disappear when zoomed out too far
       - Store the exact distance in a constant
 - Add dummy backend
 - Add buttons on home page trigger dummy backend
 - Add creating new Bathroom entries to frontend and backend
 - Make settings that affect which bathrooms Find nearest bathroom returns
 - Render nearest bathroom as 3d red box on the map
    - Render path to it
 - Update path at regular intervals
    - Move the map center whenever it updates

# Notes