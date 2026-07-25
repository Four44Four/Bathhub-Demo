# Constants
## Non verified color
 - #DCA36E
## Verified color
 - #6EDCB9
## Components gap pixel size
 - 10px
## Text color
 - #B5B5C4
## Button fill color
 - #ffffff
## Star rating 5 fill color
 - #F0E1A0
## Star rating 4 fill color
 - #F0CFA0
## Star rating 3 fill color
 - #F0C2A0
## Star rating 2 fill color
 - #F0AFA0
## Star rating 1 fill color
 - #F0A0A0
## Star rating unfill color
 - #E4E4FF
## Ratings panel buffer height
 - 10px
## Loading spinner accent color
 - #B5B5C4
## Loading spinner base color
 - "rgba(181, 181, 196, 0.35)"
## Loading spinner radius
 - 20px
## Button loading spinner radius
 - 9px
## Ratings panel average and stars gap pixel size
 - 5px
## Bathroom information panel corner radius
 - 8px
## Bathroom information panel hover animation duration
 - 250 milliseconds
## Bathroom information panel hover interact darkening mult factor
 - 0.7
## Bathroom information panel background fill color
 - #E4E4FF
## Bathroom information panel icon buffer pixel size
 - 5px
## Bathroom information panel existence vote bar width
 - 50% of the bathroom information panel width
## Bathroom existence vote button text color brightness mult factor
 - 0.5
## Bathroom information panel existence vote bar text color brightness mult factor
 - 0.75
## Bathroom information panel arrow icon size
 - 10px
## Bathroom information panel arrow row height
 - 15px

