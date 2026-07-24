BOXXY v165 — brighter targets and reversed level text codes

Upload the contents of this folder to the root of the existing Sokoban repository.
Preserve the assets/board/goals/ folder structure.

Changed files:
- boxxy.js
- index.html
- 15 target sprite PNG files in assets/board/goals/

Changes:
- Every target circle now uses the bright face colour sampled from its matching box sprite.
- Target frames and proportions remain unchanged.
- Level text convention is reversed:
  lowercase letter = empty coloured target
  uppercase letter = box on that coloured target
- Player-on-coloured-target codes remain unchanged.
- Existing sprite preloading remains active, preventing first-use flashing.
