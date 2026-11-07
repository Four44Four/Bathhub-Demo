# Constants
## Text color
 - #B5B5C4
## Secondary color
 - #FFFFFF
## Column separator line width
 - 1px
## Highest reputation color
 - #A0F0A0
## Lowest reputation color
 - #F0A0A0

# Description
 - Minimalistic 2 column account data view
 - Column separator line is [this wide](#column-separator-line-width) with [this color](#text-color)
 - Column components are specified in the following sections in top to bottom format
    - All components are left aligned in that column unless otherwise specified
## Left column
 - Center aligned square profile picture
    - Default to [this icon](../resources.md#account-profile-picture) for now
 - Account username
 - If this account belongs to the currently viewing user's account:
    - Display a [button](../components/viewport2d_button.md) horizontally centered in the column that has:
      - Is [rectangular](../components/viewport2d_button.md#circular-flag)
      - [Hover interact behavior](../components/viewport2d_button.md#hover-interact-behavior) is "darken"
      - [Text descriptor](../components/viewport2d_button.md#text) is the following:
         - [Content](../text.md#content) is "Change image"
         - [Color](../text.md#color) is [this color](#secondary-color)
         - [Weight](../text.md#weight) is [TextWeight.BOLD](../text_weight.md)
      - [Fill color](../components/viewport2d_button.md#fill-color) is [this color](#text-color)
      - [Outline thickness](../components/viewport2d_button.md#outline-thickness) is 0 (no outline)
      - [Dropshadow descriptor](../components/viewport2d_button.md#drop-shadow) is [this drop shadow descriptor](./dropshadow_descriptor.md)
      - [Click callback](../components/viewport2d_button.md#on-click-callback) is the following:
         - Triggers a file selection restricted to image files
         - When a file is selected:
            - The file gets sent to the image uploading/profile picture setting endpoint
            - If the image is accepted:
               - The current account's profile picture gets set to that image, and is visually updated accordingly
         - The image uploading endpoint first checks if the currently viewing user is even logged in (prevent script based attempted image uploading)
            - The image uploading endpoint then checks if the uploaded image is an image MIME type, then if it has dimensions under 512x512, then if its file size is under 1 MB
## Right column
 - Reputation score
    - Text above bar "Reputation"
    - Horizontal bar for showing range from -20 to +20
       - Entire bar will be colored according to how close it is to -20 or +20
       - -20 will be colored [this color](#lowest-reputation-color)
       - +20 will be colored [this color](#highest-reputation-color)
       - In between those bounds will be linearly interpolated between those 2 colors
       - Any reputation above or below those bounds will be clamped to the nearest bound's color
    - Show the exact number to the right of the bar