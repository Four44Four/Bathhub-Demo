# Constants
## Time since last action for idle
 - 500 milliseconds
## Mouse zoom interpolated animate duration
 - 1 second
## Update viewport center location delay
 - 50 milliseconds
## Init animate duration
 - 1500 milliseconds
## User location marker color
 - #E4E4FF

# Description
 - Globe can be rotated/panned by dragging left click, dragging 1 finger across screen, or dragging 2 fingers across screen
 - User is determined to be idle when there have been no mouse or pointer inputs for a [this duration of time](#time-since-last-action-for-idle)
    - Globe animations (such as when [Recentering](./viewport2d.md#recenter-button)) will not invalidate the idle state, only user input
 - Camera facing Globe can be brought closer to Globe's surface by scrolling mouse wheel forward, dragging right click up, or pinching in with 2 fingers
    - Doing those interactions in the opposite direction will bring the Camera farther from the Globe's surface
 - Mouse wheel scrolling will result in an exponentially smoothed zoom in or 
    - The interpolated zoom time should be the [same duration](#mouse-zoom-interpolated-animate-duration) regardless of camera altitude
 - When using 2 fingers on the Globe, panning and zooming can happen simultaneously
 - When any action that triggers a zoom occurs:
    - Render the [zoom indicator](./viewport2d.md#zoom-indicator)
 - <TODO:have-not-impled-this-yet>If the user clicks or taps on the Globe AND [the zoom level is low enough to render bathroom markers](./bathroom_db_reading.md#maximum-display-bathroom-map-markers-height) AND the user clicks or taps on the image of the Bathroom map markers:
    - Open that bathroom map marker's [bathroom page](./bathroom_page.md)
 - If the user has not allowed geolocation data permissions or has blocked access to geolocation data:
    - Render the [user current location marker](#user-current-location-marker) with [`location` property](#location-user-current-location-marker) as `null`
    - When the user allows geolocation data permissions:
       - Move the [user current location marker](#user-current-location-marker) to the current location of the user
       - If [globe movement user setting](./user_settings.md#toggle-globe-movement-animations) is set to true:
          - Play an animation to smoothly ease Globe rotation and client zoom level at the same time until the center of viewport is over the location of the client at the zoom level of the [initial camera height user setting](#initial-camera-height)
       - Else:
          - Instantly snap Globe rotation so that the center of the client's viewport is over the client's location and zoom level is of the [initial camera height user setting](#initial-camera-height)
 - If the user already allowed geolocation data permission upon loading the app:
    - Load the GlobeViewport, Globe, and camera to have the user's geolocation position already centered on the GlobeViewport with the zoom level already set to the user settings value for "Init camera height (meters):
    - There should not be a moment where the Globe is at the default rotation and the camera is at the default distance from the surface of the Globe
 - With a [this delay](#update-viewport-center-location-delay), whenever the user is detected to be rotating the Globe or zooming:
    - Repeatedly calculate the 3D point on the Globe that is directly on the GlobeViewport's center
    - Cache this calculated 3D point
    - This calculation should be completely independent from the idle calculation
       - When the zoom animation is active but the user is no longer actively inputting:
          - Do not delay the idle, but continue calculating the center point
    - When the user is idle but there is still an active drag or zooming smoothing animation where the motion of the camera/Globe is not static: 
       - Keep calculating the point
    - When the user is idle AND there is no more drag or zooming smoothing animation active:
       - Stop calculating the point

# User current location marker
## Properties (user current location marker)
### `location` (user current location marker)
 - Type:
    - Geographic location or `null`
## Description (user current location marker)
 - If [`location` property](#location-user-current-location-marker) is `null`:
    - Render the [user location marker icon](./resources.md#user-location-marker-image) with [this color](#user-location-marker-color) as a 2D static image with the middle of the bottom edge centered on the horizontal and vertical center of the Globe viewport
    - There should be a slight drop shadow to match the 3D billboard image version of this
 - Else:
    - Render the [user location marker icon](./resources.md#user-location-marker-image) with [this color](#user-location-marker-color) as a 3D billboard image that always faces the camera on [`location` property](#location-user-current-location-marker)