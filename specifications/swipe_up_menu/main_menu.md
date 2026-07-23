# Constants
## Icon color
 - #E4E4FF

# Description
 - Is page to be displayed on the [swipe-up menu](./swipe_up_menu.md)
 - This is the default page to be displayed when the swipe-up menu is expanded, unless explicitly specified otherwise
 - Below specified [components](#components) will be displayed in a grid of 4 buttons wide

# Components
 - Each component is specified from left to right, top to bottom order
 - Each of the buttons are to be arranged in a 4 column wide grid with:
    - An 8px gap between each one (vertically and horizontally)
    - 10px margin on both sides
    - 8px margin on the top
    - 12px margin on the bottom
    - Each button will occupy an equal width given their provided widths
    - Each button will have the same minimum height as the tallest button in their row
## Edit settings button
 - Is a [main menu button](../components/swipe_up_main_menu_button.md)
    - Is the first item in the menu (pass its [x position](../components/swipe_up_main_menu_button.md#x-position) and [y position](../components/swipe_up_main_menu_button.md#y-position) as necessary to achieve this)
    - [Text](../components/swipe_up_main_menu_button.md#text) is "Edit user settings"
    - [Image](../components/swipe_up_main_menu_button.md#image) is [the gear icon](../resources.md#gear-icon) as [this color](#icon-color)
    - [Width](../components/swipe_up_main_menu_button.md#width) is "100%"
    - [Min height](../components/swipe_up_main_menu_button.md#min-height) is "100%"
    - [Click callback](../components/swipe_up_main_menu_button.md#on-click-callback) is the following:
       - Open the [user settings page](../user_settings.md)

## Add bathroom button
 - Is a [main menu button](../components/swipe_up_main_menu_button.md)
    - Is the second item in the menu (pass its [x position](../components/swipe_up_main_menu_button.md#x-position) and [y position](../components/swipe_up_main_menu_button.md#y-position) as necessary to achieve this)
    - [Text](../components/swipe_up_main_menu_button.md#text) is "Add bathroom"
    - [Image](../components/swipe_up_main_menu_button.md#image) is [the plus icon](../resources.md#plus-symbol-icon) as [this color](#icon-color)
    - [Width](../components/swipe_up_main_menu_button.md#width) is "100%"
    - [Min height](../components/swipe_up_main_menu_button.md#min-height) is "100%"
    - [Click callback](../components/swipe_up_main_menu_button.md#on-click-callback) is the following:
       - Enter into [Add Bathroom Mode](../add_bathroom_mode.md)