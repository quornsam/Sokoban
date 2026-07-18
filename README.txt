BOXXY — Pushbox Puzzle v129
================================

Upload the contents of this BOXXY_v129 folder to the root of the GitHub
repository used by GitHub Pages.

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
The MAZE option now builds a thin-corridor maze: most passages are one cell
wide, internal wall lines are one cell thick, and only a few small turning bays
are opened so boxes can change direction. Even-sized grids may contain one
localised two-cell-wide run because an even interior cannot alternate one-cell
passages and walls perfectly between two one-cell borders.

MAZE can be combined with TESTED. TESTED maze generation takes longer because
BOXXY constructs and verifies a reverse solution path.

TESTING AND GUIDED SOLVES
-------------------------
While testing a Level Maker puzzle, BOXXY records every successful player move.
Undo also removes the corresponding recorded move.

If a puzzle has no attached solution and the user completes it manually, that
route is attached automatically as its guided solve. Return to the maker and
save the level to preserve the route in the saved-level record.

If a puzzle already has a guided solve and the user completes it by a different
route, the completion panel offers APPLY SOLVE. This replaces the attached route
for the editor puzzle; save the level to keep it.

The hidden guided-solve control now works during Level Maker testing without
leaving the custom puzzle: on desktop, click the character five times and press
S. A solution must already be attached.

Campaign or pack levels that have no stored solution also learn a manual route
when the user completes them. The route is stored locally for future guided use.

SOLVER
------
The hidden Level Maker uses the browser Rust/WebAssembly engine from
https://github.com/dangarfield/sokoban-solver at pinned commit:
d355ece7272ec89071056ef64ce257c797f9c2b1

The external solver requires internet access. Normal gameplay, the maze
generator, manual testing and locally saved maker levels do not. Every returned
solver route is independently replayed and verified by BOXXY before use.

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
solver-worker.js
solver-route-verifier.js
assets/
level-packs/
CREDITS-AND-LICENCES.txt
RELEASE-v129-TEST-REPORT.txt

VERSION
-------
All active script cache tags and solver-worker references are v129.
The ZIP unpacks into the BOXXY_v129 folder.
