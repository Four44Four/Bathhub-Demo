# Constants
## Animation duration
 - 250 milliseconds
## Hover interact darkening mult factor
 - 0.7

# Properties
## X position
 - Type:
    - Integer
## Y position
 - Type:
    - Integer
## Corner radius
 - Type:
    - Integer
 - Default value:
    - 8
## Fill color
 - Type:
    - String
 - Default value:
    - #0E0F11
## Outline color
 - Type:
    - String
 - Default value:
    - #20232D
## Outline thickness
 - Type:
    - Integer
 - Default value:
    - 1
## Text color
 - Type:
    - String
 - Default value:
    - #AFB4C6
## Text weight
 - Type:
    - [TextWeight](../text_weight.md)
 - Default value:
    - TextWeight.REGULAR
## Padding
 - Type:
    - Integer
 - Default value:
    - 0
## Text
 - Type:
    - String or `null`
 - Default value:
    - `null`
## Width override
 - Type:
     - String or `null`
 - Default value:
     - `null`
## Image
 - Type:
    - [Image descriptor](../image.md) or `null`
 - Default value:
    - `null`
## Image left of text flag
 - Type:
    - Boolean
 - Default value:
    - `true`
## Image text gap
 - Type:
    - Integer
 - Default value:
    - 0
## Image size
 - Type:
    - Integer
 - Default value:
    - 24
## Circular flag
 - Type:
    - Boolean
 - Default value:
    - `false`
## Z index
 - Type:
    - Integer
 - Default value:
    - 0
## Hover interact behavior
 - Type:
    - "invert" or "darken"
 - Default value:
    - "invert"
## On click callback
 - Type:
    - Function that takes in a click event

# Description
 - A button to be displayed on the [viewport2d](../viewport2d.md) at absolute position [x](#x-position) and [y](#y-position) relative to the [viewport2d's](../viewport2d.md) top left corner with a CSS z index layering of [this](#z-index) with a [this bg fill color](#fill-color), and an outline of [this color](#outline-color) as [this many CSS pixels thick](#outline-thickness)
 - It displays [this text](#text) with [this color](#text-color) in the following fonts depending on the value of [the text weight](#text-weight):
    - TextWeight.REGULAR -> [regular font](../resources.md#regular-font)
    - TextWeight.BOLD -> [bold font](../resources.md#bold-font)
    - TextWeight.LIGHT -> [light font](../resources.md#light-font)
 - If [image left of text flag](#image-left-of-text-flag) is `true`:
    - It displays [this image](#image) left of the text with [this offset](#image-text-gap)
 - Else:
    - It displays [this image](#image) right of the text with [this offset](#image-text-gap)
 - The [image](#image) will be forced to be a square with each side being [this many CSS pixels](#image-size) long
    - Use CSS property `object-fit: contain` on the [image](#image)
 - This [amount of internal padding from the border](#padding) will be applied to the button's [image](#image) and [text](#text) contents
 - When hovered or interacted with:
    - If the [hover interaction behavior property](#hover-interact-behavior) is "invert":
       - Invert the brightness of all the colors (fill, text, outline, and images) linearly over [this duration](#animation-duration)
       - Uninvert them back when hovering or interaction is done over the [same duration](#animation-duration)
    - Elseif the [hover interaction behavior property](#hover-interact-behavior) is "darken":
       - Multiply the brightness value of all the colors (fill, text, outline, and images) linearly over [this duration](#animation-duration) by [this factor](#hover-interact-darkening-mult-factor)
       - Restore their original brightness values when hovering or interaction is done over the [same duration](#animation-duration)
 - Both [image](#image) and [text](#text) will be centered horizontally and vertically in the button
 - When interacted with:
    - Run [this callback function](#on-click-callback)
 - If [circular flag](#circular-flag) is `true`:
    - Render the entire button as a circle
    - Radius of the circle is determined by the maximum height of the [image](#image) or [text](#text) plus 2 * [the padding amount](#padding) plus 2 * [the outline thickness](#outline-thickness) all divided by 2
    - If images and text end up exceeding the bounds of the button:
       - Mask them against the bounds of the button
 - Else:
    - Render the entire button as a rectangle
    - Round the corners according to [this corner radius in CSS pixels](#corner-radius)
    - The width and height of the rectangle are determined by the bounds needed to contain the [image](#image) and [text](#text) plus 2 * [the padding amount](#padding) plus the @ * [the outline thickness](#outline-thickness)
       - Note: if the [width override property](#width-override) is not `null`: pass it's value directly to CSS and override the computed rectangular width