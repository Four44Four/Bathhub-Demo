# Constants
## Accent color
 - #BDBDDE
## Secondary color
 - #FFFFFF
## Button border width
 - 1px
## Button hover animation duration
 - 250 milliseconds
## Button hover interact darkening mult factor
 - 0.7

# Description
 - Horizontally center aligned
 - Username and password input field stacked vertically
    - Password input field has hidden input text by default with a togglable reveal icon
       - Displays [visible icon](../resources.md#visible-icon) on the right side when the text is hidden
       - Displays [nonvisible icon](../resources.md#nonvisible-icon) on the right side when the text is revealed
       - Both the icons will be of [this color](#accent-color)
    - Username input field has placeholder text "Username..."
    - Password input field has placeholder text "Password..."
 - Register and Login buttons on the same row under the 2 input fields
    - Both buttons have a border of [this width](#button-border-width)
    - Login button has [this fill color](#accent-color) and [this line/text color](#secondary-color)
    - Register button has [this fill color](#secondary-color) and [this line/text color](#accent-color)
    - When either of the buttons are hovered:
      - Multiply the brightness value of the button linearly over [this duration](#button-hover-animation-duration) by [this factor](#button-hover-interact-darkening-mult-factor)
      - Restore its original brightness values when hovering or interaction is done over the [same duration](#button-hover-animation-duration)
 - Registering should also sign in immediately