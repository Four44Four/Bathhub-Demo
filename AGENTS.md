<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project context
This is a web demo for a bathroom finding and rating mobile app.
This app queries a database of bathrooms.
Each bathroom has:
 - Pictures
 - Rating from 1 to 5
 - Comments
 - Features
Users open app to a 3D map viewport and can:
 - Find nearest bathroom using a button
 - Add a new bathroom on the map
 - Tap on an existing bathroom to trigger a redirection to that bathroom's page
 - In that page, the User can:
    - Submit pictures, comments, rating, features for that bathroom
Users can change persistent settings to affect what using the "Find nearest bathroom" button does

## Implementation rules
 - Always extract purely functional/mathematical logic into modular, top level functions
 - Use dependency injection pattern whenever possible

Specifications for the GlobeViewport are in file ./specifications/GlobeViewport.txt