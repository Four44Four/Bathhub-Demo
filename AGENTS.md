<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Implementation rules
 - This is a webapp demo version of an app
    - Implement code that will work solely in a browser environment
 - Always extract purely functional/mathematical logic into modular, top level functions
 - Use dependency injection pattern whenever possible
 - Create unit tests whenever new pure functions or logic is added
 - Whenever new Supabase DB interfacing logic is added:
    - Create corresponding integration tests in ./integration-tests to ensure DB state will be exactly as intended in a real Supabase DB
 - Whenever new features are added:
    - Analyze codebase for existing utilities and logic that can be reused for implementing the new features
    - Only implement new utilities and logic if another method is more efficient at doing the same task
       - In this case: 
          - Remove the old utilities and logic
          - Update all parts of the codebase that depend on it
          - Notify the developer that such a change was made
 - Whenever client-side constants are implied in a specification:
    - Insert them as properties of the appropriate exported constant objects in app/_client/ComponentConstants.ts
 - If any database schema changes are prompted:
    - Do not edit old database migration scripts that create the table
    - Create a new migration script instead
 - Everytime a DB migration is created:
    - Ensure that it increments the DB schema version for whatever DB it will change
 - When creating unit or integration tests:
    - Use as much of the logic from the source code
    - The tests are intended to test logic from the source code, not invent new application logic solely for the test
    - If an integration test fails:
       - Check to see if any corresponding/related unit test is actually testing the big-picture/architectural functionality, not just localized behaviors
    - If a unit test fails:
       - Check to see if any corresponding/related integration test should be revised to account for any changes that will be made to the failing unit test, while ensuring the intended purpose of the integration test
    - Integration tests should not use existing .env files
       - Use locally hosted versions of dependencies whenever possible
       - If locally hosted versions of any dependencies are not available:
          - Notify developer
 - Whenever new user settings are added/created:
    - Create a new schema version to migrate the clients' SQLite DB tables for persistently storing the user settings with the new user settings and any defaults
    - Create a new DB snapshot for initializing clients with no user setting DBs in .app/_server/user-settings/snapshot/default-user-settings.sqlite by running all the migrations up to the newest one
 - Whenever a new Redis based feature/operation is added:
    - Use the Redis client wrapper, not the Redis client packages directly (to allow for Redis client implementation to be changed without requiring a major refactoring)
 - Whenever a new serverside DB CRUD endpoint/client accessible function is exposed:
    - Enforce an appropriate rate limit if there was no specific rate limit specified
    - Notify developer that a rate limit was automatically added
    - Test the rate limit in integration tests
 - All files in ./specifications are the intended technical specifications of the project so far
    - Do not treat them as reflective of what is currently implemented in the source code
    - If code is encountered that does not match the technical specifications:
       - Create a notification when outputting the summary of the changes is made indicating that some part of the implementation is/might not be functioning as intended, but do not modify it unless explicitly instructed to