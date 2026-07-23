# Constants
## Menu screen height maximum percentage
 - 90%
## Menu screen height snap down or up percentage
 - 35%
## Move animation duration
 - 200 milliseconds
## Background color
 - #FFFFFF
## Pull handle color
 - #888888
## Pull handle width
 - 18% of the swipe-up menu width
## Pull handle height
 - 4px
## Top corner radius
 - 12px

# Description
 - A menu for displaying various components
 - Can be in a collapsed or expanded mode
    - Collapses and expands from the bottom of the screen
 - The top corners of the swipe-up menu have [this corner radius](#top-corner-radius)
 - Has a [pull handle](#pull-handle) located at the top of the swipe-up menu
 - Has a [gradient shadow](#top-shadow) located at the top of the swipe-up menu
 - If [Add Bathroom Mode](../add_bathroom_mode.md) is active:
    - The swipe-up menu not displayed at all (not even as a [pull handle](#pull-handle) at the base of the screen)
 - Has [this color](#background-color) as the background fill color
 - This spec doc only describes the shared components across all pages that will be displayed on the swipe-up menu

## Collapsed mode
 - Most of the swipe-up menu is hidden under the bottom of the screen
 - Only the [pull handle](#pull-handle) is displayed at the base of the screen

## Expanded mode
 - The swipe-up menu is fully expanded vertically
 - The swipe-up menu will not expand above [this percentage](#menu-screen-height-maximum-percentage) of the screen height
    - A portion of the background elements ([viewport2d](../viewport2d.md) and [Globe viewport](../GlobeViewport.md)) will be visible above the top of the menu
 - When the user drags vertically on a part of the swipe-up menu that is part of the swipe-up menu's background (not a component):
    - Drag the entire swipe-up menu in that direction as well
 - Fade in/out the [background darken overlay](../background_darken.md) to its maximum opacity as the swipe-up menu's top approaches [this percentage of the screen height](#menu-screen-height-maximum-percentage)
    - If the user clicks or taps on the [background darken overlay](../background_darken.md):
       - The swipe-up menu will transition into [collapsed mode](#collapsed-mode) over [this duration](#move-animation-duration) with quadratic easing

## Drag snapping behavior
 - When the swipe-up menu is dragged to under [this percentage of the screen height](#menu-screen-height-snap-down-or-up-percentage):
    - The swipe-up menu will transition into [collapsed mode](#collapsed-mode) over [this duration](#move-animation-duration) with quadratic easing
 - When the swipe-up menu is dragged above [this percentage of the screen height](#menu-screen-height-snap-down-or-up-percentage):
    - The swipe-up menu will transition into [expanded mode](#expanded-mode) over [this duration](#move-animation-duration) with quadratic easing

# Pull handle
 - Located at the top of the swipe up menu
 - Is a horizontally centered pill shape of [this color](#pull-handle-color) with some vertical margin of [this width](#pull-handle-width) and [this height](#pull-handle-height)
 - When the user drags on the pull handle vertically:
    - Move the swipe-up menu along with the user's pointer vertically
 - When the user clicks or taps on the pull handle:
    - Toggle between [collapsed mode](#collapsed-mode) and [expanded mode](#expanded-mode) over [this duration](#move-animation-duration) with quadratic easing
    - When entering into [expanded mode](#expanded-mode) through swiping up or tapping on the pull handle:
       - Open the swipe-up menu on the [main menu page](./main_menu.md)

# Top shadow
 - Is a gradient shadow that fades on the top edge
 - Layered under the swipe-up menu
 - Positioned a little farther down from the top of the swipe-up menu by about [this much](#top-corner-radius)
    - The shadow should end **after** the top corners have reached the edge of the screen