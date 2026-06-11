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
 - Whenever new Supabase DB interfacing logic is added, create corresponding integration tests in ./supabase-test to ensure DB state will be exactly as intended in a real Supabase DB
 - If any database schema changes are prompted:
    - Do not edit old database migration scripts that create the table
    - Create a new migration script instead
 - When creating unit or integration tests:
    - Use as much of the logic from the source code
    - The tests are intended to test logic from the source code, not invent new application logic solely for the test
 - All files in ./specifications are the intended technical specifications of the project so far
    - Do not treat them as reflective of what is currently implemented in the source code