# Constants
## Menu screen height maximum percentage
 - 90%
## Menu screen height snap down or up percentage
 - 35%
# Description
 - Has a pull handle at the base of the Globe viewport when not in [Add Bathroom Mode](./add_bathroom_mode.md)
    - When dragged up:
       - The entire menu will translate up at the same rate as the cursor or finger dragging it up
    - When clicked or tapped:
       - The entire menu will instantly expand to full height
 - When menu is not collapsed:
    - The menu has a maximum top edge Y position that is [this percentage](##menu-screen-height-maximum-percentage) of the screen height, which leaves a portion of the background elements (viewport2d and Globe viewport) visible above the top of the menu
    - All viewport2d and Globe viewport elements are hidden behind a darkened overlay that progressively fades into maximum opacity as the menu approaches maximum translation up
       - Those elements behind the overlay cannot be interacted with
       - Any click or tap on the elements behind the overlay that are visible behind the darkened overlay above the top of the menu will cause the menu to collapse back down
    - When the user drags vertically on a part of the menu that is part of the background or the pull handle of the menu:
       - Drag the entire menu in that direction as well
    - When the user clicks or taps on the pull handle:
       - Collapse the menu instantly
 - When menu is dragged to within [this percentage of the screen height](##menu-screen-height-snap-down-or-up-percentage):
    - The menu will collapse back
    - If the menu was collapsed and the menu was dragged up but not above that area and the user lets go:
       - Collapse the menu back down
    - If the menu was not collapsed the menu was dragged down to within that area:
       - Collapse the menu
 - The menu will have:
    - A button for opening settings
    - A button for adding a new bathroom
       - Has a plus symbol
       - Has text label "Add bathroom"