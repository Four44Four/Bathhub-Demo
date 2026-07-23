# Constants
## Path update min distance
 - 10 meters
## Path update debounce time
 - 3 seconds
## Min vertex separation pixel distance
 - 10 pixels
## Path LOD rebuild debounce time
 - 500 milliseconds
## Arrived at bathroom distance
 - 10 meters
## Path data fetch timeout duration
 - 15 seconds
## Nearest bathroom fetch timeout duration
 - 15 seconds
## Path client location update delay
 - 1 second

# Components definitions
 - `bathroomActiveNavigation` is a variable that should persist across sessions
    - On the web-app demo:
       - It should stay on if the client reloads webpage or closes webpage and returns
    - On the native app version:
       - It should stay on if the client closes app or turns off device
 - Confirm Find Bathroom mode:
    - Similar to Add bathroom mode, where most viewport2d elements + swipe-up menu are removed
    - Has [X and checkmark buttons](./add_bathroom_mode.md#reject-or-confirm-buttons) at bottom to reject navigation or start navigating
    - Display [confirm and reject button](./components/confirm_reject_buttons.md)
       - [Reject button click callback](./components/confirm_reject_buttons.md#on-reject-click-callback) is the following:
          - If [toggle globe movement animations user setting](./user_settings.md#toggle-globe-movement-animations) is `true`:
             - Animate camera back to position and zoom level when the bathroom navigation started
          - Else:
             - Instantly snap camera back to position and zoom level when the bathroom navigation started
       - [Confirm button click callback](./components/confirm_reject_buttons.md#on-reject-click-callback) is the following:
          - Set `bathroomActiveNavigation` to true
          - Exit Confirm Find Bathroom mode
          - Enter Find Bathroom mode
          - If [toggle globe movement animations user setting](./user_settings.md#toggle-globe-movement-animations) is `true`:
             - Animate camera to the client's location at height from Globe surface ["Init camera height" from user settings](./user_settings.md#initial-camera-height)
          - Else:
             - Instantly snap camera to the client's location at height from Globe surface ["Init camera height" from user settings](./user_settings.md#initial-camera-height)
 - Find bathroom mode
    - Restore viewport2d buttons EXCEPT for Find nearest bathroom button
    - Replace Find nearest bathroom button with a circular button reddish button of the same size with an X
        - Borderless
        - Background color of the button should be NEGATIVE_COLOR
        - Foreground color will be the background color but with the brightness value multipied by FG_COLOR_VALUE_FACTOR
        - When interacted with:
            - Exit Find Bathroom mode
            - Remove the Exit Find Bathroom mode button
            - Restore Find bathroom button
            - Set `bathroomActiveNavigation` to false
            - Clear the rendered path

# Actions after interacting with Find bathroom button
 - Save the camera position and zoom level that the client is currently at at the moment that they interact with the Find nearest bathroom button from viewport2d
 - Client sends their current location + [user settings from under their bathroom settings subsettings](./user_settings.md#bathroom-settings-subsettings-page) to use as constraints
 - On the server:
    - Using the provided user location and user bathroom constraints:
       - The nearest bathroom is calculated from the bathroom DB
       - Send the id and location of the nearest bathroom back to the client
    - If an error occurs while finding a bathroom:
       - Send back the error to the client
    - If the bathroom takes longer than [this timeout duration](#nearest-bathroom-fetch-timeout-duration):
       - Send back the error to the client
    - If no bathroom is found with the provided user constraints:
       - Send a no bathroom response to the client
 - On the client:
    - If the bathroom response timed out:
       - Render a [negative important notification](./AlertSystem.md#major-alerts) that the bathroom response timed out with text "Finding bathroom timed out" and a single button with text "Ok"
    - If an error is received:
       - Render a [negative important notification](./AlertSystem.md#major-alerts) with text "An error occurred while finding nearest bathroom" with single button with text "Ok"
    - If no bathrooms were found:
       - Render a [negative important notification](./AlertSystem.md#major-alerts) with text "No valid nearby bathrooms were found" with single button with text "Ok"
    - If the bathroom response came back in time:
       - Enter into Confirm Find Bathroom mode:
          - Camera animates (depending on config option) over found bathroom at height from Globe surface "Init camera height" from user settings:
             - Upon reaching the found bathroom:
                - Force a query for the bathrooms visible in the current Globe viewport so that the found bathroom marker will be rendered
 - As long as `bathroomActiveNavigation` is on:
    - If the client does not have geolocation on or their geolocation position is not accessible for whatever reason when opening the app or visiting the web-app demo page:
       - Set non-persistent variable `bathroomActiveNavigationPaused` to true
       - Keep rendering the path but do not update it or track the user's geolocation position
       - When the client grants geolocation permissions again or their geolocation position is accessible again:
          - Set `bathroomActiveNavigationPaused` to false
          - Enter Find bathroom mode
          - Immediately try updating their path based on their current location
          - Allow for automatic path updating according to the rest of this spec
    - Else:
       - On init:
          - Once the Globe init viewport animation has concluded:
             - Update the LOD geometry of the path to match the camera's current zoom level
       - On init and once the client has moved [this amount of distance](#path-update-min-distance) with [this debounce](#path-update-debounce-time):
          - Enter Find bathroom mode
          - Send request to server to calculate/return path data from current client location to target bathroom location
          - (re)Render the path from the client to the target bathroom with the path data
             - The rendered path will be an anti-aliased line on the Globe with several gradient, shader-based rendering effect options
             - Sharp corners should be smoothed out
             - At different zoom levels when the client is determined to be [idle](./GlobeViewport.md):
                - The geometry of the line will be updated so that the points will not be within a [this amount of pixels](#min-vertex-separation-pixel-distance) within each other on screen space coordinates
                - It should be simplified and render the line using less points at distant levels of zoom
                - It should be detailed and render the line using more points at close levels of zoom
                - Trigger path LOD rebuilding after [this amount of time](#path-lod-rebuild-debounce-time) that the client spends idling
                - The LOD geometry should **not** be updated if the zoom level has not changed if the user interacts with it
          - To implement updating the path when after a duration of time AND when a user moves enough:
            - Store the previous location that the path was updated at, starting with the original location of the client when starting the Find bathroom process
            - Store the previous timestamp that the path was updated at, starting with the time that the first path data was requested
            - If the current time and the previous time exceeds [this debounce duration](#path-update-debounce-time):
               - Calculate the spherical pythagorean distance between the previous path request location and current client location
               - If it exceeds [this amount of distance](#path-update-min-distance):
                  - Update the path data from the server
                  - If there was an error or the response took longer than [this time duration](#path-data-fetch-timeout-duration) while fetching updated path data:
                     - Display a negative band alert at the top of the screen with white text saying "Error while updating path" if there was an error, or "Timed out while updating path" if the request for new path data timed out
                     - Wait a [this debounce duration](#path-update-debounce-time)
                     - Retry fetching updated path data given the user's current location and the current target bathroom location:
                        - This happens independently from the user location and time debounced path updating logic
                     - Depending on if the retry succeeds or fails for whatever reason:
                        - Run the path rerendering logic that is supposed to execute when the user location and time debounce have been exceeded
                  - Else:
                     - Update the previous path request timestamp to the current time
                     - Update the previous path request location to the current location
                     - Rerender the path once the path data is received by the client
       - The client location used for checking for if client has moved or if client has arrived at target bathroom or any other future client location related nearest bathroom finding action will be updated at intervals of [this time duration](#path-client-location-update-delay)
 - Once client reaches within [this distance](#arrived-at-bathroom-distance) from the target bathroom:
    - Set `bathroomActiveNavigation` to false
    - Clear the currently rendered path
    - Display a [positive band alert](./AlertSystem.md#band-alerts) at the top of the screen with white text saying "Reached target bathroom"