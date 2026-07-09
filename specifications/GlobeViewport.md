# Constants
## Time since last action for idle
 - 500 milliseconds
## Mouse zoom interpolated animate duration
 - 1 second
## Update viewport center location delay
 - 50 milliseconds
## Init animate duration
 - 1500 milliseconds
# Description
 - Globe can be rotated/panned by dragging left click, dragging 1 finger across screen, or dragging 2 fingers across screen
 - User is determined to be idle when there have been no mouse or pointer inputs for a [this duration of time](#time-since-last-action-for-idle)
    - Globe animations (such as when Recentering) will not invalidate the idle state, only user input
 - Camera facing Globe can be brought closer to Globe's surface by scrolling mouse wheel forward, dragging right click up, or pinching in with 2 fingers
    - Doing those interactions in the opposite direction will bring the Camera farther from the Globe's surface
 - Mouse wheel scrolling will result in an exponentially smoothed zoom in or 
    - The interpolated zoom time should be the [same duration](#mouse-zoom-interpolated-animate-duration) regardless of camera altitude
 - When using 2 fingers on the Globe, panning and zooming can happen simultaneously
 - When any action that triggers a zoom occurs, render a 2D image on the viewport according to ./app/_client/ZoomIndicator.tsx, centered on the spot on the screen where the mouse cursor is (in the case of mouse scroll wheel zoom or right click drag zoom), or the midpoint between the 2 fingers (in the case of 2 finger pinch zooming) 
 - The following references to GlobeImage refer to a Cesium billboard entity/image that always faces the camera
 - Clicking or tapping on the Globe moves GlobeImage according to ./app/_client/ClickedIndicator.ts to be centered on the calculated 3D point on the Globe
    - On initially loading the app, do not render the ClickedIndicator at all
 - If the user has not allowed geolocation data permission or has blocked access to geolocation data, render a 2D static image according to ./app/_client/MapMarker.ts with its bottom midpoint centered on the center of the GlobeViewport 
 - When the user allows geolocation data permissions:
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
Viewport2d:
 - 2D UI at static positions overlayed on the Globe viewport
 - Elements:
    - Recenter button:
       - Circular button
       - Has image public/crosshairs_center.svg
       - Located at the bottom left corner
       - Only appears when the geolocation of the client is detected (and permissions are granted)
       - When interacted with:
           - If [globe movement user setting](./user_settings.md#toggle-globe-movement-animations) is set to true:
              - Play an animation to smoothly ease Globe rotation and client zoom level at the same time until the center of viewport is over the location of the client at the zoom level of the [initial camera height user setting](#initial-camera-height)
           - Else:
              - Instantly snap Globe rotation so that the center of the client's viewport is over the client's location and zoom level is of the [initial camera height user setting](#initial-camera-height)
    - Find nearest bathroom button:
       - Circular button
       - Has image public/find_bathroom_icon.svg
       - Located at the bottom right corner
       - Only appears when the geolocation of the client is detected (and permissions are granted)
       - When interacted with:
          - Trigger [this](./find_nearest_bathroom_logic.md)
 - If the user has clicked or tapped on the Globe and a valid ClickedIndicator exists:
    - If the user clicks or taps on the UI button to run a Test pathfind: