/* BOXXY v126 route verifier.
 * Replays a solver result against the original XSB board before it may be saved.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BoxxyRouteVerifier = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DELTAS = {
    u: [0, -1],
    d: [0, 1],
    l: [-1, 0],
    r: [1, 0]
  };

  function cleanRoute(route) {
    return String(route ?? "").replace(/\s/g, "");
  }

  function parseLevel(levelText) {
    const lines = String(levelText ?? "")
      .replace(/\r/g, "")
      .split("\n")
      .map(line => line.replace(/\s+$/g, ""))
      .filter(line => line.length > 0);

    if (!lines.length) return { ok: false, error: "The level is empty." };
    const width = Math.max(...lines.map(line => line.length));
    const height = lines.length;
    const walls = new Set();
    const goals = new Set();
    const boxes = new Set();
    const voids = new Set();
    let player = null;
    let playerCount = 0;

    const key = (x, y) => `${x},${y}`;
    const chars = lines.map(line => line.padEnd(width, " ").split(""));

    // XSB uses spaces both for floor and for padding outside an irregular map.
    // Match BOXXY's own importer by flood-filling boundary spaces as void.
    const outsideQueue = [];
    const addOutside = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height || chars[y][x] !== " ") return;
      const id = key(x, y);
      if (voids.has(id)) return;
      voids.add(id);
      outsideQueue.push([x, y]);
    };
    for (let x = 0; x < width; x++) {
      addOutside(x, 0);
      addOutside(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      addOutside(0, y);
      addOutside(width - 1, y);
    }
    for (let i = 0; i < outsideQueue.length; i++) {
      const [x, y] = outsideQueue[i];
      addOutside(x - 1, y);
      addOutside(x + 1, y);
      addOutside(x, y - 1);
      addOutside(x, y + 1);
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ch = chars[y][x];
        const id = key(x, y);
        if (ch === "#") walls.add(id);
        if (ch === "." || ch === "*" || ch === "+") goals.add(id);
        if (ch === "$" || ch === "*") boxes.add(id);
        if (ch === "@" || ch === "+") {
          player = [x, y];
          playerCount++;
        }
      }
    }

    if (playerCount !== 1 || !player) return { ok: false, error: `The level has ${playerCount} players; exactly one is required.` };
    if (!boxes.size) return { ok: false, error: "The level has no boxes." };
    if (boxes.size !== goals.size) return { ok: false, error: `The level has ${boxes.size} boxes and ${goals.size} goals.` };

    return { ok: true, width, height, walls, voids, goals, boxes, player, key };
  }

  function verify(levelText, route) {
    const parsed = parseLevel(levelText);
    if (!parsed.ok) return { valid: false, solved: false, route: "", moves: 0, pushes: 0, error: parsed.error };

    const clean = cleanRoute(route);
    const invalid = clean.match(/[^udlrUDLR]/);
    if (invalid) {
      return { valid: false, solved: false, route: "", moves: 0, pushes: 0, error: `The route contains an invalid character: ${JSON.stringify(invalid[0])}.` };
    }

    const boxes = new Set(parsed.boxes);
    let [px, py] = parsed.player;
    let pushes = 0;
    let canonical = "";

    const blocked = (x, y) => x < 0 || y < 0 || x >= parsed.width || y >= parsed.height || parsed.walls.has(parsed.key(x, y)) || parsed.voids.has(parsed.key(x, y));

    for (let i = 0; i < clean.length; i++) {
      const lower = clean[i].toLowerCase();
      const delta = DELTAS[lower];
      if (!delta) continue;
      const [dx, dy] = delta;
      const nx = px + dx;
      const ny = py + dy;
      const nextKey = parsed.key(nx, ny);

      if (blocked(nx, ny)) {
        return { valid: false, solved: false, route: canonical, moves: i, pushes, error: `Move ${i + 1} walks into a wall or outside the board.` };
      }

      let pushed = false;
      if (boxes.has(nextKey)) {
        const bx = nx + dx;
        const by = ny + dy;
        const beyondKey = parsed.key(bx, by);
        if (blocked(bx, by) || boxes.has(beyondKey)) {
          return { valid: false, solved: false, route: canonical, moves: i, pushes, error: `Move ${i + 1} attempts an illegal push.` };
        }
        boxes.delete(nextKey);
        boxes.add(beyondKey);
        pushes++;
        pushed = true;
      }

      px = nx;
      py = ny;
      canonical += pushed ? lower.toUpperCase() : lower;
    }

    const solved = [...boxes].every(box => parsed.goals.has(box));
    return {
      valid: true,
      solved,
      route: canonical,
      moves: canonical.length,
      pushes,
      error: solved ? "" : "The route is legal but does not finish with every box on a goal."
    };
  }

  return { cleanRoute, parseLevel, verify };
});
