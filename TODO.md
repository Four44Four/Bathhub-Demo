# Sprint 1 (frontend/UI)
 - On the button press: 
    - Draw a path from current location to clicked
 - Fix reloading with geolocation access enabled causing all zoom and globe panning/rotation sensitivities to drastically increase, potentially related to the camera height change being instant and the zoom and globe panning/rotation sensitives using the pre-updated height of the camera from the globe's surface instead of the intended, new height of the camera
 - Fix geolocation accessed client always having getStartPos() return viewport center, when it is supposed to return the client's current geolocated pos
 - Rename ./app/_components to ./app/_client
 - Write regression tests for UI and pathfinding logic so far
 - Create a swipe-up menu from the bottom of the screen that displays following buttons:
    - Find nearest bathroom (Front facing toilet with a target symbol in the middle)
    - Register new bathroom (Front facing toilet with a plus in the middle)
    - Toggle display current start location indicator
 - Recenter button on bottom left
 - Create error popup handler
    - Make attempting to find path to clicked location when there is no clicked location call the error popup handler
 - Write Sprint 1 reflection

# Sprint 2 (basic backend)
 - Add dummy backend
 - Add buttons on home page trigger dummy backend
 - Add creating new Bathroom entries to frontend and backend
 - Replace Find path to clocked location button with Find nearest bathroom button
 - Render nearest bathroom as 3d red box on the map
    - Render path to it
 - Update path at regular intervals
    - Move the map center whenever it 
 - Make settings that affect which bathrooms Find nearest bathroom returns
 - Write Sprint 2 reflection

# Sprint 3 (offline caching)
 - Add way to save map data and all bathrooms visible in viewport
 - Add page to view and run path finding on saved map data
 - Add way to/button to enable automatically caching data about:
    - Nearby bathrooms of current geographic location
    - Bathrooms of custom selected area
 - Add page to switch to using cached local map/bathroom data