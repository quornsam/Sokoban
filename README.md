# BOXXY — Pushbox Puzzle

Copyright © 2026 Sam Cornwell. All rights reserved.

BOXXY is a proprietary, source-available Sokoban game. The repository is public so the browser game can be hosted through GitHub Pages; that does not make BOXXY open-source.

Personal, non-commercial play and private experimentation are permitted under [LICENSE.md](LICENSE.md). Commercial exploitation, republication, redistribution as another game or website, and extraction of BOXXY artwork, interface assets, audio or original puzzle content require prior written permission.

Third-party puzzle collections and the externally loaded solver are not owned by Sam Cornwell. Their details and separate terms are listed in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Play

The live GitHub Pages build is published from the repository root.

## Current release: v143

### v143 repository and asset cleanup

- Replaces the split `data.js` and separate BOXXY pack script with one readable `levels.js` file.
- Keeps the existing pack IDs, pack order, all 288 level records and saved-progress keys unchanged.
- Stores all five bundled collections together:
  - BOXXY Original Puzzle Pack — 50 levels
  - Microban Series — 50 levels
  - Chrysalis Variations — 113 levels
  - Haikemono — 35 levels
  - Small Chessboards — 40 levels
- Merges the small route verifier into `boxxy.js` and removes its standalone script.
- Removes legacy Ink-theme artwork, obsolete per-frame character layers, duplicate board images, duplicate music and old root-level sprites that the game did not load.
- Uses the efficient 300 × 260 character wardrobe sheets on every device and removes the duplicate 600 × 520 set.
- Retains the 24 simple fallback character images because they are the independent safety net for the older-iPad disappearance bug reported by AngeM.
- Removes the unnecessary character-sheet preloads from `index.html`.
- Consolidates third-party credits into `THIRD-PARTY-NOTICES.md`.

### v142 compact movement controls and attire placement

- Uses a compact two-row direction pad: Up above Left, Down and Right.
- Places attire separately on desktop and tablet, and inside Choose Level on phone layouts.
- Gives movement controls more room on compact screens without overlapping action labels.

### v141 older-iPad character stability

- Uses cached character images with an immediate independent fallback frame.
- Repaints the character after page restoration and visibility changes.
- Reduces Safari memory pressure and avoids the old zero-height-container animation issue.

## Repository structure

```text
assets/
  audio/cracked-ivory-drift.mp3
  board/board-atlas.png
  characters/
    boy/   (six wardrobe-layer sprite sheets)
    girl/  (six wardrobe-layer sprite sheets)
  characters-fallback/
    boy/   (12 independent emergency frames)
    girl/  (12 independent emergency frames)
  ui/boxxy-splash.png

index.html
styles.css
boxxy.js
levels.js
pack-builder.js
solver-worker.js
legal.html
README.md
LICENSE.md
TERMS-OF-USE.md
PRIVACY.md
THIRD-PARTY-NOTICES.md
```

## Why the character graphics are not one file

The wardrobe changes hair, skin, shirt, trousers and shoes independently, so those colour-mask layers must remain separately addressable. Each of the six files is already a sprite sheet containing all 12 poses; they are not 12 individual animation files.

Combining every layer into one very large atlas would not reduce decoded image memory and could exceed older iPad texture or canvas limits. The current arrangement is the smaller safe structure: six compact sheets per character, plus independent fallback frames that remain visible if Safari cannot compose a customised sprite.

## Main code files

- `index.html` — page structure and script loading
- `styles.css` — responsive interface and game styling
- `boxxy.js` — game, character renderer, Level Maker and route verification
- `levels.js` — the single source of truth for all five bundled level packs
- `pack-builder.js` — private Level Pack and Daily Puzzle workspaces
- `solver-worker.js` — loader and adapter for the external Rust/WebAssembly solver
- `legal.html` — public-facing legal information

## Browser storage and accounts

Game progress, saved gameplay positions, Level Maker saves, pack drafts and Daily Puzzle drafts are stored in the browser. Clearing site data may delete them. BOXXY v273 also adds optional Cloudflare D1 accounts that can synchronise supported game progress and settings between devices.

The v143 file cleanup does not change pack IDs, level source numbers or storage-key formats, so existing progress remains compatible.

## Privacy

BOXXY uses limited cookieless PostHog analytics and optional first-party accounts. Account data is stored through Cloudflare. See [PRIVACY.md](PRIVACY.md) for details.

## Hidden tools

The Level Maker and pack-building tools are intended for the project owner. Their presence in client-side code does not grant permission to copy, publish or commercially exploit BOXXY.

## Rights and permissions

Commercial or republication enquiries should be directed to Sam Cornwell through the `quornsam` GitHub profile.
