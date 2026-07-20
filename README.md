# BOXXY — Pushbox Puzzle

Copyright © 2026 Sam Cornwell. All rights reserved.

BOXXY is a proprietary, source-available Sokoban game. The repository is public so the browser game can be hosted through GitHub Pages; that does not make BOXXY open-source.

Personal, non-commercial play and private experimentation are permitted under [LICENSE.md](LICENSE.md). Commercial exploitation, republication, redistribution as another game or website, and extraction of BOXXY artwork, interface assets, audio or original puzzle content require prior written permission.

Third-party puzzle collections and the externally loaded solver are not owned by Sam Cornwell. Their details and separate terms are listed in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Play

The live GitHub Pages build is intended to be published from the repository root.

## Current release: v137

This release adds:

- a discreet **SAVE** checkpoint control beside Undo and Restart;
- **RESUME** when a saved position is available after restarting or reopening a level;
- per-level checkpoint storage, including position, boxes, move count, push count and elapsed time;
- automatic checkpoint removal when the level is completed;
- the v136 solution synchronisation fix for saved levels, pack drafts and Daily Puzzle entries;
- the v135 legal, licensing and insertion-style Pack Builder updates.


## Main files

- `index.html`, `styles.css`, `boxxy.js` — game and Level Maker
- `data.js` — built-in puzzle-pack data and metadata
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
