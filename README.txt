BOXXY — PUSHBOX PUZZLE v124
================================

This is the full BOXXY game and Level Maker release.

RUNNING
-------
Upload the contents of the BOXXY_v124 folder to GitHub Pages, or serve the
folder with a normal local web server. Opening index.html directly from disk
will play the game, but browsers normally block the module worker used by the
solver.

SOLVER IN v124
--------------
The former in-house BOXXY solver has been removed. The Level Maker now
uses the browser Rust/WebAssembly engine hosted by:

    https://github.com/dangarfield/sokoban-solver

The engine is a push-state A* Sokoban solver with basic deadlock detection and
box-to-goal heuristics. It is inspired by Festival but is not the complete
native Festival solver.

The upstream repository does not currently state a redistribution licence.
For that reason this BOXXY archive does not copy its JavaScript, WASM or Rust
files. The module worker loads the browser build for upstream commit
d355ece7272ec89071056ef64ce257c797f9c2b1 from a pinned CDN URL, with the
maintainer-hosted GitHub Pages build as a fallback. Normal gameplay remains
local; solver use requires an internet connection.

Every route returned by the external engine is replayed independently by
solver-route-verifier.js. BOXXY attaches the route only when every movement is
legal and all boxes finish on goals. Solver cancellation terminates the worker
immediately.

GUIDED SOLVE
------------
The existing hidden five-click character + S playback remains in place.
Completion wording now uses “GUIDED SOLVE” instead of the longer
“WALKTHROUGH USED”, preventing the congratulations title from cropping.

FILES
-----
index.html                   game and Level Maker interface
styles.css                   visual styling
boxxy.js                     game, Level Maker and solver adapter
data.js                      level packs and authored solution data
solver-worker.js             Rust/WASM worker adapter
solver-route-verifier.js     independent Sokoban route replay
solver-adapter-tests.js      local verification regression tests
assets/                      artwork and audio
CREDITS-AND-LICENCES.txt     collection and backend credits
SOLVER-v124-TEST-REPORT.txt  release checks

VERSION
-------
All application cache tags and package names are v124.
