BOXXY — Pushbox Puzzle v132
================================

Upload the contents of this BOXXY_v132 folder to the root of the GitHub
repository used by GitHub Pages.

IMPORTED SOLUTION STRINGS
-------------------------
Open PUZZLE SOLVER from the Level Maker and paste a UDLR movement string into
IMPORT A SOLUTION STRING. Press CHECK SOLUTION. BOXXY independently replays the
string against the current editor board and reports the first illegal move, or
whether the legal route fails to finish the puzzle.

Only a route that legally places every box on a goal enables APPLY IMPORT.
Applying it attaches the route to the current puzzle so the five-click + S guided
solve works while testing. Spaces, line breaks and arrow symbols are accepted;
the stored solution is normalised to BOXXY's lower-case walks and upper-case
pushes.

LEVEL PACK BUILDER
------------------
Open the hidden Level Maker, then press LEVEL PACK BUILDER beneath Saved Levels.

The builder reads the levels saved in the current browser and shows every
starting position as a miniature board. Saved levels remain in alphabetical
order in the library.

Drag a level into LEVEL PACK ORDER, or press ADD TO PACK. Drag the ordered cards
to rearrange them. Arrow buttons provide an alternative way to move a card and
REMOVE takes it out of the draft without deleting the original saved level.

The desktop grids use six columns on wide screens and five columns on moderately
wide screens. They reduce further on small screens.

PACK DRAFTS
-----------
Pack drafts are stored locally in the current browser. The builder supports up
to 20 drafts. NEW PACK creates another draft, SAVE DRAFT saves explicitly, and
ordinary changes are also saved automatically.

A pack draft contains snapshots of the levels placed in it. Editing or deleting
the original Level Maker save later does not silently change the draft pack.

PUBLISH / EXPORT OPTIONS
------------------------
BOXXY PACK SCRIPT creates a JavaScript pack file suitable for the repository's
level-packs folder. The generated file appends the pack to
window.BOXXY_LEVEL_PACKS when loaded before boxxy.js.

PRIVATE DRAFT ARCHIVE creates a JSON archive with a suggested draft-packs path.
STANDARD XSB COLLECTION creates a conventional text collection.

The builder prepares and downloads the file. It does not authenticate with
GitHub, commit files, or add a script tag to index.html automatically.

BOXXY DAILY PUZZLE
------------------
The DAILY PUZZLE tab is a private scheduling workspace. Drag saved levels into
the queue and reorder them in the same way as a pack.

Choose the date of the first puzzle. Each following card is assigned the next
calendar day and a publication time of 00:00 in the browser's local IANA time
zone. The exported JSON records both the local date/time and its corresponding
UTC instant, including daylight-saving changes.

The Daily Puzzle schedule is not read by the public game in v132. Exported data
has frontEndEnabled set to false and a suggested future destination of:

daily-puzzles/boxxy-daily-puzzles.json

LEVEL MAKER SAVES
-----------------
Saved maker levels are stored locally in the current browser. They are not
written to GitHub or automatically shared between devices.

Saved levels are displayed alphabetically. Loading a saved level and changing
it does not alter the original. A new name creates a separate saved level.
When a name already exists, BOXXY warns first and requires a second deliberate
press on OVERWRITE.

The newest 100 saves are retained.

MAZE GENERATOR
--------------
The MAZE option builds a thin-corridor maze: most passages are one cell wide,
internal wall lines are one cell thick, and only a few small turning bays are
opened so boxes can change direction.

TESTING AND GUIDED SOLVES
-------------------------
While testing a Level Maker puzzle, BOXXY records every successful player move.
If a puzzle has no attached solution and the user completes it manually, the
route is attached automatically as its guided solve. Existing routes can be
replaced through APPLY SOLVE.

SOLVER
------
The hidden Level Maker uses the browser Rust/WebAssembly engine from:
https://github.com/dangarfield/sokoban-solver

The external solver requires internet access. Normal gameplay, pack building,
Daily Puzzle scheduling, maze generation and locally saved levels do not.

HIDDEN LEVEL MAKER
------------------
Click the first X in the BOXXY title five times, then press X.

HIDDEN GUIDED SOLVE
-------------------
On desktop, click the character five times, then press S.

RELEASE CONTENTS
----------------
index.html
styles.css
boxxy.js
data.js
pack-builder.js
solver-worker.js
solver-route-verifier.js
assets/
CREDITS-AND-LICENCES.txt
RELEASE-v132-TEST-REPORT.txt

VERSION
-------
All active script cache tags and solver-worker references are v132.
The ZIP unpacks into the BOXXY_v132 folder.


BOXXY v132
----------
- The solver progress bar now becomes determinate and complete whenever loading/searching stops, including failure and cancellation.
- The Level Maker can create a compact private puzzle link with COPY SHARE LINK.
- Shared links use #p=<URL-safe-code>, so they work on static GitHub Pages without server routing.
- A shared link opens only the custom puzzle game view: level packs, level selection and Level Maker access are hidden.
- The link contains the puzzle starting position and title. It is unlisted rather than encrypted: anyone possessing the URL can play it.
