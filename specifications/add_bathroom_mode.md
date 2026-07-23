# Constants
## Request timeout limit
 - 15 seconds
## Loading spinner accent color
 - #ffffff
## Loading spinner base color
 - "rgba(255, 255, 255, 0.22)"
## Loading spinner radius
 - 20px

# Variables
## New bathroom flag
 - Type:
    - Boolean

# Description
 - Hide all viewport2d elements except for the Cesium attribution text
 - Hide the pull handle for the swipe up menu
    - The user should not be able to enter the swipe up menu in this mode
 - Render the [add bathroom marker](./resources.md#add-new-bathroom-marker-image) with the bottom center edge exactly at the horizontal and vertical center of the Globe viewport
 - Allow the user to pan and zoom around the Globe as normal
 - Display the [reject and confirm buttons](#reject-or-confirm-buttons)
 - When exiting this Add bathroom mode AND [<new-bathroom-flag> variable](#new-bathroom-flag) is `false`:
    - Remove the [reject and confirm buttons](#reject-or-confirm-buttons)
    - Restore the original viewport2d elements
    - Restore the swipe menu in a fully non-collapsed state
 - When exiting this Add bathroom mode AND [<new-bathroom-flag> variable](#new-bathroom-flag) is `true`:
    - Remove the [reject and confirm buttons](#reject-or-confirm-buttons)
    - Restore the original viewport2d elements
    - Restore the swipe menu in a collapsed state

# Reject or confirm buttons
 - Is an instance of the [confirm and reject buttons](./components/confirm_reject_buttons.md)
    - [Reject button click callback](./components/confirm_reject_buttons.md#on-reject-click-callback) is the following:
       - Exit this Add bathroom mode with [<new-bathroom-flag> variable](#new-bathroom-flag) set as `true`
    - [Confirm button click callback](./components/confirm_reject_buttons.md#on-reject-click-callback) is the following:
       - Send off a request to server to save a new Bathroom entry with a verify status of 'pending'
       - Present a [darkened overlay](./background_darken.md) with a [loading spinner](./components/loading_spinner.md) at the center of the screen
          - [X position](./components/loading_spinner.md#x-position) and [y position](./components/loading_spinner.md#y-position) are set so that it will be in the center of the screen
          - [Accent color](./components/loading_spinner.md#accent-color) is [this color](#loading-spinner-accent-color)
          - [Base color](./components/loading_spinner.md#base-color) is [this color](#loading-spinner-base-color)
          - [Radius](./components/loading_spinner.md#radius) is [this size](#loading-spinner-radius)
       - When the server responds with a success payload within [timeout duration](#request-timeout-limit):
          - Remove the loading spinner but keep the bg
          - Present an [important notification alert](./AlertSystem.md#major-alerts) with the message text "Bathroom added !!" and a button at the bottom with greenish bg with the text "Ok"
          - When the user presses the "Ok" button:
             - Remove the bg and exit this Add bathroom mode with [<new-bathroom-flag> variable](#new-bathroom-flag) set as `true`
             - Requery the server for all Bathrooms in the viewport
             - Render them as they are received
       - When the server responds with a failure payload within [timeout duration](#request-timeout-limit):
          - Remove the [loading spinner](./components/loading_spinner.md) but keep the bg
          - Present an [important notification alert](./AlertSystem.md#major-alerts) with the message text "Something when wrong while adding Bathroom" and a button at the bottom with a reddish bg with the text "Ok"
          - When the user presses the "Ok" button:
             - Remove the bg and exit this Add bathroom mode with [<new-bathroom-flag> variable](#new-bathroom-flag) set as `false`
       - When the server does not respond within [timeout duration](#request-timeout-limit):
          - Remove the [loading spinner](./components/loading_spinner.md) but keep the bg
          - Present an important (popup) notification alert with the message text "Timed out while adding Bathroom" and a button at the bottom with a reddish bg with the text "Ok"
          - When the user presses the "Ok" button:
             - Remove the bg and exit this Add bathroom mode with [<new-bathroom-flag> variable](#new-bathroom-flag) set as `false`