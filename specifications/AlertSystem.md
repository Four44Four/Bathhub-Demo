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
    - Important alerts consists of a popup window with text detailing the alert and a large Ok button for dismissing the alert
       - Display the [background darken overlay](./background_darken.md) until the major alert is dismissed
    - Can be a negative or positive alert
       - Negative alerts will have [this color](#negative-color) as the button background fill color for the accent colored button
       - Positive alerts will have [this color](#positive-color) as the button background fill color for the accent colored button
    - Buttons will have some text displayed in the middle (centered horizontally and vertically)
    - Can have 1 or more buttons of the same size in a row
       - EXAMPLE: If there is 1 button, it expands to the entire width, if there are 3 buttons, each button occupies a 3rd of the width
       - At least 1 button must have the [positive](#positive-color) or [negative](#negative-color) color depending on if it is a negative or positive aler
       - Each button has a callback to run when the button is interacted with