# Constants
## Positive color
 - #6CE0D1
## Negative color
 - #E06C89
## Margins
 - Horizontal margin:
    - 12px
 - Gap margin:
    - 8px
 - Bottom margin:
    - 16px

# Properties
## On reject click callback
 - Type:
     - Function that takes in a click event
## On confirm click callback
 - Type:
     - Function that takes in a click event

# Description
 - 2 [buttons](#buttons) at the base of the Globe viewport with [these margins](#margins) from the edges of the screen
    - Rounded rectangles of [default viewport2d Button corner radii](./viewport2d_button.md#corner-radius)
    - Fill up the entire width of the screen, with each button taking up roughly half, with some [margin](#margins) in between

# Buttons
## Reject button
 - Is a [viewport2d button](./viewport2d_button.md) with the following properties:
     - [Image](./viewport2d_button.md#image) is the [X symbol icon](../resources.md#x-symbol-icon) with color white (#000000)
     - [Fill color](./viewport2d_button.md#fill-color) is the [negative color](#negative-color)
     - [On click callback](./viewport2d_button.md#on-click-callback) is the [on reject click callback property](#on-reject-click-callback)
     - [Hover interaction behavior](./viewport2d_button.md#hover-interact-behavior) is "darken"
 - Is located on the right side
## Confirm button
 - Is a [viewport2d button](./viewport2d_button.md) with the following properties:
     - [Text](./viewport2d_button.md#image) is the [checkmark symbol](../resources.md#checkmark-icon) with color white (#000000)
     - [Fill color](./viewport2d_button.md#fill-color) is the [positive color](#positive-color)
     - [On click callback](./viewport2d_button.md#on-click-callback) is the [on confirm click callback property](#on-confirm-click-callback)
     - [Hover interaction behavior](./viewport2d_button.md#hover-interact-behavior) is "darken"
 - Is located on the left side
