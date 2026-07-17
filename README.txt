BOXXY v120

Solver update:
- The puzzle solver remains one forward Feature Space Search (FESS) engine. Deadlock analysis is a separate gate applied before the starting state and after every generated push.
- v120 adds a separate maze-subset proof in which boxes already on goals remain part of the interacting group. The older permissive local-window check may still treat a goal box as solved, but it is no longer the only analysis applied to that configuration.
- The deadlock gate now performs generic connected-subset proofs on nearby groups of two to four boxes. All other boxes are removed, making the test position easier. A group is rejected only when every legal push in that relaxed position leads to an already proved deadlock.
- The subset proof is maze-specific rather than tied to a level, coordinate or move sequence. It catches the supplied Small Chessboards 12 locked position before a single FESS node is generated.
- Frozen-box analysis now follows recursive two-axis blocking: walls, paired dead squares and recursively frozen neighbouring boxes can prove an interacting frozen group.
- Existing static dead-square, solid 2 x 2, complete box-to-goal matching, frozen-goal interference, local pattern, corral and articulation-room checks remain in place.
- Incomplete or capped local analysis means unknown, never dead. FESS therefore keeps any branch that has not been soundly proved impossible.
- FESS retains the fixed compact typed-array state store introduced in v119. Every completed route is replayed before it can be attached to a puzzle.

BOXXY — Pushbox Puzzle v120

Open index.html in a web browser.

Files
- index.html: compact interface structure
- styles.css: all visual design and responsive layout
- boxxy.js: character renderer, game engine and level maker
- solver-core.js: standalone Sokoban search engine used by the Level Maker
- solver-worker.js: background bridge that keeps long solves responsive
- data.js: all four puzzle packs, metadata and stored walkthrough strings
- CREDITS-AND-LICENCES.txt: additional-pack authorship and distribution terms
- assets/: active Bauhaus artwork, board atlas, splash art and music

Controls
- Arrow keys or WASD
- Z: undo
- R: restart
- On-screen direction pad and swipe controls are also supported.

Hidden desktop walkthrough
- On a computer with a mouse, click the gameplay character five times.
- Then press S.
- The current level restarts and plays its stored solution from the beginning.
- This is intentionally unavailable on phone/touch-only layouts.

The visible hint/arrow guide has been removed.


v26 layout update:
- Fixed one-window desktop layout with no page scrolling.
- Responsive portrait and landscape phone control layouts.
- Desktop-only Full Screen button with Safari-compatible fallback.
- Board is measured against its actual available panel size.


BACKGROUND MUSIC
- Cracked Ivory Drift plays quietly on a loop.
- MUSIC ON/OFF is available on desktop and mobile.
- Browsers that block audible autoplay begin playback on the first interaction.

V26: The centre D-pad tile opens a character wardrobe. T-shirt, trousers, hair colour, skin colour and shoes are independently recolourable and saved locally.

V26: full-character wardrobe preview, expanded colour palettes, T-shirt icon style button, compact fullscreen exit label, and neutral 3D box landing pads.


v27 visual refinement:
- Restored the original Bauhaus square-and-circle goal artwork.
- Slightly flattened, enlarged and lowered the goal marker so it reads as a floor footprint beneath the 3D crate.
- Replaced the centre control artwork with a cleaner, recognisable T-shirt silhouette.


V29: restored five-click + S desktop autoplay hit testing; expanded wardrobe palettes; added eye colour; added light trouser colours and yellow/blue/green skin; centre icon now shows shirt and trousers.


V29: rebuilt clean anti-aliased T-shirt masks and replaced flat eye recolouring with full-eye rendering (dark rim, coloured iris, pupil and catchlight).

V32: changed the eye whites from black to white, reduced eye choices to Blue, White, Hazel, Brown, Orange and Dark, and softened the iris size.

V32: removed eye-colour customisation and restored the original black eyes from the base character artwork.


Version 33: dynamic randomized Bauhaus background per level with subtle motion.

Version 34: brighter primary Bauhaus colours and quicker background movement.


Version 35: wardrobe adds Boy/Girl option with longer hair, chest and skirt overlays for girl mode.


Version 36: replaces failed girl overlay with a true 12-frame girl asset pack plus recolour layers.


Version 49: rebuilt girl shirt/skin masks as a complete non-overlapping partition and validated all 12 frames in the same renderer as the boy.


Version 52 cleanup:
- character assets reorganised into assets/characters/boy and assets/characters/girl
- board assets moved to assets/board
- audio moved to assets/audio
- debug and report JSON files removed from the release zip
- background decor density and motion increased


Version 64 asset optimisation:
- individual character frames replaced by 12 sprite sheets
- unused eye-layer and yellow-goal files removed
- release file count reduced for GitHub web upload


Version 65:
- Full-screen label wraps cleanly instead of cropping.
- Timer text reduced to fit its stats cell.
- Responsive title sizing prevents PUSH SOKOBAN clipping on short/wide screens.
- Instruction strip replaced by character thoughts assembled from 100 phrase fragments (37,026 combinations).
- Konami code Up Up Down Down Left Right Left Right A B Enter animates the otherwise static background.


Version 66:
- Konami background begins without a position flash and moves slightly faster.
- Character thoughts now use one or two sentences and crossfade more slowly.
- Puzzle-complete modal redesigned in the game’s Bauhaus visual language.


Version 67:
- rebuilt thoughts as a combinatorial inner-monologue generator with recent-fragment and recent-output protection
- removed the three rejected puzzle lines
- unlocks Web Audio on the first mobile interaction
- redesigned wardrobe button as a crisp vector shirt-on-hanger control
- Konami background motion is 50% faster

Version 68 refinement:
- quote generator now rotates each fragment family independently and remembers 160 complete outputs
- corrected generated grammar and removed a redundant phrase
- first mobile sound effect waits for Web Audio to resume rather than being silently lost


Version 69: renamed the game to BOXXY — Pushbox Puzzle, and the selectable characters to Indi and Olive.


V82 COLLECTIONS
----------------
The collection switcher was introduced here. It remains temporarily disabled in Version 95 while the Ink character artwork is rebuilt.

VERSION 92
----------
- The H. Ink Paper & Puzzle skin is temporarily switched off. BOXXY now opens and remains in the Bauhaus Collection while the Ink artwork is reconsidered.
- Completing level 50 now opens a dedicated congratulations modal for finishing all 50 levels.
- Added a hidden Level Maker.

Hidden Level Maker
- Click the first X in the BOXXY title five times.
- Then press the X key on the keyboard.
- Draw with wall, floor, player, box, goal, combined goal and void tools.
- Grid dimensions can be changed from 3 × 3 up to 24 × 24.
- Existing Sokoban/XSB text levels can be pasted into the text area and imported.
- COPY LEVEL exports the current design in standard Sokoban text format.
- TEST LEVEL loads the design into the full BOXXY board with moves, pushes, undo and restart available.
- During a test, use the floating LEVEL MAKER button to return to editing, or EXIT TEST to return to the main collection.

VERSION 93
----------
- Reduced the Level Maker heading and reorganised the workshop so the complete editor fits without unnecessary modal scrolling on a normal desktop display.
- Added GENERATE NEW LEVEL with width, height and box-count controls.
- TESTED generation constructs a puzzle from a reversible solution path and verifies that path before showing the level. It may take longer than unchecked generation.
- SQUARE generation keeps the outside walls as a clean rectangular quadrilateral. With SQUARE off, the generator may create an irregular outer shape.
- Added local saved levels. Enter an optional name and press SAVE LEVEL.
- The saved-level drop-down lists every saved design with its dimensions and box count.
- Saved designs can be loaded, edited, updated and deleted. They are stored locally in the browser.


Version 94:
- The Generate New Level panel now matches the Saved Levels panel width.
- Paste or Export Level spans the full combined height of those two panels.
- The level text area expands to use the available space.


VERSION 95
----------
- Rebuilt Generate New Level terrain creation to produce much greater structural variety.
- Generated boards now use major dividing walls with doorways plus shorter wall motifs such as bars, corners, T-shapes, steps and zigzags.
- Large empty rectangles are broken up into rooms, paths, junctions and working areas.
- Terrain generation checks that all floor remains connected, rejects three-sided dead pockets and preserves enough straight working lanes for boxes.
- SQUARE still means a clean rectangular outside wall; its interior can now contain substantial room and corridor structure.
- Non-square generation retains irregular outside silhouettes and now receives the same richer internal structure.
- Goal placement is more varied, with a preference for walls and occasional connected goal patterns.
- TESTED generation still builds backwards from a solved state, but now favours changes of box and pushing direction rather than relying on long repetitive straight pushes.


VERSION 96
----------
- Completing level 50 now opens a dedicated end-of-pack congratulations screen.
- The message confirms that the full 50-level pack has been completed and retains the final level move and push totals.
- Added three visual placeholder choices for future level packs. These are ready to be replaced with uploaded artwork and collection data.
- Selecting a placeholder clearly explains that the pack has not yet been installed.
- The existing CHOOSE A LEVEL action remains available beneath the future-pack choices.

VERSION 97
----------
- The BAUHAUS COLLECTION heading is now a button that opens the puzzle-pack chooser.
- Added three uploaded packs alongside the original 50-level Microban Series:
  - Chrysalis Variations — 113 levels — David Buchweitz and Jordi Domènech.
  - Haikemono — 35 levels — Jordi Domènech.
  - Small Chessboards — 40 levels — Jordi Domènech.
- Each pack keeps its own current level, unlocked levels, completion history and best scores.
- Completing the last level of any pack now offers the other installed packs directly rather than placeholders.
- The level chooser is scrollable for collections containing more than 50 levels.
- The Level Maker window is larger on desktop, and its board automatically scales to the available workshop area.
- Editor squares have a maximum size, so small maps remain sensibly proportioned rather than filling the window.
- BOX + GOAL now shows a large visible goal ring around a smaller red box, both in the toolbar and on the editor board.

LEVEL-PACK CREDITS AND DISTRIBUTION
-----------------------------------
The original uploaded text files are included unchanged in the level-packs folder and contain the full author notes and licence terms.

Chrysalis Variations is copyright David Buchweitz and Jordi Domènech.
Haikemono and Small Chessboards are copyright Jordi Domènech.
The supplied files state that the collections may be distributed unchanged for non-commercial use with attribution and author notification under Creative Commons Attribution-NonCommercial-NoDerivs 3.0 Unported. Anyone publishing or redistributing this build should read the original files and follow those terms, including notifying the authors where required.


VERSION 98
----------
- Removed the dormant INK theme and all of its assets from the live build.
- Consolidated five JavaScript files into boxxy.js and two data files into data.js without embedding them in index.html.
- Replaced the three separate goal/crate PNG files with one lossless board-atlas PNG.
- Removed duplicate copies of the imported level-map text. All layouts, names, authors and comments remain in data.js; unique credits and licence notes are retained in CREDITS-AND-LICENCES.txt.
- The Level Maker card now uses border-box viewport sizing, zero horizontal overflow and min-width-safe grid columns.
- On desktop and tablet widths the full workshop stays in one modal window; the board recalculates its cell size to fit the remaining bay and retains its 56 px maximum.
- Narrow phone layouts may scroll vertically, but never sideways.
- The original BOXXY 50-level pack retains all 50 stored walkthroughs.
- The three imported packs contain no move-sequence data in their supplied files. No unverified or fabricated walkthroughs have been inserted.


VERSION 99
----------
- The three additional puzzle packs are locked until the original 50-level Microban Series has been completed.
- Locked packs remain visible in the Bauhaus Collection chooser and clearly state the unlock requirement.
- Completing level 50 permanently unlocks Chrysalis Variations, Haikemono and Small Chessboards in that browser.
- Existing players who had already completed level 50 are detected automatically from their saved completion or best-score data.
- A previously selected additional pack is safely replaced by Microban on startup while the additional packs are still locked; its saved progress is preserved.


VERSION 100
-----------
- Added an unrestricted OPEN EXISTING PUZZLE browser inside the hidden Level Maker.
- All four installed packs and every puzzle are available in this backend tool even when the additional packs remain locked in normal play.
- Existing puzzles up to 36 × 36 can be loaded, edited, exported and tested.
- Corrected the LOCKED stamp so it remains dark and readable on the blue puzzle-pack artwork.
- No Chrysalis walkthrough strings were added: sokoban-solver.com visibly plays stored solutions, but a directly reusable text sequence or public data endpoint was not immediately exposed.


Version 101 — integrated Level Maker solver
- SOLVE PUZZLE opens a dedicated backend solver dialogue.
- SOLVE THIS PUZZLE runs the original BOXXY Sokoban Solver core in a Web Worker.
- Successful routes are verified, displayed as a mixed-case UDLR string and attached automatically.
- Uppercase letters in the displayed route mark pushes; the game accepts either case during playback.
- Testing the editor puzzle then supports the existing five-click character + S walkthrough.
- Solutions found for installed pack levels are stored locally and used when that level is later opened in normal play.
- Saved custom levels retain a matching solver route in their local save record.


Version 102 — stronger dense-puzzle solver
-------------------------------------------
- Replaced the single forward-only search with a two-phase solver.
- Dense puzzles are first constructed backwards from the completed goal arrangement. Every reverse state retained by this phase has a known route back to all goals, avoiding the large number of doomed forward positions that overwhelmed chessboard puzzles.
- Added recursive freeze detection for larger mutually blocked box groups, alongside the existing static dead-square and 2 × 2 checks.
- Removed per-candidate walking-string construction from the search loop. Walking paths are now reconstructed only after the push route has been found.
- Large-box heuristics use a faster two-sided push-distance estimate; smaller puzzles retain exact minimum-cost box-to-goal matching.
- If reverse construction does not find the initial state, the solver automatically continues with forward weighted A*.
- The solver dialogue now identifies the current phase and reports push depth and estimated remaining displacement.
- Verified all 50 Microban levels and Small Chessboards levels 1–9 with the new engine.


VERSION 103 — ASSISTED COMPLETIONS
-----------------------------------
- A puzzle completed by the front-end hidden walkthrough now unlocks the next puzzle normally.
- Walkthrough-assisted completions are stored separately and shown in yellow in the level chooser.
- Solving the same puzzle manually later upgrades its level button from yellow to green.
- Assisted completion of the final puzzle still completes the pack and unlocks subsequent packs.


VERSION 104 — EXACT-PATTERN DENSE SEARCH
-----------------------------------------
- Preserved the fast reverse-construction search used successfully by the earlier chessboard levels.
- Added a second reverse phase for dense layouts when the fast pass cannot reproduce the starting arrangement.
- This phase evaluates the complete box pattern with exact minimum-cost matching rather than treating boxes only as individually close to useful squares.
- Reverse states are generated from the solved goal arrangement, so every retained state already has a valid route to completion; this avoids large classes of forward dead ends.
- The existing forward fallback still prunes static dead squares, impossible box-to-goal assignments, 2 × 2 blocks and recursively frozen box groups.
- Small Chessboards level 10 is now solved and verified by the integrated engine. A local reference run found a 73-push, 594-move route in roughly 30 seconds; timing varies by browser and hardware.
- Rechecked Small Chessboards levels 1–10 after the change, including validation by replaying every returned string against the original map.


VERSION 107
- Fixed a runtime error in exact-pattern reverse A* progress reporting: closestForwardId was referenced from the wrong search phase.
- Reverse A* now tracks its own closest state and reports exact starting-pattern matches.
- Solver progress now labels generated nodes as push states. The engine already canonicalises all player positions within the same reachable area, so a clear 20-step walk does not create 20 search nodes; walking is reconstructed only after the push route is found.


Version 108 — productive bidirectional solver
- Long player walks are canonicalised as one reachable-region state; only box pushes branch the main search.
- Reverse A* now retains its verified frontier instead of discarding it after a failed exact match.
- A new forward phase searches for an exact join with that reverse frontier. A join gives a complete verified route immediately.
- Progress-aware pruning limits repeated states in the same structural basin and prunes branches that make no assignment, goal, connectivity, mobility or access progress for too long.
- Immobile box-cluster pruning is now also applied in the main forward search.
- The closest-position report penalises stagnant branches and reports how many pushes have passed since structural progress.
- Search diagnostics show productive-bridge work, stagnant branches pruned and successful forward/reverse joins.
- This remains a solution-finding search rather than an optimality proof; temporary detours are allowed within a bounded plateau allowance.


BOXXY v110 solver update
-------------------------
- Removed the separate external-solver source folder and all related references.
- Solver searches no longer stop automatically at a time or generated-state allowance. A search runs until it finds and verifies a solution, exhausts the reachable push-state graph, or the user presses Cancel Search.
- Specialist portfolio phases retain bounded working sets so they hand control to continuous forward search instead of consuming all memory indefinitely.
- The progress bar is indeterminate rather than pretending a long search has a meaningful percentage.
- The closest forward-reachable position is visible from the beginning and updates live whenever search finds a stronger position. Its partial route and phase diagnostics update with it.
- A two-note completion chime plays when a solution has been found and verified.
- Large dense puzzles use a more solution-first weighted search. Structural changes reduce stagnation rather than being penalised merely because goal distance did not immediately improve.
- Clear player walking remains collapsed into one reachability state; only changed box positions branch the search.


BOXXY v111 solver stability update
----------------------------------
- Long solver runs now have unlimited elapsed time but bounded resident memory.
- The resident-state allowance scales down automatically for puzzles with many boxes.
- The forward search compacts its best active frontier and preserves complete parent paths instead of retaining every generated position forever.
- The solver dialogue reports resident states, the memory allowance, and the number of memory compactions.
- Reverse, bounded and feature-search phases now share the same browser-safe state budget.
- Large heuristic caches are periodically released.
- Once the forward/reverse bridge phase ends, its reverse frontier is explicitly released.
- A background worker error no longer launches the same heavy search on the main UI thread. This keeps the game page alive if a worker fails.
- A small progress snapshot is written every five seconds. If the browser tab ends unexpectedly, reopening Solve Puzzle reports the last phase and closest recorded position.
- Existing authored Microban solutions remain unchanged and validated.


BOXXY v112 safe-search update
------------------------------
- Replaced heuristic frontier compaction with complete push-based iterative deepening.
- Long walking routes remain collapsed into one player-reachability state.
- Prunes only proven deadlocks, exact route cycles and exact repeated push states.
- Duplicate and heuristic caches are disposable: clearing them repeats work but cannot remove a solution route.
- Search runs until solved, exhausted or cancelled.



BOXXY v113 FESS and structural-deadlock rebuild
------------------------------------------------
- Replaced the old five-global-queue "feature-space" approximation with cyclic FESS feature cells.
- Feature cells now use safely packed boxes, assignment distance, free-space connectivity, room connectivity, hotspots and mobility.
- Packing, assignment, connectivity, room, hotspot, explorer and opener advisors nominate moves. Non-advisor moves receive a larger scheduling weight but are retained, so guidance cannot hide a solution route.
- "Closest position" no longer ranks raw goals occupied first. A box on a goal is not treated as safely packed unless it is proven immovable there.
- Added conservative fixed-box analysis, sealed-component box/goal balance and dynamic bipartite box-to-goal matching with fixed boxes treated as permanent walls.
- The same structural proofs run in FESS and in the complete safe iterative-deepening fallback.
- Added separate diagnostics for dynamic matching, sealed regions, frozen structures, advisor-ranked moves and retained non-advisor moves.
- Dense browser searches now begin directly with FESS rather than the older reverse/bounded specialist portfolio that repeatedly converged on the same 26-goal plateau on Small Chessboards level 38.
- Added solver-core analyseDeadlocks() for repeatable regression tests of supplied dead positions.
- Complete safe iterative deepening now records states proved dead without a threshold cutoff and propagates that proof to their parents; later revisits are skipped.
- Included solver-regression-tests.js covering stored Microban route replay, frozen corners, dynamic matching, exact optimistic corrals, dead-descendant propagation and the Small Chessboards 38 starting position.


BOXXY v114 — pure FESS solver rebuild
--------------------------------------
- Replaced the entire v113 solver algorithm. No reverse solver, A*, IDA*, bounded-search portfolio or safe-search fallback remains in solver-core.js or solver-worker.js.
- Kept the existing game, Level Maker interface, artwork, animation, audio, controls and responsive layout unchanged.
- Uses one domain-state tree projected into FESS cells defined by parking-order packing, free-space connectivity, room obstruction and out-of-plan boxes.
- Each selected cell expands its least accumulated-weight unexpanded same-box macro move. The search alternates broad cyclic cell coverage with the strongest FESS cell found so far.
- Packing, connectivity, room, hotspot, out-of-plan, opener and explorer advisors assign move weight 0. Every other non-dead macro remains available with weight 1.
- Parking order is generated from a retrograde target-peeling plan, with constrained targets placed earlier inside simultaneous groups. Raw target occupation is reported separately from the FESS packing score.
- Hotspots are calculated as boxes that remove target routes from other boxes. Blocker maps are generated lazily and cached only for squares actually occupied during search.
- Player walking positions in the same reachable region are canonicalised into one state. Complete same-box push sequences are generated as macro moves and walking is reconstructed in the returned route.
- Exact transpositions reuse feature scores and deadlock results. A newly found lower accumulated weight requeues that state’s remaining macro moves at the improved priority.
- Pruning is limited to structural dead squares, solid 2 × 2 blocks, impossible complete box-to-goal matching, and states whose complete descendants have been proved dead.
- Added a v114 regression suite covering all 238 supplied starting boards, all 50 stored Microban routes, fresh FESS solves of all 50 authored levels, structural deadlocks, dead-descendant propagation and a dense Small Chessboards 38 stress run.


BOXXY v116 solver correction
-----------------------------
- Replaced unbounded solver storage with compact memory-bounded push states.
- Added the first conservative corral proof.

BOXXY v117 deadlock engine
---------------------------
- Replaced the narrow corral check with a generic deadlock gate applied after every push.
- Added mutually frozen-group detection and dynamic matching with frozen goal boxes treated as walls.
- Added lazy maze-specific exact pattern tables for local wall/goal/box configurations.
- Added general exact corral-opening searches and exact articulation-room release searches.
- Retained static dead-square, 2 x 2 and complete bipartite matching checks.
- Backward pull reachability is used only for valid structural tests such as dead-square and box-to-goal reachability; the puzzle is still solved forward by FESS.
- Any bounded sub-search that is not exhausted returns unknown and does not prune the branch.


