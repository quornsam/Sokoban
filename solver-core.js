/*
 * BOXXY Sokoban Solver Core v4.0.0
 *
 * Clean Feature Space Search (FESS) implementation for the BOXXY Level Maker.
 * The search follows Shoham & Schaeffer's FESS design:
 *   - one search tree in the Sokoban domain space;
 *   - projection of every state into a multi-dimensional feature-space cell;
 *   - cyclic coverage of all populated cells;
 *   - selection of the least accumulated-weight unexpanded move in each cell;
 *   - same-box macro moves as the domain-space move unit;
 *   - advisor moves receive weight 0, all other moves weight 1;
 *   - no move is pruned unless a deadlock is structurally proved;
 *   - transpositions are stored and dead descendants propagate to parents.
 *
 * XSB symbols:
 *   # wall, space floor, . goal, $ box, @ player,
 *   * box on goal, + player on goal, - or _ explicit floor
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SokobanCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DIRS = [
    { dx: 0, dy: -1, lower: 'u', upper: 'U', name: 'up' },
    { dx: 1, dy: 0, lower: 'r', upper: 'R', name: 'right' },
    { dx: 0, dy: 1, lower: 'd', upper: 'D', name: 'down' },
    { dx: -1, dy: 0, lower: 'l', upper: 'L', name: 'left' },
  ];
  const OPP = [2, 3, 0, 1];
  const INF = 1_000_000_000;

  class SolverError extends Error {
    constructor(message, code = 'SOLVER_ERROR') {
      super(message);
      this.name = 'SolverError';
      this.code = code;
    }
  }

  class MinHeap {
    constructor(compare) {
      this.items = [];
      this.compare = compare;
    }
    get size() { return this.items.length; }
    push(item) {
      const a = this.items;
      a.push(item);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (this.compare(a[p], item) <= 0) break;
        a[i] = a[p];
        i = p;
      }
      a[i] = item;
    }
    pop() {
      const a = this.items;
      if (!a.length) return null;
      const first = a[0];
      const last = a.pop();
      if (a.length && last !== undefined) {
        let i = 0;
        while (true) {
          const left = i * 2 + 1;
          if (left >= a.length) break;
          const right = left + 1;
          let child = left;
          if (right < a.length && this.compare(a[right], a[left]) < 0) child = right;
          if (this.compare(last, a[child]) <= 0) break;
          a[i] = a[child];
          i = child;
        }
        a[i] = last;
      }
      return first;
    }
  }

  function normaliseLevelText(text) {
    if (typeof text !== 'string') throw new SolverError('The level must be supplied as text.', 'INVALID_LEVEL');
    let lines = text.replace(/\r/g, '').split('\n').filter(line => !/^\s*;/.test(line));
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    if (!lines.length) throw new SolverError('The level is empty.', 'EMPTY_LEVEL');
    return lines;
  }

  function buildNeighbours(width, height, floor) {
    const neighbours = Array.from({ length: width * height }, () => new Int32Array([-1, -1, -1, -1]));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (!floor[p]) continue;
        if (y > 0 && floor[p - width]) neighbours[p][0] = p - width;
        if (x + 1 < width && floor[p + 1]) neighbours[p][1] = p + 1;
        if (y + 1 < height && floor[p + width]) neighbours[p][2] = p + width;
        if (x > 0 && floor[p - 1]) neighbours[p][3] = p - 1;
      }
    }
    return neighbours;
  }

  function parseLevel(text) {
    const lines = normaliseLevelText(text);
    const height = lines.length;
    const width = Math.max(...lines.map(line => line.length));
    if (width < 3 || height < 3) throw new SolverError('The level is too small to be a Sokoban board.', 'INVALID_LEVEL');

    const count = width * height;
    const raw = new Array(count).fill(' ');
    const valid = new Set([' ', '#', '.', '$', '@', '*', '+', '-', '_']);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < lines[y].length; x++) {
        const ch = lines[y][x];
        if (!valid.has(ch)) throw new SolverError(`Unsupported character ${JSON.stringify(ch)} at row ${y + 1}, column ${x + 1}.`, 'INVALID_CHARACTER');
        raw[y * width + x] = ch;
      }
    }

    // Blank space connected to the rectangular border is void, not floor.
    const outside = new Uint8Array(count);
    const queue = new Int32Array(count);
    let qh = 0;
    let qt = 0;
    const addOutside = pos => {
      if (pos < 0 || pos >= count || outside[pos] || raw[pos] !== ' ') return;
      outside[pos] = 1;
      queue[qt++] = pos;
    };
    for (let x = 0; x < width; x++) {
      addOutside(x);
      addOutside((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
      addOutside(y * width);
      addOutside(y * width + width - 1);
    }
    while (qh < qt) {
      const p = queue[qh++];
      const x = p % width;
      const y = Math.floor(p / width);
      if (y > 0) addOutside(p - width);
      if (x + 1 < width) addOutside(p + 1);
      if (y + 1 < height) addOutside(p + width);
      if (x > 0) addOutside(p - 1);
    }

    const floor = new Uint8Array(count);
    const goals = new Uint8Array(count);
    const boxes = [];
    let player = -1;
    let players = 0;
    for (let p = 0; p < count; p++) {
      const ch = raw[p];
      if (ch === '#' || (ch === ' ' && outside[p])) continue;
      floor[p] = 1;
      if (ch === '.' || ch === '*' || ch === '+') goals[p] = 1;
      if (ch === '$' || ch === '*') boxes.push(p);
      if (ch === '@' || ch === '+') {
        player = p;
        players++;
      }
    }

    if (players !== 1) throw new SolverError(`The level must contain exactly one player; found ${players}.`, 'PLAYER_COUNT');
    const goalList = [];
    for (let p = 0; p < count; p++) if (goals[p]) goalList.push(p);
    if (!boxes.length) throw new SolverError('The level contains no boxes.', 'NO_BOXES');
    if (boxes.length !== goalList.length) {
      throw new SolverError(`The level has ${boxes.length} box${boxes.length === 1 ? '' : 'es'} but ${goalList.length} goal${goalList.length === 1 ? '' : 's'}.`, 'BOX_GOAL_MISMATCH');
    }

    boxes.sort((a, b) => a - b);
    const board = {
      width,
      height,
      count,
      rawLines: lines.slice(),
      floor,
      goals,
      goalList,
      initialBoxes: boxes,
      initialPlayer: player,
      neighbours: buildNeighbours(width, height, floor),
      floorList: [],
      floorCount: 0,
      reverseDistances: [],
      deadSquares: new Uint8Array(count),
      roomLinks: new Uint8Array(count),
      goalRank: new Int32Array(count),
      transitValue: new Int32Array(count),
      targetReachCount: new Int16Array(count),
      hotspotLoss: Array(count).fill(null),
      hotspotComputed: new Uint8Array(count),
      packingGroups: [],
      featureCache: new Map(),
      deadlockCache: new Map(),
    };
    for (let p = 0; p < count; p++) if (floor[p]) board.floorList.push(p);
    board.floorCount = board.floorList.length;
    precomputeBoard(board);
    return board;
  }

  function buildPackingGroups(board) {
    const remaining = new Set(board.goalList);
    const peeled = [];
    while (remaining.size) {
      const group = [];
      for (const goal of remaining) {
        for (let d = 0; d < 4; d++) {
          const destination = board.neighbours[goal][d];
          const support = board.neighbours[goal][OPP[d]];
          if (destination < 0 || support < 0) continue;
          if (remaining.has(destination) || remaining.has(support)) continue;
          group.push(goal);
          break;
        }
      }
      if (!group.length) group.push(...remaining);
      for (const goal of group) remaining.delete(goal);
      peeled.push(group.sort((a, b) => a - b));
    }
    peeled.reverse();

    // A FESS parking plan is sequential rather than a raw target count. When
    // several targets are peelable at the same stage, order the more
    // constrained targets first. This remains advisor information only: a
    // different target order is never pruned from the domain search.
    const ordered = [];
    const goalIndex = new Map(board.goalList.map((goal, index) => [goal, index]));
    const reverseArea = new Int32Array(board.count);
    const degree = new Int8Array(board.count);
    for (const goal of board.goalList) {
      const index = goalIndex.get(goal);
      for (const p of board.floorList) if (board.reverseDistances[index][p] >= 0) reverseArea[goal]++;
      for (let d = 0; d < 4; d++) if (board.neighbours[goal][d] >= 0) degree[goal]++;
    }
    for (const group of peeled) {
      group.sort((a, b) => (reverseArea[a] - reverseArea[b]) ||
        (degree[a] - degree[b]) ||
        (board.roomLinks[b] - board.roomLinks[a]) ||
        (a - b));
      for (const goal of group) ordered.push([goal]);
    }
    return ordered;
  }

  function reverseReachWithWalls(board, goals, walls) {
    const seen = new Uint8Array(board.count);
    const queue = new Int32Array(board.count);
    let qh = 0;
    let qt = 0;
    for (const goal of goals) {
      if (walls[goal] || seen[goal]) continue;
      seen[goal] = 1;
      queue[qt++] = goal;
    }
    while (qh < qt) {
      const current = queue[qh++];
      for (let d = 0; d < 4; d++) {
        const predecessor = board.neighbours[current][OPP[d]];
        if (predecessor < 0 || walls[predecessor] || seen[predecessor]) continue;
        const support = board.neighbours[predecessor][OPP[d]];
        if (support < 0 || walls[support]) continue;
        seen[predecessor] = 1;
        queue[qt++] = predecessor;
      }
    }
    return seen;
  }

  function buildOutOfPlanReach(board) {
    const result = [];
    const parked = new Uint8Array(board.count);
    for (let stage = 0; stage < board.packingGroups.length; stage++) {
      const futureGoals = [];
      for (let g = stage; g < board.packingGroups.length; g++) futureGoals.push(...board.packingGroups[g]);
      result.push(reverseReachWithWalls(board, futureGoals, parked));
      for (const goal of board.packingGroups[stage]) parked[goal] = 1;
    }
    result.push(new Uint8Array(board.count));
    return result;
  }

  function getHotspotLoss(board, blocker) {
    if (board.hotspotComputed[blocker]) return board.hotspotLoss[blocker];
    board.hotspotComputed[blocker] = 1;
    if (board.goals[blocker] || board.deadSquares[blocker]) return null;

    const walls = new Uint8Array(board.count);
    walls[blocker] = 1;
    const reachableCounts = new Int16Array(board.count);
    for (const goal of board.goalList) {
      const reach = reverseReachWithWalls(board, [goal], walls);
      for (const p of board.floorList) if (reach[p]) reachableCounts[p]++;
    }
    const loss = new Uint16Array(board.count);
    let useful = false;
    for (const source of board.floorList) {
      if (source === blocker || board.goals[source]) continue;
      const delta = board.targetReachCount[source] - reachableCounts[source];
      if (delta > 0) {
        loss[source] = delta;
        useful = true;
      }
    }
    if (useful) board.hotspotLoss[blocker] = loss;
    return board.hotspotLoss[blocker];
  }

  function precomputeBoard(board) {
    // Static reverse-pull reachability. It supplies structural dead squares,
    // packing information and FESS features; it is not an A* cost function.
    for (const goal of board.goalList) {
      const dist = new Int32Array(board.count);
      dist.fill(-1);
      const queue = new Int32Array(board.count);
      let qh = 0;
      let qt = 0;
      dist[goal] = 0;
      queue[qt++] = goal;
      while (qh < qt) {
        const current = queue[qh++];
        for (let d = 0; d < 4; d++) {
          const predecessor = board.neighbours[current][OPP[d]];
          if (predecessor < 0) continue;
          const support = board.neighbours[predecessor][OPP[d]];
          if (support < 0 || dist[predecessor] >= 0) continue;
          dist[predecessor] = dist[current] + 1;
          queue[qt++] = predecessor;
        }
      }
      board.reverseDistances.push(dist);
    }

    for (const p of board.floorList) {
      let reachableTargets = 0;
      for (const dist of board.reverseDistances) if (dist[p] >= 0) reachableTargets++;
      board.targetReachCount[p] = reachableTargets;
      board.transitValue[p] = reachableTargets;
      if (!board.goals[p] && reachableTargets === 0) board.deadSquares[p] = 1;
    }

    // Articulation points are the narrowest static room links. Room scoring is
    // deliberately coarse: FESS needs a stable projection, not a distance sum.
    const discovery = new Int32Array(board.count);
    const low = new Int32Array(board.count);
    const parent = new Int32Array(board.count);
    parent.fill(-1);
    let time = 0;
    const dfs = u => {
      discovery[u] = low[u] = ++time;
      let children = 0;
      for (let d = 0; d < 4; d++) {
        const v = board.neighbours[u][d];
        if (v < 0) continue;
        if (!discovery[v]) {
          parent[v] = u;
          children++;
          dfs(v);
          low[u] = Math.min(low[u], low[v]);
          if (parent[u] < 0 ? children > 1 : low[v] >= discovery[u]) board.roomLinks[u] = 1;
        } else if (v !== parent[u]) {
          low[u] = Math.min(low[u], discovery[v]);
        }
      }
    };
    for (const start of board.floorList) if (!discovery[start]) dfs(start);

    // Festival/FESS derives a parking order by peeling boxes from the solved
    // target arrangement and reversing the groups. The score counts occupied
    // goals group-by-group and stops at the first incomplete group.
    board.packingGroups = buildPackingGroups(board);
    board.packingGoalStage = new Int16Array(board.count);
    board.packingGoalStage.fill(-1);
    for (let stage = 0; stage < board.packingGroups.length; stage++) {
      for (const goal of board.packingGroups[stage]) {
        board.packingGoalStage[goal] = stage;
        board.goalRank[goal] = stage;
      }
    }
    board.oopReachByStage = buildOutOfPlanReach(board);

    // Hotspot blocker maps are calculated lazily for squares that actually
    // hold boxes during the search, then cached for the rest of the run.
  }

  function boxesMask(board, boxes) {
    const mask = new Uint8Array(board.count);
    for (const p of boxes) mask[p] = 1;
    return mask;
  }

  function floodReach(board, blocked, start, withPaths = false) {
    const seen = new Uint8Array(board.count);
    const queue = new Int32Array(board.count);
    const parent = withPaths ? new Int32Array(board.count) : null;
    const parentDir = withPaths ? new Int8Array(board.count) : null;
    if (parent) parent.fill(-1);
    let qh = 0;
    let qt = 0;
    let representative = INF;
    if (start >= 0 && board.floor[start] && !blocked[start]) {
      seen[start] = 1;
      queue[qt++] = start;
      representative = start;
    }
    while (qh < qt) {
      const p = queue[qh++];
      if (p < representative) representative = p;
      for (let d = 0; d < 4; d++) {
        const n = board.neighbours[p][d];
        if (n < 0 || blocked[n] || seen[n]) continue;
        seen[n] = 1;
        if (parent) {
          parent[n] = p;
          parentDir[n] = d;
        }
        queue[qt++] = n;
      }
    }
    return { seen, count: qt, representative: representative === INF ? -1 : representative, parent, parentDir };
  }

  function pathTo(reach, start, target) {
    if (target === start) return '';
    if (!reach.seen[target] || !reach.parent) return null;
    const chars = [];
    let p = target;
    while (p !== start) {
      const d = reach.parentDir[p];
      if (d < 0) return null;
      chars.push(DIRS[d].lower);
      p = reach.parent[p];
    }
    chars.reverse();
    return chars.join('');
  }

  function canonicalState(board, boxes, player) {
    const blocked = boxesMask(board, boxes);
    const reach = floodReach(board, blocked, player, false);
    return {
      representative: reach.representative,
      key: `${boxes.join(',')}|${reach.representative}`,
      playerReach: reach.count,
      reach,
    };
  }

  function allBoxesOnGoals(board, boxes) {
    for (const p of boxes) if (!board.goals[p]) return false;
    return true;
  }

  function countFreeComponents(board, blocked) {
    const seen = new Uint8Array(board.count);
    const queue = new Int32Array(board.count);
    let components = 0;
    for (const start of board.floorList) {
      if (blocked[start] || seen[start]) continue;
      components++;
      let qh = 0;
      let qt = 0;
      seen[start] = 1;
      queue[qt++] = start;
      while (qh < qt) {
        const p = queue[qh++];
        for (let d = 0; d < 4; d++) {
          const n = board.neighbours[p][d];
          if (n < 0 || blocked[n] || seen[n]) continue;
          seen[n] = 1;
          queue[qt++] = n;
        }
      }
    }
    return components;
  }

  function hasTwoByTwoDeadlock(board, boxes) {
    const occupied = boxesMask(board, boxes);
    for (let y = 0; y + 1 < board.height; y++) {
      for (let x = 0; x + 1 < board.width; x++) {
        const cells = [y * board.width + x, y * board.width + x + 1, (y + 1) * board.width + x, (y + 1) * board.width + x + 1];
        let solid = true;
        let offGoalBox = false;
        for (const p of cells) {
          if (board.floor[p] && !occupied[p]) {
            solid = false;
            break;
          }
          if (occupied[p] && !board.goals[p]) offGoalBox = true;
        }
        if (solid && offGoalBox) return true;
      }
    }
    return false;
  }

  function hasCompleteGoalMatching(board, boxes) {
    const n = boxes.length;
    const matchedBox = new Int32Array(n);
    matchedBox.fill(-1);
    const visit = (boxIndex, seenGoals) => {
      const pos = boxes[boxIndex];
      for (let g = 0; g < n; g++) {
        if (seenGoals[g] || board.reverseDistances[g][pos] < 0) continue;
        seenGoals[g] = 1;
        if (matchedBox[g] < 0 || visit(matchedBox[g], seenGoals)) {
          matchedBox[g] = boxIndex;
          return true;
        }
      }
      return false;
    };
    for (let b = 0; b < n; b++) {
      if (!visit(b, new Uint8Array(n))) return false;
    }
    return true;
  }

  function quickMacroDeadlock(board, boxes) {
    for (const p of boxes) if (!board.goals[p] && board.deadSquares[p]) return 'static-dead-square';
    if (hasTwoByTwoDeadlock(board, boxes)) return 'solid-2x2';
    return '';
  }

  function provedDeadlock(board, boxes) {
    const key = boxes.join(',');
    if (board.deadlockCache.has(key)) return board.deadlockCache.get(key);
    const quick = quickMacroDeadlock(board, boxes);
    const reason = quick || (!hasCompleteGoalMatching(board, boxes) ? 'box-goal-matching' : '');
    board.deadlockCache.set(key, reason);
    return reason;
  }

  function immediatePushCountFromReach(board, boxes, blocked, reach) {
    let count = 0;
    for (const box of boxes) {
      for (let d = 0; d < 4; d++) {
        const support = board.neighbours[box][OPP[d]];
        const dest = board.neighbours[box][d];
        if (support >= 0 && dest >= 0 && reach.seen[support] && !blocked[dest]) count++;
      }
    }
    return count;
  }

  function immediatePushCount(board, boxes, player) {
    const blocked = boxesMask(board, boxes);
    const reach = floodReach(board, blocked, player, false);
    return immediatePushCountFromReach(board, boxes, blocked, reach);
  }

  function packingAnalysis(board, boxes) {
    const occupied = boxesMask(board, boxes);
    let score = 0;
    let stage = board.packingGroups.length;
    let incomplete = false;
    for (let current = 0; current < board.packingGroups.length; current++) {
      let missing = false;
      for (const goal of board.packingGroups[current]) {
        if (occupied[goal]) score++;
        else missing = true;
      }
      if (missing) {
        stage = current;
        incomplete = true;
        break;
      }
    }
    if (!incomplete) stage = board.packingGroups.length;
    let rawGoals = 0;
    for (const p of boxes) if (board.goals[p]) rawGoals++;
    return { score, stage, rawGoals, occupied };
  }

  function activeHotspots(board, boxes) {
    let hotspots = 0;
    let hotspotWeight = 0;
    for (const blocker of boxes) {
      if (board.goals[blocker]) continue;
      const loss = getHotspotLoss(board, blocker);
      if (!loss) continue;
      let active = false;
      let weight = 0;
      for (const source of boxes) {
        if (source === blocker || board.goals[source]) continue;
        if (loss[source] > 0) {
          active = true;
          weight += loss[source];
        }
      }
      if (active) {
        hotspots++;
        hotspotWeight += weight;
      }
    }
    return { hotspots, hotspotWeight };
  }

  function featureValues(board, boxes, player, knownReach = null) {
    const blocked = boxesMask(board, boxes);
    const playerReach = knownReach || floodReach(board, blocked, player, false);
    const packed = packingAnalysis(board, boxes);
    const packing = packed.score;
    const connectivity = countFreeComponents(board, blocked);
    let roomConnectivity = 0;
    let transitBlock = 0;
    for (const p of boxes) {
      if (board.roomLinks[p]) roomConnectivity++;
      if (!board.goals[p]) transitBlock += board.transitValue[p];
    }

    const oopReach = board.oopReachByStage[Math.min(packed.stage, board.oopReachByStage.length - 1)];
    let outOfPlan = 0;
    for (const p of boxes) {
      const goalStage = board.packingGoalStage[p];
      if (goalStage >= 0 && goalStage < packed.stage) continue; // already parked
      if (!oopReach[p]) outOfPlan++;
    }

    const hotspot = activeHotspots(board, boxes);
    const mobility = immediatePushCountFromReach(board, boxes, blocked, playerReach);
    return {
      packing,
      rawGoals: packed.rawGoals,
      packingStage: packed.stage,
      connectivity,
      roomConnectivity,
      hotspots: hotspot.hotspots,
      hotspotWeight: hotspot.hotspotWeight,
      outOfPlan,
      playerReach: playerReach.count,
      mobility,
      transitBlock,
      cellKey: `${packing}|${connectivity}|${roomConnectivity}|${outOfPlan}`,
    };
  }

  function replaceBox(boxes, from, to) {
    const child = boxes.slice();
    const index = child.indexOf(from);
    if (index < 0) return null;
    child[index] = to;
    child.sort((a, b) => a - b);
    return child;
  }

  function generateMacroMoves(board, node, stats) {
    const endpointMap = new Map();
    const sourceBoxes = node.boxes;

    for (const originalBox of sourceBoxes) {
      const fixed = new Uint8Array(board.count);
      for (const p of sourceBoxes) if (p !== originalBox) fixed[p] = 1;

      const queue = [{ box: originalBox, player: node.player, route: '', pushes: 0 }];
      let qh = 0;
      const visited = new Map();

      while (qh < queue.length) {
        const state = queue[qh++];
        const blocked = fixed.slice();
        blocked[state.box] = 1;
        const reach = floodReach(board, blocked, state.player, true);
        const localKey = `${state.box}|${reach.representative}`;
        const oldLength = visited.get(localKey);
        if (oldLength !== undefined && oldLength < state.route.length) continue;
        visited.set(localKey, state.route.length);

        for (let d = 0; d < 4; d++) {
          const support = board.neighbours[state.box][OPP[d]];
          const destination = board.neighbours[state.box][d];
          if (support < 0 || destination < 0 || fixed[destination] || !reach.seen[support]) continue;

          const walk = pathTo(reach, state.player, support);
          if (walk === null) continue;
          const route = state.route + walk + DIRS[d].upper;
          const pushes = state.pushes + 1;
          const childBoxes = replaceBox(sourceBoxes, originalBox, destination);
          if (!childBoxes) continue;
          const quickDead = quickMacroDeadlock(board, childBoxes);
          if (quickDead) {
            stats.staticDeadlocks++;
            continue;
          }
          const childPlayer = state.box;
          const canonical = canonicalState(board, childBoxes, childPlayer);
          if (canonical.key !== node.key) {
            const previous = endpointMap.get(canonical.key);
            if (!previous || pushes < previous.pushes || (pushes === previous.pushes && route.length < previous.route.length)) {
              endpointMap.set(canonical.key, {
                from: originalBox,
                to: destination,
                endPlayer: childPlayer,
                route,
                pushes,
                childKey: canonical.key,
                childRepresentative: canonical.representative,
                childBoxes,
              });
            }
          }

          const childBlocked = fixed.slice();
          childBlocked[destination] = 1;
          const childReach = floodReach(board, childBlocked, childPlayer, false);
          const nextLocalKey = `${destination}|${childReach.representative}`;
          const best = visited.get(nextLocalKey);
          if (best === undefined || route.length < best) {
            visited.set(nextLocalKey, route.length);
            queue.push({ box: destination, player: childPlayer, route, pushes });
          }
        }
      }
    }

    const moves = [];
    for (const move of endpointMap.values()) {
      const deadReason = provedDeadlock(board, move.childBoxes);
      if (deadReason) {
        if (deadReason === 'box-goal-matching') stats.assignmentDeadlocks++;
        else stats.staticDeadlocks++;
        continue;
      }
      let features = board.featureCache.get(move.childKey);
      if (!features) {
        const canonical = canonicalState(board, move.childBoxes, move.endPlayer);
        features = featureValues(board, move.childBoxes, move.endPlayer, canonical.reach);
        board.featureCache.set(move.childKey, features);
      }
      move.features = features;
      move.weight = 1;
      move.status = 0; // 0 unexpanded, 1 live child, 2 dead child
      move.childId = -1;
      moves.push(move);
    }
    return moves;
  }

  function chooseBestMove(moves, score, better, requireImprovement = null) {
    let bestIndex = -1;
    let bestScore;
    for (let i = 0; i < moves.length; i++) {
      const value = score(moves[i]);
      if (bestIndex < 0 || better(value, bestScore)) {
        bestIndex = i;
        bestScore = value;
      }
    }
    if (bestIndex < 0) return -1;
    if (requireImprovement && !requireImprovement(bestScore)) return -1;
    return bestIndex;
  }

  function betterFessScore(a, b) {
    if (!b) return true;
    if (a.packing !== b.packing) return a.packing > b.packing;
    if (a.connectivity !== b.connectivity) return a.connectivity < b.connectivity;
    if (a.roomConnectivity !== b.roomConnectivity) return a.roomConnectivity < b.roomConnectivity;
    if (a.outOfPlan !== b.outOfPlan) return a.outOfPlan < b.outOfPlan;
    if (a.hotspots !== b.hotspots) return a.hotspots < b.hotspots;
    if (a.hotspotWeight !== b.hotspotWeight) return a.hotspotWeight < b.hotspotWeight;
    if (a.rawGoals !== b.rawGoals) return a.rawGoals > b.rawGoals;
    if (a.playerReach !== b.playerReach) return a.playerReach > b.playerReach;
    return a.mobility > b.mobility;
  }

  function chooseAdvisorMove(moves, parent, improves) {
    let bestIndex = -1;
    let bestFeatures = null;
    for (let i = 0; i < moves.length; i++) {
      const child = moves[i].features;
      // Festival's feature advisors never recommend undoing established packing.
      // Such moves remain in the search with ordinary weight; they are not pruned.
      if (child.packing < parent.packing || !improves(child, parent)) continue;
      if (bestIndex < 0 || betterFessScore(child, bestFeatures)) {
        bestIndex = i;
        bestFeatures = child;
      }
    }
    return bestIndex;
  }

  function assignAdvisorWeights(board, node, moves, stats) {
    if (!moves.length) return;
    const selected = new Set();
    const parent = node.features;
    const add = index => { if (index >= 0) selected.add(index); };

    add(chooseAdvisorMove(moves, parent, child => child.packing > parent.packing));
    add(chooseAdvisorMove(moves, parent, child => child.connectivity < parent.connectivity));
    add(chooseAdvisorMove(moves, parent, child => child.roomConnectivity < parent.roomConnectivity));
    add(chooseAdvisorMove(moves, parent, child => child.hotspots < parent.hotspots ||
      (child.hotspots === parent.hotspots && child.hotspotWeight < parent.hotspotWeight)));
    add(chooseAdvisorMove(moves, parent, child => child.outOfPlan < parent.outOfPlan));

    // Opener and explorer advisors are domain advisors, still within the one
    // FESS search. They alter move weight only and never delete alternatives.
    add(chooseAdvisorMove(moves, parent, child => child.playerReach > parent.playerReach));
    add(chooseAdvisorMove(moves, parent, child => child.mobility > parent.mobility));

    for (let i = 0; i < moves.length; i++) {
      if (selected.has(i)) {
        moves[i].weight = 0;
        stats.advisorMoves++;
      } else {
        moves[i].weight = 1;
        stats.nonAdvisorMoves++;
      }
      delete moves[i].childBoxes;
    }
  }

  function boardToXSB(board, state = createInitialState(board)) {
    const boxes = new Set(state.boxes);
    const lines = [];
    for (let y = 0; y < board.height; y++) {
      let line = '';
      for (let x = 0; x < board.width; x++) {
        const p = y * board.width + x;
        if (!board.floor[p]) {
          const original = board.rawLines[y] && board.rawLines[y][x];
          line += original === '#' ? '#' : ' ';
        } else if (p === state.player) {
          line += board.goals[p] ? '+' : '@';
        } else if (boxes.has(p)) {
          line += board.goals[p] ? '*' : '$';
        } else {
          line += board.goals[p] ? '.' : ' ';
        }
      }
      lines.push(line.replace(/\s+$/, ''));
    }
    return lines.join('\n');
  }

  function buildRoute(nodes, nodeId) {
    const parts = [];
    let id = nodeId;
    while (id >= 0) {
      const node = nodes[id];
      if (node.parentId < 0) break;
      parts.push(node.macroRoute);
      id = node.parentId;
    }
    parts.reverse();
    return parts.join('');
  }

  function closestScore(board, node) {
    const f = node.features;
    return (board.goalList.length - f.packing) * 100 + (board.goalList.length - f.rawGoals) * 6 + f.outOfPlan * 12 + Math.max(0, f.connectivity - 1) * 4 + f.roomConnectivity * 3 + f.hotspots * 2;
  }

  function makeClosest(board, nodes, nodeId) {
    const node = nodes[nodeId];
    const route = buildRoute(nodes, nodeId);
    return {
      boardText: boardToXSB(board, { boxes: node.boxes, player: node.player }),
      mixedMoves: route,
      moveCount: route.length,
      pushCount: node.pushDepth,
      goalsFilled: node.features.rawGoals,
      safePacked: node.features.packing,
      totalGoals: board.goalList.length,
      remainingEstimate: closestScore(board, node),
      legalPushes: node.features.mobility,
      stagnation: 0,
    };
  }

  function createInitialState(board) {
    return { player: board.initialPlayer, boxes: board.initialBoxes.slice() };
  }

  function directionIndex(ch) {
    const upper = String(ch).toUpperCase();
    return upper === 'U' ? 0 : upper === 'R' ? 1 : upper === 'D' ? 2 : upper === 'L' ? 3 : -1;
  }

  function applyMove(board, state, move) {
    const d = directionIndex(move);
    if (d < 0) return { ok: false, pushed: false, reason: `Invalid move ${JSON.stringify(move)}.` };
    const next = board.neighbours[state.player][d];
    if (next < 0) return { ok: false, pushed: false, reason: 'The player would hit a wall.' };
    const boxIndex = state.boxes.indexOf(next);
    if (boxIndex < 0) {
      state.player = next;
      return { ok: true, pushed: false };
    }
    const destination = board.neighbours[next][d];
    if (destination < 0 || state.boxes.includes(destination)) return { ok: false, pushed: false, reason: 'The box cannot be pushed.' };
    state.boxes[boxIndex] = destination;
    state.boxes.sort((a, b) => a - b);
    state.player = next;
    return { ok: true, pushed: true };
  }

  function validateSolution(levelOrBoard, moves) {
    const board = typeof levelOrBoard === 'string' ? parseLevel(levelOrBoard) : levelOrBoard;
    const state = createInitialState(board);
    let pushes = 0;
    const clean = String(moves || '').replace(/[^udlrUDLR]/g, '');
    for (let i = 0; i < clean.length; i++) {
      const result = applyMove(board, state, clean[i]);
      if (!result.ok) return { valid: false, solved: false, index: i, reason: result.reason, state };
      if (result.pushed) pushes++;
    }
    return { valid: true, solved: allBoxesOnGoals(board, state.boxes), moveCount: clean.length, pushCount: pushes, state };
  }

  function delayTurn() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  async function solve(levelOrBoard, options = {}) {
    const board = typeof levelOrBoard === 'string' ? parseLevel(levelOrBoard) : levelOrBoard;
    const startedAt = Date.now();
    const timeLimit = Math.max(1000, Number(options.featureMaxTimeMs || options.maxTimeMs || 600000));
    const nodeLimit = Number.isFinite(Number(options.maxNodes)) ? Math.max(1, Number(options.maxNodes)) : INF;
    const progressEveryMs = Math.max(100, Number(options.progressEveryMs || 750));
    const yieldEvery = Math.max(1, Number(options.yieldEvery || 250));
    const shouldStop = typeof options.shouldStop === 'function' ? options.shouldStop : () => false;
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

    const stats = {
      phase: 'feature-space',
      strategy: 'fess',
      expanded: 0,
      generated: 0,
      featureExpanded: 0,
      featureGenerated: 0,
      featureCells: 0,
      activeCells: 0,
      advisorMoves: 0,
      nonAdvisorMoves: 0,
      staticDeadlocks: 0,
      assignmentDeadlocks: 0,
      provenDeadStates: 0,
      deadStateHits: 0,
      transpositions: 0,
      weightRelaxations: 0,
      residentNodes: 0,
      residentNodeLimit: nodeLimit === INF ? 0 : nodeLimit,
    };

    const initialDead = provedDeadlock(board, board.initialBoxes);
    if (initialDead) {
      return {
        status: 'unsolvable',
        strategy: 'fess',
        elapsedMs: Date.now() - startedAt,
        stats,
        message: `The starting position contains a proved deadlock (${initialDead}).`,
        closest: {
          boardText: boardToXSB(board), mixedMoves: '', moveCount: 0, pushCount: 0,
          goalsFilled: board.initialBoxes.reduce((s, p) => s + (board.goals[p] ? 1 : 0), 0),
          safePacked: packingAnalysis(board, board.initialBoxes).score, totalGoals: board.goalList.length, remainingEstimate: null,
          legalPushes: immediatePushCount(board, board.initialBoxes, board.initialPlayer), stagnation: 0,
        },
      };
    }

    const nodes = [];
    const table = new Map();
    const cells = new Map();
    const cellOrder = [];
    let cellCursor = 0;
    let candidateSerial = 0;
    let openMoves = 0;
    let closestNodeId = 0;
    let closestValue = INF;
    let bestFessNodeId = 0;
    let lastProgress = 0;
    let selectionCount = 0;

    const getCell = key => {
      let cell = cells.get(key);
      if (!cell) {
        cell = {
          key,
          heap: new MinHeap((a, b) => (a.priority - b.priority) || (a.serial - b.serial)),
        };
        cells.set(key, cell);
        cellOrder.push(key);
        stats.featureCells = cells.size;
      }
      return cell;
    };

    const markNodeDead = nodeId => {
      const stack = [nodeId];
      while (stack.length) {
        const id = stack.pop();
        const node = nodes[id];
        if (!node || node.dead) continue;
        let allDead = node.moves.length === 0;
        if (!allDead) {
          allDead = true;
          for (const move of node.moves) {
            if (move.status !== 2) {
              allDead = false;
              break;
            }
          }
        }
        if (!allDead) continue;
        node.dead = true;
        stats.provenDeadStates++;
        for (const ref of node.parents) {
          const parent = nodes[ref.nodeId];
          if (!parent || parent.dead) continue;
          const edge = parent.moves[ref.moveIndex];
          if (edge && edge.status !== 2) {
            edge.status = 2;
            stack.push(ref.nodeId);
          }
        }
      }
    };

    const addNode = (boxes, player, parentId, macroRoute, macroPushes, weight, knownKey = null, knownFeatures = null) => {
      const canonical = knownKey ? { key: knownKey } : canonicalState(board, boxes, player);
      const id = nodes.length;
      const node = {
        id,
        key: canonical.key,
        boxes,
        player,
        parentId,
        macroRoute,
        pushDepth: parentId < 0 ? 0 : nodes[parentId].pushDepth + macroPushes,
        weight,
        features: null,
        moves: [],
        parents: [],
        dead: false,
      };
      node.features = knownFeatures || board.featureCache.get(node.key) || featureValues(board, boxes, player);
      board.featureCache.set(node.key, node.features);
      nodes.push(node);
      table.set(node.key, id);
      stats.generated = nodes.length;
      stats.residentNodes = nodes.length;

      const score = closestScore(board, node);
      if (score < closestValue || (score === closestValue && node.pushDepth < nodes[closestNodeId].pushDepth)) {
        closestValue = score;
        closestNodeId = id;
      }
      if (id === 0 || betterFessScore(node.features, nodes[bestFessNodeId].features)) bestFessNodeId = id;

      if (!allBoxesOnGoals(board, boxes)) {
        node.moves = generateMacroMoves(board, node, stats);
        assignAdvisorWeights(board, node, node.moves, stats);
        const cell = getCell(node.features.cellKey);
        for (let i = 0; i < node.moves.length; i++) {
          const move = node.moves[i];
          cell.heap.push({ nodeId: id, moveIndex: i, priority: node.weight + move.weight, serial: candidateSerial++ });
          openMoves++;
        }
        stats.featureGenerated += node.moves.length;
        if (!node.moves.length) markNodeDead(id);
      }
      return id;
    };

    const rootCanonical = canonicalState(board, board.initialBoxes, board.initialPlayer);
    addNode(board.initialBoxes.slice(), board.initialPlayer, -1, '', 0, 0, rootCanonical.key);

    if (allBoxesOnGoals(board, board.initialBoxes)) {
      return { status: 'solved', strategy: 'fess', moves: '', mixedMoves: '', moveCount: 0, pushCount: 0, elapsedMs: Date.now() - startedAt, stats, message: 'The puzzle is already solved.' };
    }

    const popFromCell = key => {
      const cell = cells.get(key);
      while (cell && cell.heap.size) {
        const candidate = cell.heap.pop();
        const node = nodes[candidate.nodeId];
        const move = node && node.moves[candidate.moveIndex];
        if (!node || node.dead || !move || move.status !== 0) continue;
        return candidate;
      }
      return null;
    };

    const selectCandidate = () => {
      if (!cellOrder.length) return null;
      selectionCount++;

      // Festival alternates broad cyclic coverage with exploitation of the
      // best feature cell seen so far. Both selections use the same FESS cells
      // and the same accumulated-weight queues.
      if ((selectionCount & 1) === 0) {
        const bestNode = nodes[bestFessNodeId];
        const focused = bestNode ? popFromCell(bestNode.features.cellKey) : null;
        if (focused) return focused;
      }

      let checked = 0;
      while (checked < cellOrder.length) {
        const key = cellOrder[cellCursor % cellOrder.length];
        cellCursor = (cellCursor + 1) % cellOrder.length;
        checked++;
        const candidate = popFromCell(key);
        if (candidate) return candidate;
      }
      return null;
    };

    const sendProgress = force => {
      const now = Date.now();
      if (!force && now - lastProgress < progressEveryMs) return;
      lastProgress = now;
      let activeCells = 0;
      for (const cell of cells.values()) if (cell.heap.size) activeCells++;
      stats.activeCells = activeCells;
      const closest = makeClosest(board, nodes, closestNodeId);
      onProgress?.({
        phase: 'feature-space',
        generated: nodes.length,
        open: openMoves,
        depth: nodes[closestNodeId].pushDepth,
        bestPushDepth: nodes[closestNodeId].pushDepth,
        elapsedMs: now - startedAt,
        goalsFilled: closest.goalsFilled,
        safePacked: closest.safePacked,
        totalGoals: board.goalList.length,
        estimate: closest.remainingEstimate,
        bestEstimate: closest.remainingEstimate,
        featureCells: cells.size,
        activeCells,
        activeFeatureCells: activeCells,
        deadlocks: stats.staticDeadlocks + stats.assignmentDeadlocks,
        advisorMoves: stats.advisorMoves,
        nonAdvisorMoves: stats.nonAdvisorMoves,
        provenDeadStates: stats.provenDeadStates,
        deadStateHits: stats.deadStateHits,
        residentNodes: nodes.length,
        residentNodeLimit: stats.residentNodeLimit,
        closest,
        stats: { ...stats },
      });
    };

    sendProgress(true);

    while (true) {
      if (shouldStop()) {
        sendProgress(true);
        return { status: 'stopped', strategy: 'fess', elapsedMs: Date.now() - startedAt, stats, closest: makeClosest(board, nodes, closestNodeId), message: 'Search cancelled.' };
      }
      if (Date.now() - startedAt >= timeLimit) {
        sendProgress(true);
        return { status: 'limit', strategy: 'fess', elapsedMs: Date.now() - startedAt, stats, closest: makeClosest(board, nodes, closestNodeId), message: 'FESS reached its solving-time limit before exhausting the puzzle.' };
      }
      if (nodes.length >= nodeLimit) {
        sendProgress(true);
        return { status: 'limit', strategy: 'fess', elapsedMs: Date.now() - startedAt, stats, closest: makeClosest(board, nodes, closestNodeId), message: 'FESS reached its state limit before exhausting the puzzle.' };
      }

      const candidate = selectCandidate();
      if (!candidate) {
        sendProgress(true);
        return {
          status: 'unsolvable',
          strategy: 'fess',
          elapsedMs: Date.now() - startedAt,
          stats,
          closest: makeClosest(board, nodes, closestNodeId),
          message: 'FESS exhausted every reachable non-dead macro move without finding a solution.',
        };
      }

      const parent = nodes[candidate.nodeId];
      const move = parent.moves[candidate.moveIndex];
      move.status = 1;
      openMoves--;
      stats.expanded++;
      stats.featureExpanded++;

      const childBoxes = replaceBox(parent.boxes, move.from, move.to);
      const deadReason = childBoxes ? provedDeadlock(board, childBoxes) : 'invalid-macro';
      if (deadReason) {
        move.status = 2;
        if (deadReason === 'box-goal-matching') stats.assignmentDeadlocks++;
        else stats.staticDeadlocks++;
        markNodeDead(parent.id);
      } else {
        const existingId = table.get(move.childKey);
        if (existingId !== undefined) {
          stats.transpositions++;
          move.childId = existingId;
          const existing = nodes[existingId];
          existing.parents.push({ nodeId: parent.id, moveIndex: candidate.moveIndex });
          if (existing.dead) {
            move.status = 2;
            stats.deadStateHits++;
            markNodeDead(parent.id);
          } else {
            const improvedWeight = parent.weight + move.weight;
            if (improvedWeight < existing.weight) {
              existing.weight = improvedWeight;
              stats.weightRelaxations++;
              const cell = getCell(existing.features.cellKey);
              for (let i = 0; i < existing.moves.length; i++) {
                const pending = existing.moves[i];
                if (pending.status !== 0) continue;
                cell.heap.push({ nodeId: existingId, moveIndex: i, priority: existing.weight + pending.weight, serial: candidateSerial++ });
              }
            }
          }
        } else {
          const childWeight = parent.weight + move.weight;
          const childId = addNode(childBoxes, move.endPlayer, parent.id, move.route, move.pushes, childWeight, move.childKey, move.features);
          move.childId = childId;
          nodes[childId].parents.push({ nodeId: parent.id, moveIndex: candidate.moveIndex });

          if (allBoxesOnGoals(board, childBoxes)) {
            const route = buildRoute(nodes, childId);
            const validation = validateSolution(board, route);
            if (!validation.valid || !validation.solved) throw new SolverError('FESS constructed a route that failed replay verification.', 'INVALID_SOLUTION');
            sendProgress(true);
            return {
              status: 'solved',
              strategy: 'fess',
              moves: route,
              mixedMoves: route,
              moveCount: validation.moveCount,
              pushCount: validation.pushCount,
              elapsedMs: Date.now() - startedAt,
              stats,
              message: 'Solved by Feature Space Search.',
            };
          }
          if (nodes[childId].dead) {
            move.status = 2;
            markNodeDead(parent.id);
          }
        }
      }

      sendProgress(false);
      if (stats.featureExpanded % yieldEvery === 0) await delayTurn();
    }
  }

  function analyseDeadlocks(levelOrBoard, boxes = null) {
    const board = typeof levelOrBoard === 'string' ? parseLevel(levelOrBoard) : levelOrBoard;
    const positions = boxes ? boxes.slice().sort((a, b) => a - b) : board.initialBoxes.slice();
    const reason = provedDeadlock(board, positions);
    return {
      dead: Boolean(reason),
      reason,
      safePacked: packingAnalysis(board, positions).score,
    };
  }

  return Object.freeze({
    version: '4.0.0',
    DIRS,
    SolverError,
    parseLevel,
    solve,
    validateSolution,
    createInitialState,
    applyMove,
    boardToXSB,
    allBoxesOnGoals,
    analyseDeadlocks,
  });
});
