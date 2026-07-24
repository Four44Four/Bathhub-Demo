# Sprint 2 (basic backend)
 - Add rating system on bathrooms (stars 1-5)
 - Add existence voting system on bathrooms
    - New status for bathroom marker: Pending deletion

# Sprint 3 (accounts)
 - Add account system
    - Restrict destructive Bathroom DB operations to authenticated users
 - Track reputation score for accounts
    - Block accounts below a certain reputation score from voting on bathrooms
    - Accounts start with a low reputation score
    - Accounts build reputation score by using app & not engaging in "suspicious activities"
 - Add comments system on bathrooms
 - Setup S3 for Supabase
 - Add media upload system on bathrooms
 - Selective realtime updating via SSE ???
    - Not on by default, user needs to have an acct + meet specific criteria

# Sprint 4 (offline caching)
 - Add way to save map data and all bathrooms visible in viewport
 - Add page to view and run path finding on saved map data
 - Add way to/button to enable automatically caching data about:
    - Nearby bathrooms of current geographic location
    - Bathrooms of custom selected area
 - Add page to switch to using cached local map/bathroom data