BOXXY v118 adaptive-memory solver
----------------------------------
- Removed v117's small fixed 180,000-state ceiling for dense puzzles.
- Added device-aware resident-state allowances: high-memory desktop systems can search up to 900,000 dense states, 1,250,000 medium states or 1,800,000 small-puzzle states.
- Compact typed-array storage now grows in stages instead of allocating the full allowance immediately.
- Replaced the global JavaScript string transposition Set with a compact typed-array hash table. Hash matches are verified against the complete stored box arrangement and canonical player region before a state is treated as a duplicate.
- Fixed stale v116 cache tags on the v117 HTML and worker URLs. All v118 solver and application files use v118 cache tags.
- A requested unlimited solve now receives a 12-hour time allowance rather than silently stopping after ten minutes.
- The progress display reports the current device's state allowance, and a limit result identifies whether memory or time was reached.


BOXXY v119 fixed-store memory rebuild
--------------------------------------
- Replaced v118's expanding state arrays with one fixed compact allocation. The worker no longer copies the entire search into larger arrays while both old and new stores are resident.
- Replaced transposition-table growth and rehashing with one correctly sized exact table allocated at startup.
- Uses 8-bit board positions whenever the board contains no more than 256 squares, halving box-state storage on the dense Small Chessboards test.
- Reuses parent and child reachability workspaces rather than allocating new masks, queues and visited arrays for every candidate push.
- Reuses matching, connectivity and freeze-analysis workspaces. Box-to-goal matching no longer creates a fresh visited array for every augmenting path.
- Novel states pass through the complete deadlock gate after transposition rejection, but are no longer retained a second time as long JavaScript deadlock-cache strings.
- High-memory desktop allowance for 32+ box puzzles is now 2,000,000 states. The fixed compact store for Small Chessboards 38 is approximately 182 MB.
- Progress now reports the fixed-store size as well as the state allowance.
- All application and worker cache tags are v119.

BOXXY v120 maze-subset deadlock correction
-------------------------------------------
- Added a separate maze-subset proof that retains boxes already standing on goals. This corrects the earlier blind spot without making the older permissive local-window proof over-aggressive.
- Added generic maze-specific connected-subset analysis for groups of two, three and four neighbouring boxes, including diagonal neighbours.
- Other boxes are removed during this proof, giving the selected group more freedom. A dead result is therefore accepted only when the easier subproblem is itself dead.
- For two- and three-box groups, the proof follows legal pushes recursively and rejects a state when every continuation reaches a structural deadlock. Four-box groups use a conservative one-ply proof; an unproved continuation returns unknown.
- Replaced the earlier simplified frozen-set pass with recursive horizontal-and-vertical freeze analysis.
- Added the supplied locked Small Chessboards 12 position as a mandatory regression. It is classified as maze-subset-deadlock and rejected with zero generated FESS states.
- Replayed all 50 stored Microban solutions and checked the deadlock gate after all 759 pushes along those known-solvable routes.
- All 238 supplied starting boards remain accepted, and all 50 Microban levels are solved afresh by FESS.
- Small Chessboards 12 and 38 are not claimed solved by this release. The change is dead-branch rejection, not a claimed solution to either large puzzle.
- Current application and worker cache tags are v120.

Algorithm references
--------------------
- Tristan Cazenave, "Sokoban Deadlocks": maze-specific deadlocks represented by box positions and player access, with combinations learned dead when every legal move reaches an already known deadlock.
- Festival/FESS paper: deadlock matching is a move-generation gate separate from feature-space ordering; local, corral, matching, retrograde and room analyses are used to reject proved dead branches.
- Sokoshell freeze-deadlock implementation: recursive two-axis blocking with the box under test temporarily treated as a wall.

v121 RUST/WASM SOLVER INTEGRATION
- Replaced BOXXY's experimental JavaScript solver worker with the browser-ready
  Rust/WebAssembly solver from dangarfield/sokoban-solver.
- The engine runs in a module Web Worker and returns its route to BOXXY's existing
  solution attachment and guided-playback system.
- The engine module is loaded from the upstream GitHub Pages deployment, so an
  internet connection is required when solving. Normal play remains local.
- The completion heading for assisted play is now "GUIDED SOLVE" rather than
  "WALKTHROUGH USED", preventing the heading from being cropped.
