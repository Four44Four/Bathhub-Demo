# Constants
## Non verified color
 - #DCA36E
## Verified color
 - #6EDCB9
## Ratings panel expand duration
 - 600 milliseconds
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

# Description
 - Is page to be displayed on the [swipe-up menu](./swipe_up_menu.md)
# Components
## Ratings panel
 - A dropdown menu with an [arrow icon](?????link-to-arrow-icon????) on the right end
    - Display the average of [columns `rating_1_count`, `rating_2_count`, `rating_3_count`, `rating_4_count`, and `rating_5_count` of this bathroom](../bathroom_db.md#description) as a decimal number rounded to 1 place on the left end
       - Use formula (`rating_1_count` * 1 + `rating_2_count` * 2 + `rating_3_count` * 3 + `rating_4_count` * 4 + `rating_5_count` * 5) / (`rating_1_count` + `rating_2_count` + `rating_3_count` + `rating_4_count` + `rating_5_count`)
    - With a bit of padding to the right of the average number on the left side (still left aligned):
       - Display the [star rating graphic](#star-rating-graphic) with the [property `rating`](#rating-star-rating-graphic) as the average number
 - When interacted with AND closed:
    - Rotate the [arrow icon](?????link-to-arrow-icon????) 90 degrees clockwise and expand the height to fit the below elements at the same time over [this duration](#ratings-panel-expand-duration) (specified in top-bottom order):
       - Store the sum of [`rating_1_count`, `rating_2_count`, `rating_3_count`, `rating_4_count`, or `rating_5_count` columns of this bathroom](../bathroom_db.md#description) in <total-rating-count> 
       - Display 5 [rating bars](#rating-bar) stacked vertically, all with:
          - [Property `rating_total_count`](#rating_total_count-rating-bar) as <total-rating-count>
          - [Property `rating_count_space`](#rating_count_space-rating-bar) as the width of the visually widest out of [`rating_1_count`, `rating_2_count`, `rating_3_count`, `rating_4_count`, or `rating_5_count` columns of this bathroom](../bathroom_db.md#description) plus some padding (below [rating bars](#rating-bar) are in top-bottom order):
       - The first [rating bar](#rating-bar) has unique properties:
          - [Property `rating_count`](#rating_count-rating-bar) as [`rating_5_count` column](../bathroom_db.md#description) of this bathroom
          - [Property `left_color`](#left_color-rating-bar) as [star rating 5 fill color](#star-rating-5-fill-color)
       - The second [rating bar](#rating-bar) has unique properties:
          - [Property `rating_count`](#rating_count-rating-bar) as [`rating_4_count` column](../bathroom_db.md#description) of this bathroom
          - [Property `left_color`](#left_color-rating-bar) as [star rating 4 fill color](#star-rating-4-fill-color)
       - The third [rating bar](#rating-bar) has unique properties:
          - [Property `rating_count`](#rating_count-rating-bar) as [`rating_3_count` column](../bathroom_db.md#description) of this bathroom
          - [Property `left_color`](#left_color-rating-bar) as [star rating 3 fill color](#star-rating-3-fill-color)
       - The fourth [rating bar](#rating-bar) has unique properties:
          - [Property `rating_count`](#rating_count-rating-bar) as [`rating_2_count` column](../bathroom_db.md#description) of this bathroom
          - [Property `left_color`](#left_color-rating-bar) as [star rating 2 fill color](#star-rating-2-fill-color)
       - The fifth [rating bar](#rating-bar) has unique properties:
          - [Property `rating_count`](#rating_count-rating-bar) as [`rating_1_count` column](../bathroom_db.md#description) of this bathroom
          - [Property `left_color`](#left_color-rating-bar) as [star rating 1 fill color](#star-rating-1-fill-color)
       - Display a [panel](?????link-to-panel-element?????) that contains:
          - A [star rating graphic](#star-rating-graphic) with the [property `rating`](#rating-star-rating-graphic) as 0.0 and the [property `interactive`](#interactive-star-rating-graphic) as `true`
          - A [button](../components/viewport2d_button.md) that has:
             - [Text](../components/viewport2d_button.md#text) as "Post"
             - [Fill color](../components/viewport2d_button.md#fill-color) of [this color](#button-fill-color)
             - [Text color](../components/viewport2d_button.md#text-color) color of [this color](#text-color)
             - [Text weight](../components/viewport2d_button.md#text-weight) as [TextWeight.BOLD](../text_weight.md)
             - [Anchor element](../components/viewport2d_button.md#anchor-element) is the [swipe-up menu](./swipe_up_menu.md)
             - [Drop shadow](../components/viewport2d_button.md#drop-shadow) is [this drop shadow descriptor](./dropshadow_descriptor.md)
             - [Click callback](../components/viewport2d_button.md#on-click-callback) is the following:
                - Depending on the filled star value of the [interactive](#interactive-star-rating-graphic) [star rating graphic](#star-rating-graphic):
                   - Update **one** of the [bathroom_data_primary `rating_1_count`, `rating_2_count`, `rating_3_count`, `rating_4_count`, or `rating_5_count` columns for this bathroom](../bathroom_db.md#description)
                - Update the average star rating number to the newly calculated average
                - Update the [star rating graphic](#star-rating-graphic) representing the average star rating number
 - When interacted with AND open:
    - Rotate the [arrow icon](?????link-to-arrow-icon???) and collapse the expanded dropdown menu back to only the items before it was open at the same time over [this duration](#ratings-panel-expand-duration)
    - Unmount all elements that were revealed when it was open once it is fully closed

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
    - Use [this icon](?????link-to-star-icon?????) as the star icon
 - Fill up the stars from the left to right depending on the value of the [`rating` parameter](#rating-star-rating-graphic)
    - The filled color of the stars on the left side is [this color](#star-rating-5-fill-color)
    - The unfilled color of the stars on the right side is [this color](#star-rating-unfill-color)
    - EXAMPLE:
       - If the [`rating` parameter](#rating-star-rating-graphic) is 3.5:
          - The 3 stars on the left would be filled completely
          - The 4th star would be halfway filled and halfway unfilled
          - The 5th star or rightmost star will be unfilled completely
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