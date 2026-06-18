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
    - All migration scripts (for SQLite or PostgreSQL) should be atomic
       - If a failure occurs during the migration, the DB should not be left in a partially migrated state
 - When creating unit or integration tests:
    - Use as much of the logic from the source code
    - The tests are intended to test logic from the source code, not invent new application logic solely for the test
    - If an integration test fails:
       - Check to see if any corresponding/related unit test is actually testing the big-picture/architectural functionality, not just localized behaviors
    - If a unit test fails:
       - Check to see if any corresponding/related integration test should be revised to account for any changes that will be made to the failing unit test, while ensuring the intended purpose of the integration test 
 - All files in ./specifications are the intended technical specifications of the project so far
    - Do not treat them as reflective of what is currently implemented in the source code
    - If code is encountered that does not match the tecnical specifications:
       - Create a notification when outputting the summary of the changes is made indicating that some part of the implementation is/might not be functioning as intended, but do not modify it unless explicitly instructed to