# Description
 - Is page to be displayed on the [swipe-up menu](./swipe_up_menu.md)
 - When this page is loaded:
    - Don't display [page components](#components) yet
    - The frontend passes the bathroom id of the [bathroom map marker](../bathroom_db_reading.md#bathroom-marker) that opened this [swipe-up menu](./swipe_up_menu.md) page as <bathroom-id>
    - Start fetching the full primary data record of the <bathroom-id> from the [backend DB](../bathroom_db.md)
    - Until <bathroom-id>'s data is fetched, display a [loading spinner](../components/loading_spinner.md) with the following properties:
       - Set [x position](../components/loading_spinner.md#x-position) and [y position](../components/loading_spinner.md#y-position) so that the loading spinner is centered horizontally and vertically in the fully expanded dimensions of the [swipe-up menu](./swipe_up_menu.md)
       - [Accent color](../components/loading_spinner.md#accent-color) is [this color](#loading-spinner-accent-color)
       - [Base color](../components/loading_spinner.md#base-color) is [this color](#loading-spinner-base-color)
       - [Radius](../components/loading_spinner.md#radius) is [this radius](#loading-spinner-radius)
    - When <bathroom-id>'s data is fetched:
       - Remove the [loading spinner](../components/loading_spinner.md)
       - Display the [page component](#components) as normal
    - When <bathroom-id>'s data fetching times out:
       - Display a negative [major alert](../AlertSystem.md#major-alerts) with text "Timed out looking up bathroom" and a single button with text "Ok" which dismisses the [major alert](../AlertSystem.md#major-alerts) when interacted with
    - When <bathroom-id>'s data fetching encounters an error:
       - Display a negative [major alert](../AlertSystem.md#major-alerts) with text "Error occurred while looking up bathroom" and a single button with text "Ok" which dismisses the [major alert](../AlertSystem.md#major-alerts) when interacted with

# Components
 - All elements have a gap of [this much](#components-gap-pixel-size) between each other
## Bathroom information panel
 - Rectangular panel on the [left side of the swipe-up menu](./swipe_up_menu.md) with corner radius of [this size](#bathroom-information-panel-corner-radius) with [this background fill color](#bathroom-information-panel-background-fill-color)
 - Rectangular panel's height should be enough to fit its contents (taller if expanded) and the internal padding of the rectangular panel
 - If <bathroom-id>'s [`exists_vote_count` column is greater than its `not_exists_vote_count` column](../bathroom_db.md#table-schema):
    - Display the [bathroom icon](../resources.md#bathroom-icon) in the horizontal center of the rectangle anchored to the top end that is expanded to fill the button's width while still maintaining aspect ratio
    - [Bathroom icon](../resources.md#bathroom-icon) has [this color](#verified-color)
 - Else:
    - Display the [non-verified bathroom icon](../resources.md#bathroom-icon-non-verified) in the horizontal center of the rectangle anchored to the top end that is expanded to fill the button's width while still maintaining aspect ratio
    - [Non-verified bathroom icon](../resources.md#bathroom-icon-non-verified) has [this color](#non-verified-color)
 - Has a vertical margin buffer under the [bathroom icon](../resources.md#bathroom-icon) of [this size](#bathroom-information-panel-icon-buffer-pixel-size)
 - At the bottom of the rectangular panel is a row of [this height](#bathroom-information-panel-arrow-row-height) which ignores the padding of the rectangular panel with a horizontally centered [arrow icon](../resources.md#arrow-icon) with the following properties:
    - Is a square of [this size](#bathroom-information-panel-arrow-icon-size)
    - Has [this color](#text-color)
    - Is vertically centered in its row
    - When the [bathroom information panel](#bathroom-information-panel) is in the collapsed state (initital state):
       - The [arrow icon](../resources.md#arrow-icon) is rotated 90 degrees clockwise so that it is pointing down
 - Has a dropshadow behind the rectangular panel of [this drop shadow descriptor](./dropshadow_descriptor.md)
 - When the rectangular panel is hovered or interacted with (but not when hovering/interacting with the buttons displayed on it):
    - Multiply the brightness value of the [bathroom icon](../resources.md#bathroom-icon) linearly over [this duration](#bathroom-information-panel-hover-animation-duration) by [this factor](#bathroom-information-panel-hover-interact-darkening-mult-factor)
    - Restore its original brightness values when hovering or interaction is done over the [same duration](#bathroom-information-panel-hover-animation-duration)
 - Rectangular panel starts in collapsed mode
 - Transitions between collapsed and expanded mode will fade the expanded mode elements' opacity in/out linearly over [this duration](#bathroom-information-panel-hover-animation-duration)
 - When the rectangular panel is interacted with:
    - Rotate the [arrow icon](../resources.md#arrow-icon) at the bottom of the [bathroom information panel](#bathroom-information-panel) 180 degrees counter-clockwise so that it ends up pointing up over [this duration](#bathroom-information-panel-hover-animation-duration) with quadratic easing
       - The [arrow icon](../resources.md#arrow-icon) will remain at the bottom of the rectangular panel with its dedicated row
    - Expand the rectangular panel's height over [this duration] with quadratic easing to reveal the following elements, which are all clipped by the bounds of the rectangular panel, position starts from under the buffer under the bathroom icon where the "..." text used to be:
       - A horizontally centered horizontal bar that is [this wide](#bathroom-information-panel-existence-vote-bar-width) representing [the amount of votes for or against the bathroom's existence](../bathroom_db.md#table-schema)
          - The left side of the bar is [this color](#verified-color) and length is determined by the [`exists_vote_count` column's value from the bathroom DB](../bathroom_db.md#table-schema)
          - The right side of the bar is [this color](#non-verified-color) and length is determined by the [`not_exists_vote_count` column's value from the bathroom DB](../bathroom_db.md#table-schema)
          - Outside of the bar on the left side of the bar is a text with the following [text descriptor](../text.md) properties:
             - [Content](../text.md#content) is the [`exists_vote_count` column's value from the bathroom DB](../bathroom_db.md#table-schema)
             - [Color](../text.md#color) is [this color](#verified-color) with its brightness value multipled by [this factor](#bathroom-information-panel-existence-vote-bar-text-color-brightness-mult-factor)
          - Outside of the bar on the right side of the bar is a text with the following [text descriptor](../text.md) properties:
             - [Content](../text.md#content) is the [`not_exists_vote_count` column's value from the bathroom DB](../bathroom_db.md#table-schema)
             - [Color](../text.md#color) is [this color](#non-verified-color) with its brightness value multipled by [this factor](#bathroom-information-panel-existence-vote-bar-text-color-brightness-mult-factor)
       - 2 [buttons](../components/viewport2d_button.md) in the same row:
          - Left [button](../components/viewport2d_button.md) has the following properties:
             - Set [x position](../components/viewport2d_button.md#x-position) and [y position](../components/viewport2d_button.md#y-position) so that it is in the correct position
             - Is [rectangular](../components/viewport2d_button.md#circular-flag)
             - [Hover interact behavior](../components/viewport2d_button.md#hover-interact-behavior) is "darken"
             - [Text descriptor](../components/viewport2d_button.md#text) is the following:
                - [Content](../text.md#content) is "Real?"
                - [Color](../text.md#color) is [this color](#verified-color) with its brightness value multipled by [this factor](#bathroom-existence-vote-button-text-color-brightness-mult-factor)
                - [Weight](../text.md#weight) is [TextWeight.BOLD](../text_weight.md)
             - [Fill color](../components/viewport2d_button.md#fill-color) is [this color](#verified-color)
             - [Outline thickness](../components/viewport2d_button.md#outline-thickness) is 0 (no outline)
             - [Dropshadow descriptor](../components/viewport2d_button.md#drop-shadow) is [this drop shadow descriptor](./dropshadow_descriptor.md)
             - [Click callback](../components/viewport2d_button.md#on-click-callback) is the following:
                - Increment the [`exists_vote_count` column of the bathroom DB](../bathroom_db.md#table-schema)
                   - This is rate limited on the serverside with [this rate limit](../server_rate_limits.md#updating-bathrooms)
                - Until the update to successfully written to the serverside DB:
                   - Replace the text on the real vote [button](../components/viewport2d_button.md) with a horizontally centered [loading spinner](../components/loading_spinner.md) with the following properties:
                      - [X position](../components/loading_spinner.md#x-position) and [y position](../components/loading_spinner.md#y-position) are set so that it will be in the center of the real vote [button](../components/viewport2d_button.md)
                      - [Accent color](../components/loading_spinner.md#accent-color) is [this color](#loading-spinner-accent-color)
                      - [Base color](../components/loading_spinner.md#base-color) is [this color](#loading-spinner-base-color)
                      - [Radius](../components/loading_spinner.md#radius) is [this size](#button-loading-spinner-radius)
                - Once the update is successfully written to the serverside DB:
                   - Immediately update the bathroom information panel to reflect the [`exists_vote_count` and `not_exists_vote_count` columns from the bathroom DB](../bathroom_db.md#table-schema)
                   - Update its corresponding [bathroom map marker](../bathroom_db_reading.md#bathroom-marker) immediately on the client's map
          - Right [button](../components/viewport2d_button.md) has the following properties:
             - Set [x position](../components/viewport2d_button.md#x-position) and [y position](../components/viewport2d_button.md#y-position) so that it is in the correct position
             - Is [rectangular](../components/viewport2d_button.md#circular-flag)
             - [Hover interact behavior](../components/viewport2d_button.md#hover-interact-behavior) is "darken"
             - [Text descriptor](../components/viewport2d_button.md#text) is the following:
                - [Content](../text.md#content) is "Gone?"
                - [Color](../text.md#color) is [this color](#non-verified-color) with its brightness value multipled by [this factor](#bathroom-existence-vote-button-text-color-brightness-mult-factor)
                - [Weight](../text.md#weight) is [TextWeight.BOLD](../text_weight.md)
             - [Fill color](../components/viewport2d_button.md#fill-color) is [this color](#non-verified-color)
             - [Outline thickness](../components/viewport2d_button.md#outline-thickness) is 0 (no outline)
             - [Dropshadow descriptor](../components/viewport2d_button.md#drop-shadow) is [this drop shadow descriptor](./dropshadow_descriptor.md)
             - [Click callback](../components/viewport2d_button.md#on-click-callback) is the following:
                - Increment the [`not_exists_vote_count` column of the bathroom DB](../bathroom_db.md#table-schema)
                   - This is rate limited on the serverside with [this rate limit](../server_rate_limits.md#updating-bathrooms)
                - Until the update to successfully written to the serverside DB:
                   - Replace the text on the real vote [button](../components/viewport2d_button.md) with a horizontally centered [loading spinner](../components/loading_spinner.md) with the following properties:
                      - [X position](../components/loading_spinner.md#x-position) and [y position](../components/loading_spinner.md#y-position) are set so that it will be in the center of the real vote [button](../components/viewport2d_button.md)
                      - [Accent color](../components/loading_spinner.md#accent-color) is [this color](#loading-spinner-accent-color)
                      - [Base color](../components/loading_spinner.md#base-color) is [this color](#loading-spinner-base-color)
                      - [Radius](../components/loading_spinner.md#radius) is [this size](#button-loading-spinner-radius)
                - Once the update is successfully written to the serverside DB:
                   - Immediately update the bathroom information panel to reflect the [`exists_vote_count` and `not_exists_vote_count` columns from the bathroom DB](../bathroom_db.md#table-schema)
                   - Update its corresponding [bathroom map marker](../bathroom_db_reading.md#bathroom-marker) immediately on the client's map
    - When the rectangular panel is interacted with again while expanded:
       - Collapse the rectangular panel over [this duration] with quadratic easing to hide the expanded elements
       - Restore the [bathroom information panel's](#bathroom-information-panel) [arrow icon](../resources.md#arrow-icon) to its original rotation by rotating clockwise over [this duration](#bathroom-information-panel-hover-animation-duration) with quadratic easing

## Ratings panel
 - Store the sum of [`rating_1_count`, `rating_2_count`, `rating_3_count`, `rating_4_count`, or `rating_5_count` columns of this bathroom](../bathroom_db.md#table-schema) in <total-rating-count> 
 - Is a [dropdown menu](../components/dropdown_menu.md) with the following properties:
    - [Anchor element](../components/dropdown_menu.md#anchor-element) is the [swipe-up menu](./swipe_up_menu.md)
    - Located on the top middle of the swipe-up menu (set the [x position](../components/dropdown_menu.md#x-position) and [y position](../components/dropdown_menu.md#y-position) accordingly)
    - [Width override](../components/dropdown_menu.md#width-override) is to be set appropriately to ensure that the width of the dropdown menu takes up the right half of the swipe-up menu, minus any padding/margins on the sides
    - [Initial display content](../components/dropdown_menu.md#initial-display-content) is a HTML element that consists of the following components:
       - A text on the left side from a [text descriptor](../text.md) with the following properties:
          - [Content](../text.md#content) as the String equivalent of the average of [columns `rating_1_count`, `rating_2_count`, `rating_3_count`, `rating_4_count`, and `rating_5_count` of this bathroom](../bathroom_db.md#table-schema) as a decimal number rounded to 1 place
             - Use formula (`rating_1_count` * 1 + `rating_2_count` * 2 + `rating_3_count` * 3 + `rating_4_count` * 4 + `rating_5_count` * 5) / (`rating_1_count` + `rating_2_count` + `rating_3_count` + `rating_4_count` + `rating_5_count`)
          - [Color](../text.md#color) is [this color](#text-color)
          - [Weight](../text.md#weight) is [TextWeight.BOLD](../text_weight.md)
       - Some horizontal padding of [this much size](#ratings-panel-average-and-stars-gap-pixel-size) in the middle
       - A [star rating graphic](#star-rating-graphic) on the right side with the following properties:
          - [Rating](#rating-star-rating-graphic) as the the average number calculated for the left side text
    - [Dropshadow descriptor](../components/dropdown_menu.md#drop-shadow) is [this drop shadow descriptor](./dropshadow_descriptor.md)
    - [Subcomponents list](../components/dropdown_menu.md#subcomponents-list) consists of the following elements (top to bottom order):
       - Display 5 [rating bars](#rating-bar) stacked vertically, all with:
          - [Property `rating_total_count`](#rating_total_count-rating-bar) as <total-rating-count>
          - [Property `rating_count_space`](#rating_count_space-rating-bar) as the width of the visually widest out of [`rating_1_count`, `rating_2_count`, `rating_3_count`, `rating_4_count`, or `rating_5_count` columns of this bathroom](../bathroom_db.md#table-schema) plus some padding (below [rating bars](#rating-bar) are in top-bottom order):
       - The first [rating bar](#rating-bar) has unique properties:
          - [Property `rating_count`](#rating_count-rating-bar) as [`rating_5_count` column](../bathroom_db.md#table-schema) of this bathroom
          - [Property `left_color`](#left_color-rating-bar) as [star rating 5 fill color](#star-rating-5-fill-color)
       - The second [rating bar](#rating-bar) has unique properties:
          - [Property `rating_count`](#rating_count-rating-bar) as [`rating_4_count` column](../bathroom_db.md#table-schema) of this bathroom
          - [Property `left_color`](#left_color-rating-bar) as [star rating 4 fill color](#star-rating-4-fill-color)
       - The third [rating bar](#rating-bar) has unique properties:
          - [Property `rating_count`](#rating_count-rating-bar) as [`rating_3_count` column](../bathroom_db.md#table-schema) of this bathroom
          - [Property `left_color`](#left_color-rating-bar) as [star rating 3 fill color](#star-rating-3-fill-color)
       - The fourth [rating bar](#rating-bar) has unique properties:
          - [Property `rating_count`](#rating_count-rating-bar) as [`rating_2_count` column](../bathroom_db.md#table-schema) of this bathroom
          - [Property `left_color`](#left_color-rating-bar) as [star rating 2 fill color](#star-rating-2-fill-color)
       - The fifth [rating bar](#rating-bar) has unique properties:
          - [Property `rating_count`](#rating_count-rating-bar) as [`rating_1_count` column](../bathroom_db.md#table-schema) of this bathroom
          - [Property `left_color`](#left_color-rating-bar) as [star rating 1 fill color](#star-rating-1-fill-color)
       - A buffer/margin space of [this height](#ratings-panel-buffer-height)
       - A [star rating graphic](#star-rating-graphic) with the [property `rating`](#rating-star-rating-graphic) as 0.0 and the [property `interactive`](#interactive-star-rating-graphic) as `true`
          - When the [swipe-up menu](./swipe_up_menu.md) is [collapsed](./swipe_up_menu.md#collapsed-mode):
             - Clear the value stored in the interactive [star rating graphic](#star-rating-graphic)
       - A [button](../components/viewport2d_button.md) that has:
          - [Text](../components/viewport2d_button.md#text) is a [text discriptor](../text.md) with the following properties:
             - [Content](../text.md#content) is "Post"
             - [Color](../text.md#color) is [this color](#text-color)
             - [Weight](../text.md#weight) is [TextWeight.BOLD](../text_weight.md)
          - [Fill color](../components/viewport2d_button.md#fill-color) of [this color](#button-fill-color)
          - [Anchor element](../components/viewport2d_button.md#anchor-element) is the [swipe-up menu](./swipe_up_menu.md)
          - [Drop shadow](../components/viewport2d_button.md#drop-shadow) is [this drop shadow descriptor](./dropshadow_descriptor.md)
          - [Outline thickness](../components/viewport2d_button.md#outline-thickness) is 0 (no outline)
          - [Click callback](../components/viewport2d_button.md#on-click-callback) is the following:
             - If the interactive [star rating graphic](#star-rating-graphic) has a cleared/no value:
                - Do nothing
             - Else:
                - Depending on the filled star value of the [interactive](#interactive-star-rating-graphic) [star rating graphic](#star-rating-graphic):
                   - Update **one** of the [bathroom_data_primary `rating_1_count`, `rating_2_count`, `rating_3_count`, `rating_4_count`, or `rating_5_count` columns for this bathroom](../bathroom_db.md#table-schema)
                   - Ensure that the update is written to the remote [bathroom DB](../bathroom_db.md)
                      - This is rate limited on the serverside with [this rate limit](../server_rate_limits.md#updating-bathrooms)
                - Replace the text of the Post [button](../components/viewport2d_button.md) with a [loading spinner](../components/loading_spinner.md) in the center of the [button](#save-user-settings-button) until the rating is successfully written to the remote [bathroom DB](../bathroom_db.md)
                - [Loading spinner](../components/loading_spinner.md) has the following properties:
                   - [X position](../components/loading_spinner.md#x-position) and [y position](../components/loading_spinner.md#y-position) are set so that it will be in the center of the Post [button](../components/viewport2d_button.md)
                   - [Accent color](../components/loading_spinner.md#accent-color) is [this color](#loading-spinner-accent-color)
                   - [Base color](../components/loading_spinner.md#base-color) is [this color](#loading-spinner-base-color)
                   - [Radius](../components/loading_spinner.md#radius) is [this size](#button-loading-spinner-radius)
                - Update the average star rating number to the newly calculated average
                - Update the [star rating graphic](#star-rating-graphic) representing the average star rating number
                - Clear the rating on the [interactive star rating graphic](#star-rating-graphic)

# Star rating graphic
## Properties (star rating graphic)
### `rating` (star rating graphic)
 - Type:
    - Double
### `interactive` (star rating graphic)
 - Type:
    - Boolean
 - Default:
    - `false`
## Description (star rating graphic)
 - 5 stars in a row horizontally
    - Use [this icon](../resources.md#star-icon) as the star icon
 - Fill up the stars from the left to right depending on the value of the [`rating` parameter](#rating-star-rating-graphic)
    - The filled color of the stars on the left side is [this color](#star-rating-5-fill-color)
    - The unfilled color of the stars on the right side is [this color](#star-rating-unfill-color)
    - EXAMPLE:
       - If the [`rating` parameter](#rating-star-rating-graphic) is 3.5:
          - The 3 stars on the left would be filled completely
          - The 4th star would be halfway filled and halfway unfilled
          - The 5th star or rightmost star will be unfilled completely
    - Partially filled stars have a rectangular fill that is clipped by the star filling which grows from left to right
 - If [`interactive` parameter](#interactive-star-rating-graphic) is `true`:
    - When user clicks or taps on a star:
       - Changes the filled stars from the left all the way to (and including) the star that was clicked/tapped on
 - The current filled value of this star rating graphic can be retrieved as a Double

# Rating bar
## Properties (rating bar)
### `rating_count` (rating bar)
 - Type:
    - Integer
### `rating_count_space` (rating bar)
 - Type:
    - Integer
### `rating_total_count` (rating bar)
 - Type:
    - Integer
### `left_color` (rating bar)
 - Type:
    - String
## Description (rating bar)
 - [`rating_count` parameter](#rating_count-rating-bar) as a number with a horizontal bar representing [`rating_count` parameter](#rating_count-rating-bar) divided by [`rating_total_count` parameter](#rating_total_count-rating-bar)
    - The left side of the bar represents the base of the bar
    - The left side bar will have [this color](#left_color-rating-bar)
    - The right side bar will have [this color](#star-rating-unfill-color)
    - The bar will start [`rating_count_space` amount of CSS pixels](#rating_count_space-rating-bar) from the left edge of the [`rating_count` parameter's](#rating_count-rating-bar) number
    - EXAMPLE:
       - If [`rating_count` parameter](#rating_count-rating-bar) is 6 and [`rating_total_count` parameter](#rating_total_count-rating-bar) is 18:
          - The left side bar will take up a third of the entire bar width
          - The right side bar will take up 2 thirds of the entire bar width
          - The number to the right of the bar will display `6`