BOXXY — Pushbox Puzzle

Open index.html in a web browser.

Files
- index.html: interface only
- styles.css: visual design
- game.js: game engine and controls
- levels.js: all 50 level layouts, solutions and metadata
- assets/: character, crate and target artwork

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
