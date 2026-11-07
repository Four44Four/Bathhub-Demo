# Constants
## Text color
 - #B5B5C4
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