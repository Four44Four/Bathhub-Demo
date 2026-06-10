<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Implementation rules
 - Always extract purely functional/mathematical logic into modular, top level functions
 - Use dependency injection pattern whenever possible
 - Create unit tests whenever new pure functions or logic is added
 - Whenever new Supabase DB interfacing logic is added, create corresponding integration tests in ./supabase-test to ensure DB state will be exactly as intended in a real Supabase DB

Specifications for the GlobeViewport are in file ./specifications/GlobeViewport.txt