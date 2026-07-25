BOXXY v169 — Random completion sprites

This update adds the two supplied Happy BOXXY sprite sheets to the level-complete modal.

Files included:
- index.html
- boxxy.js
- styles.css
- assets/ui/completion/happy-boxxy-sprites-1.png
- assets/ui/completion/happy-boxxy-sprites-2.png

Behaviour:
- One sprite is selected randomly whenever a completion modal opens.
- The same sprite will not be selected twice in immediate succession.
- Both sheets are preloaded to avoid a first-use image flash.
- The supplied sheets contain 15 visible cells each, so the update uses 30 sprites in total.

Install by copying the contents of this folder into the repository root and allowing the files to overwrite matching files.
