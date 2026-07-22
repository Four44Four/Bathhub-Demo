# Constants
## Zoom indicator base color
 - #FF0000
## Zoom indicator flash color
 - #FF9696
## Zoom indicator fade out duration
 - 1 second
## Zoom indicator flash duration
 - 500 milliseconds
## Find bathroom icon color
 - #E4E4FF

# Description
 - 2D UI at static positions overlayed on the [Globe viewport](./GlobeViewport.md) but under the [swipe-up menu](./swipe_up_menu/swipe_up_menu.md)

# Components
## Recenter button
 - Is a [viewport2d button](./components/viewport2d_button.md) with the following properties:
    - Located at the bottom left corner (see [x position](./components/viewport2d_button.md#x-position) and [y position](./components/viewport2d_button.md#y-position))
    - Is [circular](./components/viewport2d_button.md#circular-flag)
    - Has [recenter icon](./resources.md#recenter-icon) as the [image](./components/viewport2d_button.md#image)
 - Only appears when the geolocation of the client is detected (and permissions are granted)
 - When interacted with:
    - If [globe movement user setting](./user_settings.md#toggle-globe-movement-animations) is set to true:
        - Play an animation to smoothly ease Globe rotation and client zoom level at the same time until the center of viewport is over the location of the client at the zoom level of the [initial camera height user setting](./GlobeViewport.md#initial-camera-height)
    - Else:
        - Instantly snap Globe rotation so that the center of the client's viewport is over the client's location and zoom level is of the [initial camera height user setting](./GlobeViewport.md#initial-camera-height)

## Find nearest bathroom button
 - Is a [viewport2d button](./components/viewport2d_button.md) with the following properties:
    - Located at the bottom right corner (see [x position](./components/viewport2d_button.md#x-position) and [y position](./components/viewport2d_button.md#y-position))
    - Is [circular](./components/viewport2d_button.md#circular-flag)
    - Has [find bathroom icon](./resources.md#find-bathroom-icon) as the [image](./components/viewport2d_button.md#image)
 - Only appears when the geolocation of the client is detected (and permissions are granted)
 - When interacted with:
    - Trigger [this](./find_nearest_bathroom_logic.md)

## Show swipe-up menu button
 - Is a [viewport2d button](./components/viewport2d_button.md) with the following properties:
    - Located at the top left corner (see [x position](./components/viewport2d_button.md#x-position) and [y position](./components/viewport2d_button.md#y-position))
    - Is [rectangular](./components/viewport2d_button.md#circular-flag)
    - Has [hamburger icon](./resources.md#hamburger-icon) as the [image](./components/viewport2d_button.md#image)
 - When interacted with:
    - The [swipe-up menu](./swipe_up_menu/swipe_up_menu.md) enters into [expanded mode](./swipe_up_menu/swipe_up_menu.md#expanded-mode) using the same transition as if its [pull handle](./swipe_up_menu/swipe_up_menu.md#pull-handle) was interacted with

## Zoom indicator
 - Display the [crosshairs icon](./resources.md#crosshairs-icon) at the [zoom location](#zoom-location-calculation)
 - It will instantly appear at 100% opacity when triggered, then linearly fade out its opacity over [this duration](#zoom-indicator-fade-out-duration)
 - When it gets triggered:
    - It starts out as the [flash color](#zoom-indicator-flash-color), then linearly fades out to [base color](#zoom-indicator-base-color) over [this duration](#zoom-indicator-flash-duration)
### Zoom location calculation
 - If mouse wheel scrolling or mouse right click drag scrolling:
    - The zoom location is the location of the mouse
 - If pinch zooming with 2 fingers:
    - The zoom location is the midpoint between the 2 fingers/pointers