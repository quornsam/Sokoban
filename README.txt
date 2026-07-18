BOXXY — Pushbox Puzzle v127
================================

Open index.html through GitHub Pages or another web server.

LEVEL MAKER SAVES
-----------------
Saved maker levels are stored locally in the current browser. They are not
written to GitHub or automatically shared between devices.

Saving now always creates a new saved-level record when the entered name is
unique. Loading an older save does not put it into rename/update mode. Change
the name and press SAVE LEVEL to preserve the original and make a new level.

Saved-level names are compared case-insensitively and with repeated spaces
normalised. If the name already exists, BOXXY warns before doing anything. A
second deliberate press on OVERWRITE is required to replace that named save.
Changing the name cancels the overwrite confirmation.

The newest 100 saves are retained.

SOLVER
------
The hidden Level Maker uses the browser Rust/WebAssembly engine from
https://github.com/dangarfield/sokoban-solver at pinned commit:
d355ece7272ec89071056ef64ce257c797f9c2b1

The solver requires internet access. Normal BOXXY gameplay and saved maker
levels remain local. Every returned solution is replayed and verified by BOXXY
before it is stored or offered as a guided solve.

HIDDEN LEVEL MAKER
------------------
Click the first X in the BOXXY title five times, then press X.

HIDDEN GUIDED SOLVE
-------------------
On desktop, click the character five times, then press S. A solution must
already be stored for that puzzle.

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
RELEASE-v127-TEST-REPORT.txt

VERSION
-------
All active script cache tags and solver-worker references are v127.
The ZIP unpacks into the BOXXY_v127 folder.
