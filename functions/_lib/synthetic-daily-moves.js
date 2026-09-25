/* BOXXY v375 — derive varied, provably playable move counts from prepared Daily solutions.
   Generated counts include reversible walking detours only: never unverified moves or pushes. */
const DIRECTIONS = Object.freeze({
  l: [-1, 0, "r"], r: [1, 0, "l"], u: [0, -1, "d"], d: [0, 1, "u"]
});

function cell(x, y) { return `${x},${y}`; }
function clampRandom(random) {
  const value = Number(random());
  return Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : 0.5;
}

/* Validate the canonical route and locate positions where a harmless two-step
   out-and-back walk can be added without moving boxes or changing the solution. */
export function analyseDailySolution(puzzle) {
  const layout = puzzle?.layout;
  const solution = String(puzzle?.solution || "");
  if (!Array.isArray(layout) || !layout.length || !solution) {
    throw new Error("This Daily has no complete layout and stored solution.");
  }
  const floors = new Set(), goals = new Set(), boxes = new Set();
  let player = null;
  for (let y = 0; y < layout.length; y++) {
    for (let x = 0; x < layout[y].length; x++) {
      const value = layout[y][x], key = cell(x, y);
      if (value === "#") continue;
      floors.add(key);
      if (".+*".includes(value)) goals.add(key);
      if (value === "$" || value === "*") boxes.add(key);
      if (value === "@" || value === "+") {
        if (player) throw new Error("The Daily layout contains multiple players.");
        player = [x, y];
      }
    }
  }
  if (!player || !boxes.size || boxes.size !== goals.size) {
    throw new Error("The Daily layout is missing a player, boxes or matching targets.");
  }
  const boxCount = boxes.size;
  const anchors = [];
  for (let i = 0; i < solution.length; i++) {
    const step = solution[i], vector = DIRECTIONS[step.toLowerCase()];
    if (!vector) throw new Error("The stored solution contains an invalid movement.");
    const [x, y] = player;
    const reverseSteps = [];
    for (const [direction, [dx, dy, back]] of Object.entries(DIRECTIONS)) {
      const next = cell(x + dx, y + dy);
      if (floors.has(next) && !boxes.has(next)) reverseSteps.push(direction + back);
    }
    if (reverseSteps.length) anchors.push({ index: i, pairs: reverseSteps });
    const [dx, dy] = vector;
    const next = cell(x + dx, y + dy);
    if (!floors.has(next)) throw new Error("The stored solution walks into a wall.");
    if (step !== step.toLowerCase()) {
      if (!boxes.has(next)) throw new Error("The stored solution attempts a push without a box.");
      const beyond = cell(x + dx * 2, y + dy * 2);
      if (!floors.has(beyond) || boxes.has(beyond)) {
        throw new Error("The stored solution attempts a blocked push.");
      }
      boxes.delete(next);
      boxes.add(beyond);
    } else if (boxes.has(next)) {
      throw new Error("The stored solution walks into a box.");
    }
    player = [x + dx, y + dy];
  }
  if ([...boxes].some(position => !goals.has(position))) {
    throw new Error("The stored solution does not solve the Daily layout.");
  }
  return {
    solution, baseMoves: solution.length, boxCount, floorCount: floors.size,
    width: Math.max(...layout.map(row => row.length)), height: layout.length, anchors
  };
}

function chooseExtraPairs(analysis, random, usedMoves) {
  if (!analysis.anchors.length) return 0;
  const floorScale = Math.min(1.5, Math.sqrt(analysis.floorCount / 80));
  const boxScale = Math.min(2, Math.sqrt(analysis.boxCount / 6));
  const routeScale = Math.min(1.8, Math.sqrt(analysis.baseMoves / 160));
  // More floor area, boxes and a longer solution allow a wider spread.
  const fraction = Math.min(0.5, 0.08 + 0.10 * floorScale + 0.10 * boxScale + 0.06 * routeScale);
  const maximum = Math.max(1, Math.floor(analysis.baseMoves * fraction / 2));
  let chosen = 0;
  for (let attempt = 0; attempt < 12; attempt++) {
    const r = clampRandom(random);
    chosen = r < 0.07 ? 0 : 1 + Math.floor(Math.pow(clampRandom(random), 1.3) * maximum);
    chosen = Math.min(maximum, chosen);
    if (!usedMoves.has(analysis.baseMoves + chosen * 2)) return chosen;
  }
  // Prefer a nearby unused count when regenerating a group, but allow an
  // occasional matching score if every available count has been used.
  for (let offset = 0; offset <= maximum; offset++) {
    const next = (chosen + offset) % (maximum + 1);
    if (!usedMoves.has(analysis.baseMoves + next * 2)) return next;
  }
  return chosen;
}

/* The route itself is constructed rather than assuming that adding an arbitrary
   number to the optimum produces a legal move count. Each detour is two free
   walking moves at a position validated above; pushes and goal state are intact. */
export function generateDailySyntheticRoute(analysis, { random = Math.random, usedMoves = new Set() } = {}) {
  if (!analysis || !analysis.solution) throw new Error("A validated Daily solution is required.");
  const pairs = chooseExtraPairs(analysis, random, usedMoves);
  if (!pairs) return { route: analysis.solution, moves: analysis.baseMoves, extraMoves: 0 };
  const inserts = new Map();
  for (let i = 0; i < pairs; i++) {
    const anchor = analysis.anchors[Math.floor(clampRandom(random) * analysis.anchors.length)];
    const pair = anchor.pairs[Math.floor(clampRandom(random) * anchor.pairs.length)];
    inserts.set(anchor.index, (inserts.get(anchor.index) || "") + pair);
  }
  let route = "";
  for (let i = 0; i < analysis.solution.length; i++) {
    route += (inserts.get(i) || "") + analysis.solution[i];
  }
  return { route, moves: route.length, extraMoves: route.length - analysis.baseMoves };
}
