# Overview
 - Inited Next.js boilerplate
 - Created most of the frontend with Cesium and React
    - Cesium for 3D rendering
    - React for 2D rendering
 - Integrated all necessary APIs for rendering a basic Globe with a map
    - Mouse and finger controls for zooming, panning, and clicking/tapping on the Globe
 - Created pathfinding logic and rendering
    - Used Open Route Service web API to calculate GPS route data when supplied with 2 coordinate pairs
    - Used Cesium's existing Polyline and Material API to build a thick, anti-aliased, rounded line on route GPS data with dynamic, shader based visual effects
 - Added debugging UI elements for detecting expensive Globe viewport center calculations
 - Created framework for handling errors and alerts
    - Divided alerts into important and unimportant
 - Extracted as much functionally pure logic from frontend components into dedicate files for pure functions
 - Built regression unit tests for the functionally pure logic with Jest

# Agentic Experience
 - At the start:
    - Velocity was extremely fast
    - Features were added one after the other
    - Tests were non-existent
    - The plan was to use Google Maps' API, but it turns out to be paid only, so Open Street Map was chosen as a realistic demo-friendly alternative
    - 3D viewport development started with using Three.js, but this was abandoned when Cesium was found to be more appropriate for globe-like 3D rendering
 - Positive experiences:
    - Agents could find libraries that are best suited for implementing specific Features
       - Examples include Jest for testing and Cesium for 3D globe rendering
    - Once supplied with specific enough technical specifications, agents could build code that worked more often than not
       - Even when they didn't get 100% of the way there, they were able to build out massive amounts of boilerplate code that would have taken hours or days to produce from scratch
    - Agents were able to fix a bug preventing Cesium and WebGL from properly loading outside of a development environment
 - Pain points:
    - Implementing pinch-to-zoom functionality was extremely difficult, primarily because I was unclear about exactly what mathematical logic should be done on the pointer data to create the desired zooming effect
       - Pinch-to-zoom should allow concurrent panning if the fingers of the client are moving closer while moving horizontally/vertically in the same horizontal/vertical direction
       - Claude Opus 4.7 particularly struggled with understanding what math was necessary to implement this logic given the pointer data from the browser
          - It came up with several complex vector mathematical solutions, but none of them even remotely worked as intended
          - Behavior actually regressed as Claude tried to refactor it further
          - I eventually discovered that one of the pointers would get stuck at 0 velocity for several seconds after the clients' 2 fingers made contact with the screen
          - The solution was to: 
             1. Switch away from Claude and back to Auto mode on Cursor
             2. Map out all the mathematical logic to calculate the intended direction of the camera panning, how to calculate the speed of the panning, etc... based on the velocity detected from the 2 fingers on the screen while also factoring in the erroneous 0 velocity readings
             3. Manually modify several lines code to push it over the finish line to be fully functional
    - Excessive duplication of generic utility functions
       - Many RGB to hex or interpolation functions would be created in every new element that was implemented
       - Manual intervention had to be made to extract out these functions and put them in dedicated utility files, or the agents were instructed to refactor the newly created element's file to use existing logic from utility files
    - Neither Auto nor Claude Opus 4.7 understood the concept of rounding out the corners of the Path Cesium Polylines
       - A generic prompt instructing the agents to "figure out a way to round out sharp corners on the rendered Polyline" resulted in increasingly bizarre solutions to rounding out the sharp corners
       - Specific prompts seemed to get those agent models closer to figuring out a method that works, but it was still insufficient
       - An attempt to use Claude Opus 4.7's supposed "extra high" reasoning capabilities was used to plan out and implement a solution for rounding out the corners, but it ended up consuming over 13 million tokens over the course of at least half an hour of thinking to create at least 1000 lines of unrunnable code (forget about solving the problem)
       - Switching to Codex 5.3 and using a similar prompt, the problem was solved in less than 10 minutes and using under 3 million tokens
          - Codex came up with a bezier curve solution to the sharp corners, a much more coherent answer than Claude's gibberish
    - Agents in general seem capable of building out most of the boilerplate code (that can be easily found from online sources), but functionality that is very specific and particular must be either prompted with extreme technical specificity, or be manually and meticulously implemented
    - Overall, many pain-points seemed to be solved by:
       1. Not using Claude Opus 4.7
       2. Being as specific as possible about the specifications in your prompt
           - Vague prompts made with little understanding of the system at hand result in wild assumptions and inconsistent architecture

# Future Plans
 - With most of the frontend in place, the database part of the app will be next
 - I predict that I'll have to be even more careful about what agents are or are not allowed to change
    - If the frontend has sloppy code, it might result in rendering bugs and broken user experiences
    - But if the backend has sloppy code, it might result in permanent data loss
    - Permanent data loss could be unrecoverable, and I would want to avoid that as much as possible