# Constants
## Drop shadow
 - Offset y:
    - 2px
 - Blur radius:
    - 8px
 - Spread:
    - 0px
 - Color:
    - "rgba(18, 18, 47, 0.25)"
## Fill color
 - #ffffff
## Text color
 - #B5B5C4
## Text font size
 - 10
## Corner radius size
 - 15px
## Animation duration
 - 250 milliseconds
## Hover interact darkening mult factor
 - 0.85
## Padding vertical size pixel
 - 10
## Padding horizontal size pixel
 - 10
## Text margin size pixel
 - 10

# Properties
## X position
 - Type:
    - Integer
## Y position
 - Type:
    - Integer
## Text
 - Type:
    - String or `null`
 - Default value:
    - `null`
## Image
 - Type:
    - [Image descriptor](../image.md) or `null`
 - Default value:
    - `null`
## Width
 - Type:
    - String
## Min height
 - Type:
    - String
 - Default:
    - "0px"
## On click callback
 - Type:
    - Function that takes in a click event

# Description
 - A button to be displayed on the [swipe-up menu](../swipe_up_menu/swipe_up_menu.md) at absolute position [x](#x-position) and [y](#y-position) relative to the [swipe-up menu's](../swipe_up_menu/swipe_up_menu.md) top left corner with no outline with [this bg fill color](#fill-color)
 - Is a rounded rectangle with corners radius of [this size](#corner-radius-size)
 - Internal padding is [this much vertically](#padding-vertical-size-pixel) and [this much horizontally](#padding-horizontal-size-pixel)
 - Has a drop shadow with [these specifications](#drop-shadow)
 - Displays [this text](#text) with [this color](#text-color) in the [bold font](../resources.md#bold-font) on the top of the button with [this font size](#text-font-size) horizontally centered in the button
    - [The text](#text) should be centered vertically in the area between the top of the button (padding included) and [image](#image) + [margin between the text and image](#text-margin-size-pixel)
 - Displays [this image](#image) below [the text](#text) anchored to the bottom of the button with at least margin of [this size](#text-margin-size-pixel) between them as a square of half the width of the button horizontally centered in the button
 - The button's width will be [the width property](#width)
 - The button's minimum height will be [the min height property](#min-height)
 - The button's maximum height will be the height necessary to fit all the text + [the padding](#padding-vertical-size-pixel) on the top and bottom
 - When hovered or interacted with:
    - Multiply the brightness value of all the colors (fill, text, and image) linearly over [this duration](#animation-duration) by [this factor](#hover-interact-darkening-mult-factor)
    - Restore their original brightness values when hovering or interaction is done over the [same duration](#animation-duration)
 - When interacted with:
    - Run [this callback function](#on-click-callback)