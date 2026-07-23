# Constants
## Header text color
 - #000000
## Background color
 - #FFFFFF
## Setting hover brightness value multiply factor
 - 0.9
## Setting hover animate duration
 - 200 milliseconds
## Back button foreground color
 - #B5B5C4
## Schema out of date screen animate duration
 - 500 milliseconds
## Boolean setting toggle animate duration
 - 150 milliseconds
## Schema pull retry duration
 - 5 seconds
## Subsetting page separator brightness multiply by
 - 0.7
## Setting accent color
 - #B1B1FF
## Setting secondary color
 - #DCDCE4
## Boolean setting off knob color
 - #8F8F93
## Boolean setting on knob color
 - #45454D
## Number setting knob color
 - #45454D

# Description
 - Will have header text "Settings" at the top left in large bold text in [this color](#header-text-color)
 - Will have [this background fill color](#background-color)
 - Each setting on the page is separated by a thin horizontal of [this color](#setting-secondary-color)
 - Reserve a margin at the bottom of the settings/subsettings pages to allow for the [close button](#close-user-settings-page-button), [back subpage button](#back-subpage-button), and [save user settings button](#save-user-settings-button) to be displayed without covering up any settings options
 - There should never be a complete teardown of the Cesium Globe when changing user settings unless doing so is explicitly stated in the specification for any user setting
 - Application logic affected by the user settings values will be solely drawn from dedicated in-memory datastructures which represent the user settings (this is **not** an in-memory SQLite DB)
    - This is to maximize application speed when retrieving the proper values when performing anything
 - Use teporary datastructures to store the pending changes that a client has made to their user settings config
    - Changes will be flushed to the actual ones that the app uses when the client saves their changes through the "Save changes" buttonm
 - Settings will be stored in dedicated datastructures which should be synced with a dedicated table in a local persistent SQLite db (the in-memory DB should **not** be a in-memory SQLite)
    - The datastructures representing the user settings should synchronize with the dedicated persistent SQLite table on app open (or page load for web-app demo)
    - The persistent SQLite table should only be written to during user settings migrations and user triggering explicit saves through the settings page's "Save changes" button
    - Table name: user_settings
    - SCHEMA:
       - Each bullet point in the Settings section will specify the DB column name and typing as well as any restrictions on the value

# Components
## Close user settings page button
 - Is a [circular close button](./components/circular_close_button.md)
    - Located at the bottom of the screen (see [x position](./components/circular_close_button.md#x-position) and [y position](./components/circular_close_button.md#y-position))
    - [Click callback](./components/circular_close_button.md#on-click-callback) is the following:
       - If there are unsaved changes:
         - If USER_SETTING_SCHEMA_UPDATE_HAS_ERRORED is `true`:
            - Don't save anything, just close the user settings page
         - Else:
            - Don't close the user settings page
            - Display a [negative important alert](./AlertSystem.md#major-alerts) with the text "You have unsaved changes" with 2 buttons
               - One button has the [negative color](./AlertSystem.md#negative-color) with text "Exit anyways"
                  - When interacted with:
                     - The user settings page closes
                     - Nothing is written to the in-memory user settings datastructures or the persistent SQLite DB containing the user settings
               - The other button has the alert background color with text "Don't exit"
                  - When interacted with:
                     - The alert closes and user remains on user settings page
      - Else:
         - Close the user settings page
   - Has a soft dropshadow
   - Anchored to the same screen coordinates so that it remains on the same screen position as the user scrolls
 ## Back subpage button
 - Borderless button with [this text color](#back-button-foreground-color) and [this background fill color](#background-color)
 - Has text "Back"
 - Has a soft dropshadow
 - Hidden initially
    - Appears when the user is in at least 1 subsetting pages
 - Located to the left of the [close user settings button](#close-user-settings-page-button)
 - When interacted with:
    - Change the user's active settings page to be at the top of the previous setting/subsettings page
## Save user settings button
 - Borderless button with [this text color](#back-button-foreground-color) and [this background fill color](#background-color)
 - Has text "Back"
 - Has a soft dropshadow
 - Hidden initially
    - Appears when user has changed at least 1 setting's value
    - Remains even when the setting is changed back manually to the original value
 - Located as the leftmost element in the row with [close button](#close-user-settings-page-button) and [back subpage button](#back-subpage-button)
 - User settings can **only** be saved if the user interacts with this button
 - When interacted with:
    - If USER_SETTING_SCHEMA_UPDATE_HAS_ERRORED is `true`:
       - Display a [negative important alert](./AlertSystem.md#major-alerts) with the text "Due to a settings data migration failure, saving is currently disabled" with a single button with text "Ok"
    - Else:
       - Display a loading spinner in place of the button text until the saving to **both** the in-memory datastructures representation of the user settings and their backing persistent SQLite DB are done
       - Once they are done saving:
          - Hide [this again](#save-user-settings-button) until another setting changes

## Setting types
 - When any setting is hovered:
    - Multiply the entire setting's (including the background and foreground elements) brightness value by [this factor](#setting-hover-brightness-value-multiply-factor) over [this duration](#setting-hover-animate-duration)
### Boolean setting
 - Sliding circular switch/toggle slider that animates over [this duration](#boolean-setting-toggle-animate-duration)
 - Knob and background are borderless
 - If on:
    - Background color will be [this color](#setting-accent-color)
    - Knob color will be [this color](#boolean-setting-on-knob-color)
 - Else:
    - Background color will be [this color](#setting-secondary-color)
    - Knob color will be [this color](#boolean-setting-off-knob-color)
### Number slider setting
 - Circular slider with rounded ends and with bigger circular knob
    - Knob color will be [this color](#number-setting-knob-color)
    - Left bar will be [this color](#setting-accent-color)
    - Right bar will be [this color](#setting-secondary-color)
    - Bar and knob are borderless
 - Has inclusive minimum and maximum values
 - Has an integer variant which snaps to integers between the min and max values
 - Has a float variant which allows for decimal values between the min and max values
### Subpage setting
 - Has the [arrow icon](./resources.md#arrow-icon) with [this color](#setting-secondary-color) on the right side
 - When interacted with:
    - Enter into that subpage
       - Header will show "Settings > <current-settings-page-header>"
       - Nested subsettings pages (subsettings pages inside of subsetting pages) will show the nesting in the header text
          - EXAMPLE: "Settings > SubsettingsPage0 > SubsettingsPage1 > SubsettingsPage2"
       - If the header gets too long to fit on the screen:
          - Only show the tail end of the header and cut off everything before it with an ellipsis
             - EXAMPLE: "Settings > SubsettingsPage0 > SubsettingsPage1 > SubsettingsPage2" could be "...ubsettingsPage2"
       - Make the ">" symbol have a value that is a [this fraction](#subsetting-page-separator-brightness-multiply-by) as bright much as the rest of the header text

# Client schema updating and versioning logic
 - The server will store different migration scripts between every version by 1 increment (i.e. version 1 to 2, version 5 to 6, etc...)
    - If the client requests migrating from an invalid version (below 0 or above maximum current version):
       - Respond notifying the client that they requested an migration from an invalid version
    - If the client requests migrating from the maximum current version:
       - Respond notifying the client that they are already at the maximum current version
    - These can be accessed from the client, as long as the client specifies which version they are upgrading **FROM**
    - The schema migration should change the client's persistent schema number to be equivalent to the incremented schema number (from the schema number that the client sent up)
    - The schema migration must be atomic
    - It must be able to revert to the pre-migration state if a failure occurs during the migration
    - There should not be a scenario where the DB is left in a partially migrated state
    - The schema migration should only be from one version to the version directly after it, never skipping any versions
       - This will prevent user setting data from being unintentionally lost if the client falls behind very far on their local user setting schema version
    - The schema migration should always fill new columns with default values
    - The schema migration should always make UPDATE statements to coerce all potentially newly invalid values to be some valid value if a new CHECK constraint is added or if an existing CHECK constraint is updated
    - The schema migration should be designed to handle accidental repeat runs and prevent them from corrupting DB
       - Errors should be raised when duplicate actions are detected, which should trigger an automatic aborting of the attempted schema update, leaving the schema unchanged from before the attempted schema migration
          - For example, trying to add the same column multiple times or deleting a column that doesn't exist
 - The client will have a dedicated and persistent key-value pair named SCHEMA_VERSION with a number value stored in their SQLite DB for the last schema version that the client has installed
 - The client's frontend code will store the valid schema number that is needed to make the frontend of the app work
    - This is not stored and queried from the server as the client may be using an out of date version of the app and relying on purely the server will lead to the out of date app breaking the moment a client migrates their local user settings DB schema
 - Every schema migration that is created on the server should contain the default values for each setting so that the client can preload them later, in case a SQL migration fails
 - (RUN THIS BEFORE LOADING PERSISTENT USER SETTINGS SQLITE TABLE INTO IN-MEMORY DATASTRUCTURES) If the client opens the app (or visits the web-app if this is the web-app demo version):
    - If the client's persistent SCHEMA_VERSION key-value pair and the in-memory, hardcoded frontend schema number (updated by updating the frontend source code) differ:
       - The client will enter a SCHEMA_OUT_OF_DATE state
 - If the client is in a SCHEMA_OUT_OF_DATE state:
    - Display a "schema out of date" screen that prevents the client from doing anything
    - (on the webapp demo) The "schema out of date" screen will only take up the phone interface screen
    - There is header text that reads "Loading updated settings"
    - There is a loading spinner under the text
    - When the screen is to be hidden:
       - Animate it disappearing by sliding down and off the screen over a [this amount of time](#schema-out-of-date-screen-animate-duration)
    - Try every [this amount of time](#schema-pull-retry-duration) to request a schema update from the server
       - The schema update request will consist of the client's current persistent schema version number
       - If the schema update request successfully reaches the server:
          - Server sends down a USER_SETTING_SCHEMA_UPDATE response along with the schema migration SQL scripts to change the client's schema version **by 1 increment**
             - If the client has received it:
                - The client will preload the default values into the in-memory datastructures that the application reads the user settings from
                   - This must happen before any SQL migration code is ran to ensure that the client will have a functional application even if the is a failure during the SQL migration process
                - The client will process the SQL migration code
                - If the client correctly processed all the SQL migration code:
                   - The client will check if the new persistent schema version number from the SCHEMA_VERSION key-value pair and the in-memory frontend schema number match: 
                      - If not:
                         - Request the next schema migration script between the current and next version
                         - Repeat this process until the persistent schema version and in-memory frontend schema version are the same
                      - If so:
                         - Set SCHEMA_OUT_OF_DATE to false
                         - Load the user settings data from the persistent user settings SQLite DB table into the dedicated in-memory user settings datastructures
                         - The client leaves the "schema out of date" screen
                         - The client returns to seeing whatever screen they were looking at before the user settings config request to the server succeeded
                - If the client encounters an error when processing the migration SQL code:
                   - The client's user setting configs should be left unchanged from pre-migration state
                   - Send a server message with a USER_SETTING_SCHEMA_UPDATE_ERROR with the current client schema version, as well as the offending error strings
                   - Set the variable USER_SETTING_SCHEMA_UPDATE_HAS_ERRORED to true
                   - Set SCHEMA_OUT_OF_DATE to false (temporarily)
                      - This will be set back to true when the client reopens the app (or revisits the web-app demo)
                   - The client leaves the "schema out of date" screen
                   - The client sees a negative important alert that a user settings update failed to apply with the text "There was a problem updating user settings data to a newer version, settings will be saved on device, but default settings will be used until it is eventually fixed" with button text "Ok"
 - Under no circumstances should a client's frontend code try to load data from the persistent SQLite user settings DB table without first confirming that the schema version number from the persistent SQLite local data table matches with the hardcoded frontend schema version OR if the client has USER_SETTING_SCHEMA_UPDATE_HAS_ERRORED as true
    - This way, mismatches will not occur during the loading process for an out of date user settings config
 - If USER_SETTING_SCHEMA_UPDATE_HAS_ERRORED is true:
    - The client will have a negative band alert (same color as the negative important alert's button background color, but copy the constant by value into a new constant) at the top of the screen with white text saying "Danger: user settings cannot be changed"
    - Do not clear the band alert until USER_SETTING_SCHEMA_UPDATE_HAS_ERRORED is false
 - Whenever a new schema version is created/added:
    - On server:
       - Run all migrations from v0 to v<new-version> to initialize a complete default user settings table/DB
       - If successful:
          - Store the resulting SQLite DB in an appropriate folder on the server
          - There should only ever be 1 SQLite test DB on the server
             - This should only be changed/replaced if all the cumulative migrations ran without errors
       - Should be tested in integration tests to ensure that all cumulative migrations will produce a valid default user settings tabel/DB
 - If the user visits the app without an SQLite DB for the user settings:
    - Retrieve the complete default user settings DB from the server and load it onto the client as their initial user settings DB


# Settings
## Toggle globe movement animations
 - Setting type: [Boolean](#boolean-setting)
 - Client name: Globe movement smooth animations
 - SQL Name: globe_movement_smooth
 - SQL Type: BOOLEAN
 - SQL Restrictions: CHECK (globe_movement_smooth IN (0, 1))
## Initial camera height
 - Setting type: [Number slider](#number-slider-setting)
 - Client name: Init camera height (meters)
 - Min: 500
 - Max: 10000
 - SQL Name: camera_init_surface_offset_m
 - SQL Type: INTEGER
 - SQL Restrictions: CHECK (camera_init_surface_offset_m >= <Min-value-for-this-setting> AND camera_init_surface_offset_m <= <Max-value-for-this-setting>)
## Bathroom settings subsettings page
 - Setting type: [Subsettings page](#subpage-setting)
### Find nearest bathroom maximum distance
 - Setting type: [Number slider](#number-slider-setting)
 - Client name: Find nearest bathroom max. distance (meters)
 - Min: 0
 - Max: 10000
 - SQL Name: find_nearest_bathroom_max_dist_m
 - SQL Type: INTEGER
 - SQL Restrictions: CHECK (find_nearest_bathroom_max_dist_m >= <Min-value-for-this-setting> AND find_nearest_bathroom_max_dist_m <= <Max-value-for-this-setting>)
# Integration tests
 - Migrations between every sequential pair of user setting schema versions should be tested
    - If a new user setting schema version is published or added:
       - Add a test between the previous most up to date schema version and the new one
    - Any failure in the migration should result in the entire integration test failing + notify which pair of versions failed to migrate
    - There should be migration tests between each version from v0 all the way up to v<current-schema-version>
    - Each migration schema version test should not just run without errors, but also verify that each schema version's table contains the expected values
       - This should be able to verify that user setting data isn't corrupted or lost when altering the schema of the table like renaming a column or merging columns