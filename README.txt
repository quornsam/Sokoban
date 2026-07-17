BOXXY — Pushbox Puzzle v126
================================

Open index.html through GitHub Pages or another web server.

SOLVER
------
The hidden Level Maker uses the browser Rust/WebAssembly engine from
https://github.com/dangarfield/sokoban-solver at pinned commit:
d355ece7272ec89071056ef64ce257c797f9c2b1

v126 replaces the failed cross-origin and Blob-module loaders. It fetches the
generated binding and WASM binary from three mirrors at the same time, converts
the binding to ordinary worker code, initialises the WASM bytes directly, and
runs a one-push self-test before reporting the engine ready. Each mirror has a
15-second limit, so a blocked host cannot cause a minute of sequential waits.

The solver still requires internet access because the third-party repository
contains no explicit redistribution licence. Normal BOXXY gameplay remains
fully local.

Every returned solution is replayed and verified by BOXXY before it is stored
or offered as a guided solve. The old BOXXY solver and fallback search are not included.

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
SOLVER-v126-TEST-REPORT.txt

VERSION
-------
All active script cache tags and solver-worker references are v126.
The ZIP unpacks into the BOXXY_v126 folder.
