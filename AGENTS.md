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

## Globe viewport specifications
 - Globe can be rotated/panned by dragging left click, dragging 1 finger across screen, or dragging 2 fingers across screen
 - Camera facing Globe can be brought closer to Globe's surface by scrolling mouse wheel forward, dragging right click up, or pinching in with 2 fingers
    - Doing those interactions in the opposite direction will bring the Camera farther from the Globe's surface
 - When using 2 fingers on the Globe, panning and zooming can happen simultaneously