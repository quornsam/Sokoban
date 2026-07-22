# BOXXY — Pushbox Puzzle

Copyright © 2026 Sam Cornwell. All rights reserved.

BOXXY is a proprietary, source-available Sokoban game. The repository is public so the browser game can be hosted through GitHub Pages; that does not make BOXXY open-source.

Personal, non-commercial play and private experimentation are permitted under [LICENSE.md](LICENSE.md). Commercial exploitation, republication, redistribution as another game or website, and extraction of BOXXY artwork, interface assets, audio or original puzzle content require prior written permission.

Third-party puzzle collections and the externally loaded solver are not owned by Sam Cornwell. Their details and separate terms are listed in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Play

The live GitHub Pages build is intended to be published from the repository root.

## Current release: v142


### v142 compact movement controls and attire placement

- Changes the direction pad to a compact two-row layout: Up above, with Left, Down and Right beneath.
- Removes the attire button from the centre of the arrows.
- Places the attire control beside the direction pad on desktop and tablet screens.
- Places attire inside the Choose Level panel on phone layouts, including short mobile landscape.
- Narrows the left and right mobile action columns so the movement buttons can be substantially larger.
- Keeps action labels contained inside their buttons on compact screens.

### v141 older-iPad character stability and movement controls

- Fixes a character-disappearance issue reported by **AngeM** on an older iPad mini.
- Uses compact character sprite sheets on touch devices and loads only the active character body, substantially reducing Safari memory pressure.
- Displays gameplay characters as cached images rather than a canvas that WebKit may discard.
- Includes an immediate per-frame fallback image, so the character remains visible even if Safari cannot rebuild a customised frame.
- Repaints the character after page restoration and visibility changes.
- Moves the idle bob animation away from the zero-height player container to avoid an older-WebKit compositing failure.
- Makes the directional pad and arrow buttons substantially larger across desktop, tablet, phone and short landscape layouts.

### v140 pack display correction

- BOXXY Original now uses the red pack colour.
- Chrysalis Variations now uses green.
- Non-Microban level credits calculate the real number of boxes from the board instead of displaying the optional push-minimum field.

### v139 front-page pack update

- Adds **BOXXY Original Puzzle Pack of 50 Levels** by Sam Cornwell as the first and default puzzle pack.
- Keeps **Microban Series** unlocked from the start.
- Completing either BOXXY Original or Microban unlocks every additional collection.
- Existing per-pack progress remains stored separately.

This release adds:

- a discreet **BOXXY version 139** label on the Legal page;
- per-puzzle display names inside Pack Builder drafts, independent of the linked Level Maker save name;
- a pack-wide default author with optional individual puzzle-author overrides;
- selectable Pack Builder card layouts from **1 to 8 columns**;
- direct **EDIT** and **PLAY** controls on saved-library and ordered-pack cards;
- verified solution move counts on every solved card;
- exported per-level author and solution-move metadata;
- preservation of custom pack names and authors when linked layouts or solutions synchronise from the Level Maker;
- all v137 saved-position functionality unchanged.


## Main files

- `index.html`, `styles.css`, `boxxy.js` — game and Level Maker
- `data.js` — built-in puzzle-pack data and metadata
- `level-packs/boxxy-original-puzzle-pack-of-50-levels.js` — Sam Cornwell’s 50-level BOXXY Original collection
- `pack-builder.js` — private Level Pack and Daily Puzzle workspaces
- `solver-worker.js` — loader and adapter for the external Rust/WebAssembly solver
- `solver-route-verifier.js` — independent verification of returned routes
- `legal.html` — public-facing legal information
- `LICENSE.md` — BOXXY proprietary source licence
- `THIRD-PARTY-NOTICES.md` — material not owned by Sam Cornwell
- `TERMS-OF-USE.md` — website and game terms
- `PRIVACY.md` — local storage and external network requests

## Local browser storage

Campaign progress, saved gameplay positions, Level Maker saves, pack drafts and Daily Puzzle drafts are stored in the browser. They are not committed to GitHub automatically. Clearing site data may delete them.

## Hidden tools

The Level Maker and pack-building tools are intended for the project owner. Their presence in client-side code does not grant permission to copy, publish or commercially exploit BOXXY.

## Rights and permissions

Commercial or republication enquiries should be directed to Sam Cornwell through the `quornsam` GitHub profile.
