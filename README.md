# Frontend Features
## Home page
 - Map with detailed, 3D globe rendering of the world
    - If the app has permission to access your location:
       - Will start above your location
    - Else:
       - Will start far above latitude and longitude => 0.0, 0.0
 - Can quickly show path to the nearest bathroom
    - Nearest bathroom settings can be configured in the Settings
 - Can add different bathrooms to the map via tapping, swiping up the menu, and tapping the "Add new Bathroom" button
 - Can read about the data from nearby, registered bathrooms
## Bathroom page
 - Shows upon opening any registered bathroom from the map
 - Can see and post: 
    - Pictures of the bathroom
    - Ratings of the bathroom
    - Comments about the bathroom
    - Extra info about the bathroom
## Settings page
 - Set nearby bathroom preferences:
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

# Tech stack
 - Next.js
    - Fullstack framework
 - Cesium
    - Rendering engine
 - Open Street Map
    - Distant mapping data
 - Carto
    - Detailed mapping data
 - Open Route Service
    - Route path calculation
 - Jest
    - Testing library

# Required API keys (in env vars)
 - OPEN_ROUTE_SERVICE_API_KEY