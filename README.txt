BOXXY — Pushbox Puzzle v125
================================

Open index.html through GitHub Pages or another web server.

SOLVER
------
The hidden Level Maker uses the browser Rust/WebAssembly engine from
https://github.com/dangarfield/sokoban-solver at pinned commit:
d355ece7272ec89071056ef64ce257c797f9c2b1

v125 fixes the v124 "Engine unavailable" failure mode. The worker no longer
imports a remote JavaScript module directly. It fetches the generated binding
and the matching WASM binary separately, imports the binding from a local Blob
URL, and initialises it with the downloaded WASM bytes. Three pinned/fallback
hosts are tried independently.

The solver still requires internet access because the third-party repository
contains no explicit redistribution licence. Normal BOXXY gameplay remains
fully local.

Every returned solution is replayed and verified by BOXXY before it is stored
or offered as a guided solve. The old BOXXY FESS solver and fallback search are
not included.

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
SOLVER-v125-TEST-REPORT.txt

VERSION
-------
All active script cache tags and solver-worker references are v125.
The ZIP unpacks into the BOXXY_v125 folder.
