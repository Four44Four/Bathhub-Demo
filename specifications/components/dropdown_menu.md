# Constants
## Animation duration
 - 250 milliseconds
## Hover interact darkening mult factor
 - 0.7
## Arrow icon pixel size
 - 24
## Padding pixel size
 - 10

# Properties
# X position
 - Type:
    - Integer
## Y position
 - Type:
    - Integer
## Initial display content
 - Type:
    - [Text discriptor](../text.md) or HTML element
## Arrow icon color
 - Type:
    - String
 - Default value:
    - #B5B5C4
## Fill color
 - Type:
    - String
 - Default value:
    - #ffffff
## Corner radius
 - Type:
    - Integer
 - Default value:
    - 8
## Outline color
 - Type:
    - String
 - Default value:
    - #E4E4FF
## Outline thickness
 - Type:
    - Integer
 - Default value:
    - 1
## Width override
 - Type:
     - String or `null`
 - Default value:
     - `null`
## Drop shadow
 - Type:
    - [Dropshadow descriptor] or `null`
 - Default value:
    - `null`
## Hover interact behavior
 - Type:
    - "invert" or "darken"
 - Default value:
    - "darken"
## Anchor element
 - Type:
    - HTML element or `null`
 - Default value:
    - `null`
## Subcomponents list
 - Type:
    - Array of 2D subcomponents/elements to render or `null`
 - Default value:
    - `null`

# Description
 - A rectangular dropdown menu that can render subcomponents when [expanded](#expanded-mode)
 - Consists of an [upper, one line tall toggle button section](#toggle-button) and a [subcomponents panel](#subcomponents-panel)
 - Both [the toggle button](#toggle-button) and [subcomponents panel](#subcomponents-panel) should visually form a continuous rectangle silhouette with the following properties:
    - Has [this corner radius](#corner-radius)
    - Has [this background fill color](#fill-color)
    - Has an outline of [this thickness](#outline-thickness) of [this color](#outline-color)
    - If [width override property](#width-override) is `null`:
       - The width of the rectangular dropdown ([expanded](#expanded-mode) or [hidden](#hidden-mode)) will be as wide as the [toggle button label element](#toggle-button-label-element) + [arrow icon size](#arrow-icon-pixel-size) needs it to be (plus any addition [padding](#padding-pixel-size))
    - Else:
       - The CSS width of the rectangular dropdown is set to the [width override property](#width-override)
       - [The toggle button label element](#toggle-button-label-element) will be clipped if it overlaps with the [arrow icon's bounds + padding](#arrow-icon-pixel-size) or past the edges of the rectangular dropdown menu
 - If [the anchor element property](#anchor-element) is `null`:
    - This dropdown menu is displayed on the [viewport2d](../viewport2d.md) at absolute position [x](#x-position) and [y](#y-position) relative to the [viewport2d's](../viewport2d.md) top left corner
    - This dropdown menu is z layered above the [GlobeViewport](../GlobeViewport.md) but below the [swipe-up menu](../swipe_up_menu/swipe_up_menu.md)
 - Else:
    - This dropdown menu is displayed relative to [the anchor element](#anchor-element)'s top left corner at at absolute position [x](#x-position) and [y](#y-position)
    - This dropdown menu will also be z layered above [the anchor element](#anchor-element)
 - If [drop shadow property](#drop-shadow) is **not** `null`:
    - Display a dropshadow behind the dropdown menu (both the [toggle button](#toggle-button) and [subcomponents panel](#subcomponents-panel)) with [the specifications from the drop shadow property](#drop-shadow)
 - Dropdown menu starts in [the hidden mode](#hidden-mode)

# Hidden mode
 - There is only the [toggle button](#toggle-button)
    - The [subcomponents panel](#subcomponents-panel) is hidden and neither visible nor interacble
 - [Arrow icon](../resources.md#arrow-icon) points to the right
 - When transitioning from [expanded mode](#expanded-mode) to [hidden mode](#hidden-mode):
    - Rotate the [arrow icon](../resources.md#arrow-icon) 90 degrees counter-clockwise so thatt he arrow points to the right
    - Shrink the height of the rectangular panel containing the [subcomponets](#subcomponents-list) until its height becomes 0

# Expanded mode
 - There is both the [toggle button](#toggle-button) on top, and [the subcomponents panel](#subcomponents-panel) on the bottom
 - [Arrow icon](../resources.md#arrow-icon) points downwards
 - When transitioning from [hidden mode](#hidden-mode) to [expanded mode](#expanded-mode):
    - Rotate the [arrow icon](../resources.md#arrow-icon) 90 degrees clockwise so that the arrow points downwards
    - Expand the height of the rectangular panel containing the [subcomponents](#subcomponents-list) until its height fits all the [subcomponents' elements](#subcomponents-list) including dropdown menu [padding](#padding-pixel-size)

# Toggle button label element
 - If [the initial display content](#initial-display-content) is a [text descriptor](../text.md):
    - Display [text](../text.md) specified by [the initial display content](#initial-display-content)
 - Else:
    - Display the HTML element specified by [the initial display content](#initial-display-content)

# Toggle button
 - Has the following components with [this size](#padding-pixel-size) of internal button padding:
    - The [toggle button label element](#toggle-button-label-element) left aligned
    - [Arrow icon](../resources.md#arrow-icon) right aligned that is a square with each side being [this many pixels long](#arrow-icon-pixel-size) of [this color](#arrow-icon-color)
 - When hovered or interacted with:
    - If the [hover interaction behavior property](#hover-interact-behavior) is "invert":
       - Invert the brightness of all the colors (fill, text, outline, and images) linearly over [this duration](#animation-duration)
       - Uninvert them back when hovering or interaction is done over the [same duration](#animation-duration)
    - Elseif the [hover interaction behavior property](#hover-interact-behavior) is "darken":
       - Multiply the brightness value of all the colors (fill, text, outline, and images) linearly over [this duration](#animation-duration) by [this factor](#hover-interact-darkening-mult-factor)
       - Restore their original brightness values when hovering or interaction is done over the [same duration](#animation-duration)
 - When interacted with:
    - Toggle the state of the dropdown menu between [expanded mode](#expanded-mode) and [hidden mode](#hidden-mode) and play their toggle transition animations smoothly over [this duration](#animation-duration) with quadratic easing

# Subcomponents panel
 - Has [this size](#padding-pixel-size) of internal panel padding
 - Contains the elements in [the subcomponents list](#subcomponents-list) with the first item in that list rendered at the top of the panel, second item second from the top, and so forth
 - Elements on the panel should be fully interactable, render layered on top of the panel, and retain their original hover and interaction behaviors
 - Elements on the penel will be clipped by the bounds of the panel, so that during the retraction animation of the panel, the elements will not be rendered outside of the panel