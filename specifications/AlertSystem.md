# Constants
## Band alert default persist duration
 - 3 seconds
## Positive color
 - #7BE3C7
## Negative color
 - #EC3968

# Description
## Minor alerts
 - Should trigger when an alert does not require the client to stop what they are doing and acknowledge it
 - Can be a negative or positive alert
    - Negative alerts will have [this color](#negative-color) as the background color
    - Positive alerts will have [this color](#positive-color) as the background color
### Positional alerts
 - Used when a minor alert is specific to a component
 - A positional alert indicator consists of a body with a rectangle with text detailing the error, and a triangular tail pointing towards the element that triggered the alert
 - It must point above or below the target element, using that element's bounding box to calculate a top or bottom edge and positioning its triangular tail to be some specific amount of pixels away from that edge
 - Positional alerts are cleared when the client taps or clicks on the interface without dragging
    - For example, they should be preserved when the client is dragging to pan or zoom on the Globe, but the moment the client taps on a location without dragging, the positional alerts will all disappear
### Band alerts:
 - Used when a minor alert is not tied to a specific component
 - Is a band at the top of the screen/phone interface
    - Has horizontally centered white text
 - When multiple band alerts are made/new band alerts are made before others are removed:
    - Place the most recent ones at the top
 - Band alerts will stay on screen for [this long](#band-alert-default-persist-duration)
    - There is an option to have the band alert remain on-screen until it is manually removed
   
## Major alerts
 - Should trigger the important alert indicator
    - Background is white #ffffff
    - Alerts are considered major if they warrant stopping the client from making further inputs until they acknowledge and dismiss the alert
    - Important alerts consists of a popup window with text detailing the alert and a large [Ok button](#major-alert-button) for dismissing the alert
       - Display the [background darken overlay](./background_darken.md) until the major alert is dismissed
    - Can be a negative or positive alert
       - Negative alerts will have [this color](#negative-color) as the [button background fill color](#fill-color-major-alert-button) for the accent colored [button](#major-alert-button)
       - Positive alerts will have [this color](#positive-color) as the [button background fill color](#fill-color-major-alert-button) for the accent colored [button](#major-alert-button)
 - Can have 1 or more [buttons](#major-alert-button) of the same size in a row
    - EXAMPLE: If there is 1 [button](#major-alert-button), it expands to the entire width, if there are 3 buttons, each button occupies a 3rd of the width
    - At least 1 button must have the [positive](#positive-color) or [negative](#negative-color) color depending on if it is a negative or positive alert
### Major alert button
#### Properties (major alert button)
##### Text (major alert button)
 - Type:
    - String
##### Fill color (major alert button)
 - Type:
    - String
##### On click callback (major alert button)
 - Type:
    - Function that takes in a click event
#### Description (major alert button)
 - Is a [viewport2d button](./components/viewport2d_button.md) with the following properties:
     - [Text](./components/viewport2d_button.md#text) is [the text property](#text-major-alert-button)
     - [Fill color](./components/viewport2d_button.md#fill-color) is the [fill color property](#fill-color-major-alert-button)
     - [Width override](./components/viewport2d_button.md#width-override) is "100%" to allow for the specified button behavior in [here](#major-alerts)
     - [On click callback](./components/viewport2d_button.md#on-click-callback) is the [on click callback property](#on-click-callback-major-alert-button)
     - [Hover interaction behavior](./components/viewport2d_button.md#hover-interact-behavior) is "darken"
     - [Anchor element](./components/viewport2d_button.md#anchor-element) is whatever element is appropriate to keep this [major alert button](#major-alert-button) at the correct position