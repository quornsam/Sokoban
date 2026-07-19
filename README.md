# BOXXY — Pushbox Puzzle

Copyright © 2026 Sam Cornwell. All rights reserved.

BOXXY is a proprietary, source-available Sokoban game. The repository is public so the browser game can be hosted through GitHub Pages; that does not make BOXXY open-source.

Personal, non-commercial play and private experimentation are permitted under [LICENSE.md](LICENSE.md). Commercial exploitation, republication, redistribution as another game or website, and extraction of BOXXY artwork, interface assets, audio or original puzzle content require prior written permission.

Third-party puzzle collections and the externally loaded solver are not owned by Sam Cornwell. Their details and separate terms are listed in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Play

The live GitHub Pages build is intended to be published from the repository root.

## Current release: v135

This release adds:

- live insertion-style drag-and-drop in the Level Pack Builder;
- visible **SOLVED** and **UNSOLVED** status on every level card;
- a proprietary source licence;
- third-party notices;
- terms of use and privacy information;
- a public legal page linked from the game;
- a GitHub settings checklist for the repository owner.

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

Campaign progress, Level Maker saves, pack drafts and Daily Puzzle drafts are stored in the browser. They are not committed to GitHub automatically. Clearing site data may delete them.

## Hidden tools

The Level Maker and pack-building tools are intended for the project owner. Their presence in client-side code does not grant permission to copy, publish or commercially exploit BOXXY.

## Rights and permissions

Commercial or republication enquiries should be directed to Sam Cornwell through the `quornsam` GitHub profile.
