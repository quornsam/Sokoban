/*
 * BOXXY Sokoban Solver Core v5.1.0
 *
 * Clean Feature Space Search (FESS) implementation for the BOXXY Level Maker.
 * The search follows Shoham & Schaeffer's FESS design:
 *   - one search tree in the Sokoban domain space;
 *   - projection of every state into a multi-dimensional feature-space cell;
 *   - cyclic coverage of all populated cells;
 *   - selection of the least accumulated-weight unexpanded move in each cell;
 *   - single legal pushes as the compact domain-space move unit;
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
      corralPatternCache: new Map(),
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

  function compactKey(boxes, representative = -1) {
    // Board positions fit in 16 bits. A binary string is dramatically smaller
    // than a comma-separated decimal key and is safe as a JavaScript Map key.
    let key = String.fromCharCode(representative + 1);
    for (let i = 0; i < boxes.length; i++) key += String.fromCharCode(boxes[i] + 1);
    return key;
  }

  function canonicalState(board, boxes, player) {
    const blocked = boxesMask(board, boxes);
    const reach = floodReach(board, blocked, player, false);
    return {
      representative: reach.representative,
      key: compactKey(boxes, reach.representative),
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

  function hasGoalMatching(board, boxes) {
    const goalCount = board.goalList.length;
    const matchedBox = new Int32Array(goalCount);
    matchedBox.fill(-1);
    const visit = (boxIndex, seenGoals) => {
      const pos = boxes[boxIndex];
      for (let g = 0; g < goalCount; g++) {
        if (seenGoals[g] || board.reverseDistances[g][pos] < 0) continue;
        seenGoals[g] = 1;
        if (matchedBox[g] < 0 || visit(matchedBox[g], seenGoals)) {
          matchedBox[g] = boxIndex;
          return true;
        }
      }
      return false;
    };
    for (let b = 0; b < boxes.length; b++) {
      if (!visit(b, new Uint8Array(goalCount))) return false;
    }
    return true;
  }

  function hasCompleteGoalMatching(board, boxes) {
    return boxes.length === board.goalList.length && hasGoalMatching(board, boxes);
  }

  function quickMacroDeadlock(board, boxes) {
    for (const p of boxes) if (!board.goals[p] && board.deadSquares[p]) return 'static-dead-square';
    if (hasTwoByTwoDeadlock(board, boxes)) return 'solid-2x2';
    return '';
  }

  function relaxedSubsetCanReachGoals(board, subsetBoxes, player, stateLimit = 400) {
    const startBoxes = subsetBoxes.slice().sort((a, b) => a - b);
    const startCanonical = canonicalState(board, startBoxes, player);
    const cacheKey = compactKey(startBoxes, startCanonical.representative);
    if (board.corralPatternCache.has(cacheKey)) return board.corralPatternCache.get(cacheKey);

    const states = [{ boxes: startBoxes, player: startCanonical.representative }];
    const seen = new Set([cacheKey]);
    let head = 0;
    let complete = true;

    while (head < states.length) {
      if (states.length >= stateLimit) {
        complete = false;
        break;
      }
      const state = states[head++];
      if (allBoxesOnGoals(board, state.boxes)) {
        if (board.corralPatternCache.size >= 20000) board.corralPatternCache.clear();
        board.corralPatternCache.set(cacheKey, true);
        return true;
      }

      const blocked = boxesMask(board, state.boxes);
      const reach = floodReach(board, blocked, state.player, false);
      for (let boxIndex = 0; boxIndex < state.boxes.length; boxIndex++) {
        const from = state.boxes[boxIndex];
        for (let dir = 0; dir < 4; dir++) {
          const support = board.neighbours[from][OPP[dir]];
          const to = board.neighbours[from][dir];
          if (support < 0 || to < 0 || !reach.seen[support] || blocked[to]) continue;

          const childBoxes = state.boxes.slice();
          childBoxes[boxIndex] = to;
          childBoxes.sort((a, b) => a - b);
          if (quickMacroDeadlock(board, childBoxes) || !hasGoalMatching(board, childBoxes)) continue;

          const canonical = canonicalState(board, childBoxes, from);
          const key = compactKey(childBoxes, canonical.representative);
          if (seen.has(key)) continue;
          seen.add(key);
          states.push({ boxes: childBoxes, player: canonical.representative });
        }
      }
    }

    // A false result is a proof only when the relaxed search was exhausted.
    // Hitting the small pattern-search limit means "unknown", never dead.
    const result = complete ? false : null;
    if (board.corralPatternCache.size >= 20000) board.corralPatternCache.clear();
    board.corralPatternCache.set(cacheKey, result);
    return result;
  }

  function hasSmallCorralPatternDeadlock(board, boxes, player, playerReach = null, focusBox = -1) {
    const blocked = boxesMask(board, boxes);
    const reach = playerReach || floodReach(board, blocked, player, false);
    const occupiedIndex = new Int32Array(board.count);
    occupiedIndex.fill(-1);
    for (let i = 0; i < boxes.length; i++) occupiedIndex[boxes[i]] = i;

    const visited = new Uint8Array(board.count);
    const queue = new Int32Array(board.count);
    const tested = new Set();

    for (const start of board.floorList) {
      if (blocked[start] || reach.seen[start] || visited[start]) continue;
      let qh = 0;
      let qt = 0;
      let componentSize = 0;
      const boundary = new Set();
      visited[start] = 1;
      queue[qt++] = start;

      while (qh < qt) {
        const p = queue[qh++];
        componentSize++;
        for (let dir = 0; dir < 4; dir++) {
          const n = board.neighbours[p][dir];
          if (n < 0) continue;
          if (blocked[n]) {
            boundary.add(n);
          } else if (!reach.seen[n] && !visited[n]) {
            visited[n] = 1;
            queue[qt++] = n;
          }
        }
      }

      // Exact relaxed pattern searches are deliberately limited to tiny
      // inaccessible pockets. Larger corrals remain searchable by FESS rather
      // than risking either a false proof or expensive work at every node.
      const maxComponentSize = focusBox >= 0 ? 8 : 2;
      if (componentSize > maxComponentSize || boundary.size < 2 || boundary.size > 4) continue;
      if (focusBox >= 0 && !boundary.has(focusBox)) continue;
      const subset = Array.from(boundary).sort((a, b) => a - b);
      const subsetKey = subset.join(',');
      if (tested.has(subsetKey)) continue;
      tested.add(subsetKey);

      const canSolveRelaxed = relaxedSubsetCanReachGoals(board, subset, player, focusBox >= 0 ? 800 : 300);
      if (canSolveRelaxed === false) return true;
    }
    return false;
  }

  function provedDeadlock(board, boxes, player = -1, playerReach = null, focusBox = -1) {
    const staticKey = `S${compactKey(boxes)}`;
    if (board.deadlockCache.has(staticKey)) return board.deadlockCache.get(staticKey);
    const quick = quickMacroDeadlock(board, boxes);
    const staticReason = quick || (!hasCompleteGoalMatching(board, boxes) ? 'box-goal-matching' : '');
    if (staticReason) {
      if (board.deadlockCache.size >= 50000) board.deadlockCache.clear();
      board.deadlockCache.set(staticKey, staticReason);
      return staticReason;
    }

    if (player >= 0) {
      const reach = playerReach || floodReach(board, boxesMask(board, boxes), player, false);
      const dynamicKey = `C${compactKey(boxes, reach.representative)}`;
      if (board.deadlockCache.has(dynamicKey)) return board.deadlockCache.get(dynamicKey);
      if (hasSmallCorralPatternDeadlock(board, boxes, player, reach, focusBox)) {
        if (board.deadlockCache.size >= 50000) board.deadlockCache.clear();
        board.deadlockCache.set(dynamicKey, 'corral-pattern');
        return 'corral-pattern';
      }
    }
    return '';
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
      const deadReason = provedDeadlock(board, move.childBoxes, move.endPlayer, null, move.to);
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
    const requestedLimit = Number(options.maxNodes);
    const defaultNodeLimit = board.initialBoxes.length >= 32 ? 180000
      : board.initialBoxes.length >= 16 ? 240000 : 400000;
    const nodeLimit = Number.isFinite(requestedLimit) ? Math.max(1, Math.floor(requestedLimit)) : defaultNodeLimit;
    const progressEveryMs = Math.max(100, Number(options.progressEveryMs || 750));
    const yieldEvery = Math.max(1, Number(options.yieldEvery || 250));
    const shouldStop = typeof options.shouldStop === 'function' ? options.shouldStop : () => false;
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

    if (board.count > 65534) throw new SolverError('This board is too large for the compact browser solver.', 'BOARD_TOO_LARGE');

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
      corralDeadlocks: 0,
      provenDeadStates: 0,
      deadStateHits: 0,
      transpositions: 0,
      weightRelaxations: 0,
      residentNodes: 0,
      residentNodeLimit: nodeLimit,
      memorySafeStops: 0,
    };

    const initialCanonical = canonicalState(board, board.initialBoxes, board.initialPlayer);
    const initialDead = provedDeadlock(board, board.initialBoxes, board.initialPlayer, initialCanonical.reach);
    if (initialDead) {
      return {
        status: 'unsolvable', strategy: 'fess', elapsedMs: Date.now() - startedAt, stats,
        message: `The starting position contains a proved deadlock (${initialDead}).`,
        closest: {
          boardText: boardToXSB(board), mixedMoves: '', moveCount: 0, pushCount: 0,
          goalsFilled: board.initialBoxes.reduce((sum, p) => sum + (board.goals[p] ? 1 : 0), 0),
          safePacked: packingAnalysis(board, board.initialBoxes).score,
          totalGoals: board.goalList.length, remainingEstimate: null,
          legalPushes: immediatePushCount(board, board.initialBoxes, board.initialPlayer), stagnation: 0,
        },
      };
    }

    const boxCount = board.initialBoxes.length;
    const boxPool = new Uint16Array(nodeLimit * boxCount);
    const parentIds = new Int32Array(nodeLimit);
    parentIds.fill(-1);
    const players = new Uint16Array(nodeLimit);
    const pushedFrom = new Uint16Array(nodeLimit);
    const pushedDir = new Uint8Array(nodeLimit);
    const pushDepth = new Uint32Array(nodeLimit);
    const weights = new Uint32Array(nodeLimit);
    const expanded = new Uint8Array(nodeLimit);

    const fPacking = new Uint16Array(nodeLimit);
    const fRawGoals = new Uint16Array(nodeLimit);
    const fConnectivity = new Uint16Array(nodeLimit);
    const fRoomConnectivity = new Uint16Array(nodeLimit);
    const fHotspots = new Uint16Array(nodeLimit);
    const fHotspotWeight = new Uint32Array(nodeLimit);
    const fOutOfPlan = new Uint16Array(nodeLimit);
    const fPlayerReach = new Uint16Array(nodeLimit);
    const fMobility = new Uint16Array(nodeLimit);

    let nodeCount = 0;
    let openNodes = 0;
    let closestNodeId = 0;
    let closestValue = INF;
    let bestFessNodeId = 0;
    let lastProgress = 0;
    let cellCursor = 0;
    let selectionCount = 0;
    let closestRouteCacheId = -1;
    let closestRouteCache = '';

    const table = new Map();
    const cells = new Map();
    const cellOrder = [];

    const boxesAt = id => boxPool.subarray(id * boxCount, (id + 1) * boxCount);
    const writeBoxes = (id, boxes) => boxPool.set(boxes, id * boxCount);

    const featureAt = id => ({
      packing: fPacking[id], rawGoals: fRawGoals[id], connectivity: fConnectivity[id],
      roomConnectivity: fRoomConnectivity[id], hotspots: fHotspots[id],
      hotspotWeight: fHotspotWeight[id], outOfPlan: fOutOfPlan[id],
      playerReach: fPlayerReach[id], mobility: fMobility[id],
    });
    const writeFeatures = (id, f) => {
      fPacking[id] = f.packing;
      fRawGoals[id] = f.rawGoals;
      fConnectivity[id] = f.connectivity;
      fRoomConnectivity[id] = f.roomConnectivity;
      fHotspots[id] = f.hotspots;
      fHotspotWeight[id] = f.hotspotWeight;
      fOutOfPlan[id] = f.outOfPlan;
      fPlayerReach[id] = f.playerReach;
      fMobility[id] = f.mobility;
    };

    const scoreFeature = f => (board.goalList.length - f.packing) * 100
      + (board.goalList.length - f.rawGoals) * 6
      + f.outOfPlan * 12
      + Math.max(0, f.connectivity - 1) * 4
      + f.roomConnectivity * 3
      + f.hotspots * 2;

    const cellKeyFor = f => `${f.packing}|${f.connectivity}|${f.roomConnectivity}|${f.outOfPlan}`;
    const getCell = f => {
      const key = cellKeyFor(f);
      let cell = cells.get(key);
      if (!cell) {
        cell = {
          key,
          heap: new MinHeap((a, b) => (weights[a] - weights[b]) || (pushDepth[a] - pushDepth[b]) || (a - b)),
        };
        cells.set(key, cell);
        cellOrder.push(cell);
        stats.featureCells = cells.size;
      }
      return cell;
    };

    const addNode = (boxes, player, parentId, from, dir, weight, features, key) => {
      if (nodeCount >= nodeLimit) return -1;
      const id = nodeCount++;
      writeBoxes(id, boxes);
      players[id] = player;
      parentIds[id] = parentId;
      pushedFrom[id] = from < 0 ? 0 : from;
      pushedDir[id] = dir < 0 ? 0 : dir;
      pushDepth[id] = parentId < 0 ? 0 : pushDepth[parentId] + 1;
      weights[id] = weight;
      writeFeatures(id, features);
      table.set(key, id);
      getCell(features).heap.push(id);
      openNodes++;
      stats.generated = nodeCount;
      stats.residentNodes = nodeCount;

      const score = scoreFeature(features);
      if (id === 0 || score < closestValue || (score === closestValue && pushDepth[id] < pushDepth[closestNodeId])) {
        closestValue = score;
        closestNodeId = id;
        closestRouteCacheId = -1;
      }
      if (id === 0 || betterFessScore(features, featureAt(bestFessNodeId))) bestFessNodeId = id;
      return id;
    };

    const buildCompactRoute = nodeId => {
      if (nodeId === closestRouteCacheId) return closestRouteCache;
      const chain = [];
      let id = nodeId;
      while (id > 0) {
        chain.push(id);
        id = parentIds[id];
      }
      chain.reverse();
      let route = '';
      for (const childId of chain) {
        const parentId = parentIds[childId];
        const boxes = boxesAt(parentId);
        const blocked = boxesMask(board, boxes);
        const reach = floodReach(board, blocked, players[parentId], true);
        const from = pushedFrom[childId];
        const dir = pushedDir[childId];
        const support = board.neighbours[from][OPP[dir]];
        const walk = pathTo(reach, players[parentId], support);
        if (walk === null) throw new SolverError('Could not reconstruct a legal FESS route.', 'ROUTE_RECONSTRUCTION');
        route += walk + DIRS[dir].upper;
      }
      if (nodeId === closestNodeId) {
        closestRouteCacheId = nodeId;
        closestRouteCache = route;
      }
      return route;
    };

    const makeClosest = () => {
      const id = closestNodeId;
      const f = featureAt(id);
      const route = buildCompactRoute(id);
      return {
        boardText: boardToXSB(board, { boxes: boxesAt(id), player: players[id] }),
        mixedMoves: route,
        moveCount: route.length,
        pushCount: pushDepth[id],
        goalsFilled: f.rawGoals,
        safePacked: f.packing,
        totalGoals: board.goalList.length,
        remainingEstimate: scoreFeature(f),
        legalPushes: f.mobility,
        stagnation: 0,
      };
    };

    const rootCanonical = canonicalState(board, board.initialBoxes, board.initialPlayer);
    const rootFeatures = featureValues(board, board.initialBoxes, board.initialPlayer, rootCanonical.reach);
    addNode(board.initialBoxes, board.initialPlayer, -1, -1, -1, 0, rootFeatures, rootCanonical.key);

    if (allBoxesOnGoals(board, board.initialBoxes)) {
      return { status: 'solved', strategy: 'fess', moves: '', mixedMoves: '', moveCount: 0, pushCount: 0, elapsedMs: Date.now() - startedAt, stats, message: 'The puzzle is already solved.' };
    }

    const popFromCell = cell => {
      while (cell && cell.heap.size) {
        const id = cell.heap.pop();
        if (id === null || expanded[id]) continue;
        return id;
      }
      return -1;
    };

    const selectNode = () => {
      if (!cellOrder.length) return -1;
      selectionCount++;

      // Retain FESS's broad cyclic coverage, but spend every second expansion
      // exploiting the strongest populated feature cell. This changes only
      // selection order; every other cell remains in the cycle.
      if ((selectionCount & 1) === 0) {
        const bestFeature = featureAt(bestFessNodeId);
        const focused = cells.get(cellKeyFor(bestFeature));
        const focusedId = popFromCell(focused);
        if (focusedId >= 0) return focusedId;
      }

      let checked = 0;
      while (checked < cellOrder.length) {
        const cell = cellOrder[cellCursor % cellOrder.length];
        cellCursor = (cellCursor + 1) % cellOrder.length;
        checked++;
        const id = popFromCell(cell);
        if (id >= 0) return id;
      }
      return -1;
    };

    const advisorIndexes = (moves, parentFeature) => {
      const selected = new Set();
      const add = index => { if (index >= 0) selected.add(index); };
      add(chooseAdvisorMove(moves, parentFeature, child => child.packing > parentFeature.packing));
      add(chooseAdvisorMove(moves, parentFeature, child => child.connectivity < parentFeature.connectivity));
      add(chooseAdvisorMove(moves, parentFeature, child => child.roomConnectivity < parentFeature.roomConnectivity));
      add(chooseAdvisorMove(moves, parentFeature, child => child.hotspots < parentFeature.hotspots ||
        (child.hotspots === parentFeature.hotspots && child.hotspotWeight < parentFeature.hotspotWeight)));
      add(chooseAdvisorMove(moves, parentFeature, child => child.outOfPlan < parentFeature.outOfPlan));
      add(chooseAdvisorMove(moves, parentFeature, child => child.playerReach > parentFeature.playerReach));
      add(chooseAdvisorMove(moves, parentFeature, child => child.mobility > parentFeature.mobility));
      return selected;
    };

    const sendProgress = force => {
      const now = Date.now();
      if (!force && now - lastProgress < progressEveryMs) return;
      lastProgress = now;
      let activeCells = 0;
      for (const cell of cellOrder) if (cell.heap.size) activeCells++;
      stats.activeCells = activeCells;
      const closest = makeClosest();
      onProgress?.({
        phase: 'feature-space', generated: nodeCount, open: openNodes,
        depth: pushDepth[closestNodeId], bestPushDepth: pushDepth[closestNodeId],
        elapsedMs: now - startedAt, goalsFilled: closest.goalsFilled,
        safePacked: closest.safePacked, totalGoals: board.goalList.length,
        estimate: closest.remainingEstimate, bestEstimate: closest.remainingEstimate,
        featureCells: cells.size, activeCells, activeFeatureCells: activeCells,
        deadlocks: stats.staticDeadlocks + stats.assignmentDeadlocks + stats.corralDeadlocks,
        advisorMoves: stats.advisorMoves, nonAdvisorMoves: stats.nonAdvisorMoves,
        provenDeadStates: 0, deadStateHits: 0, residentNodes: nodeCount,
        residentNodeLimit: nodeLimit, closest, stats: { ...stats },
      });
    };

    sendProgress(true);

    while (true) {
      if (shouldStop()) {
        sendProgress(true);
        return { status: 'stopped', strategy: 'fess', elapsedMs: Date.now() - startedAt, stats, closest: makeClosest(), message: 'Search cancelled.' };
      }
      if (Date.now() - startedAt >= timeLimit) {
        sendProgress(true);
        return { status: 'limit', strategy: 'fess', elapsedMs: Date.now() - startedAt, stats, closest: makeClosest(), message: 'FESS reached its solving-time limit before exhausting the puzzle.' };
      }
      if (nodeCount >= nodeLimit) {
        stats.memorySafeStops++;
        sendProgress(true);
        return {
          status: 'limit', strategy: 'fess', elapsedMs: Date.now() - startedAt, stats, closest: makeClosest(),
          message: `FESS reached its memory-safe limit of ${nodeLimit.toLocaleString()} resident states. The search stopped cleanly rather than risking a browser crash.`,
        };
      }

      const nodeId = selectNode();
      if (nodeId < 0) {
        sendProgress(true);
        return {
          status: 'unsolvable', strategy: 'fess', elapsedMs: Date.now() - startedAt, stats,
          closest: makeClosest(), message: 'FESS exhausted every reachable non-dead push state without finding a solution.',
        };
      }

      expanded[nodeId] = 1;
      openNodes--;
      stats.expanded++;
      stats.featureExpanded++;

      const boxes = boxesAt(nodeId);
      const blocked = boxesMask(board, boxes);
      const reach = floodReach(board, blocked, players[nodeId], false);
      const parentFeature = featureAt(nodeId);
      const candidates = [];
      const localKeys = new Set();

      for (let boxIndex = 0; boxIndex < boxCount; boxIndex++) {
        const from = boxes[boxIndex];
        for (let dir = 0; dir < 4; dir++) {
          const support = board.neighbours[from][OPP[dir]];
          const to = board.neighbours[from][dir];
          if (support < 0 || to < 0 || !reach.seen[support] || blocked[to]) continue;

          const childBoxes = boxes.slice();
          childBoxes[boxIndex] = to;
          childBoxes.sort();
          const canonical = canonicalState(board, childBoxes, from);
          const deadReason = provedDeadlock(board, childBoxes, from, canonical.reach, to);
          if (deadReason) {
            if (deadReason === 'box-goal-matching') stats.assignmentDeadlocks++;
            else if (deadReason === 'corral-pattern') stats.corralDeadlocks++;
            else stats.staticDeadlocks++;
            continue;
          }

          if (localKeys.has(canonical.key)) continue;
          localKeys.add(canonical.key);
          if (table.has(canonical.key)) {
            stats.transpositions++;
            continue;
          }

          const features = featureValues(board, childBoxes, from, canonical.reach);
          candidates.push({ from, dir, childBoxes, key: canonical.key, features });
        }
      }

      if (!candidates.length) stats.provenDeadStates++;
      const selected = advisorIndexes(candidates, parentFeature);
      for (let i = 0; i < candidates.length; i++) {
        if (nodeCount >= nodeLimit) break;
        const move = candidates[i];
        const edgeWeight = selected.has(i) ? 0 : 1;
        if (edgeWeight === 0) stats.advisorMoves++;
        else stats.nonAdvisorMoves++;
        const childId = addNode(move.childBoxes, move.from, nodeId, move.from, move.dir,
          weights[nodeId] + edgeWeight, move.features, move.key);
        if (childId < 0) break;
        stats.featureGenerated++;

        if (allBoxesOnGoals(board, move.childBoxes)) {
          const route = buildCompactRoute(childId);
          const validation = validateSolution(board, route);
          if (!validation.valid || !validation.solved) throw new SolverError('FESS constructed a route that failed replay verification.', 'INVALID_SOLUTION');
          sendProgress(true);
          return {
            status: 'solved', strategy: 'fess', moves: route, mixedMoves: route,
            moveCount: validation.moveCount, pushCount: validation.pushCount,
            elapsedMs: Date.now() - startedAt, stats, message: 'Solved by Feature Space Search.',
          };
        }
      }

      sendProgress(false);
      if (stats.featureExpanded % yieldEvery === 0) await delayTurn();
    }
  }

  function analyseDeadlocks(levelOrBoard, boxes = null, player = null) {
    const board = typeof levelOrBoard === 'string' ? parseLevel(levelOrBoard) : levelOrBoard;
    const positions = boxes ? boxes.slice().sort((a, b) => a - b) : board.initialBoxes.slice();
    const playerPosition = Number.isInteger(player) ? player : board.initialPlayer;
    const canonical = canonicalState(board, positions, playerPosition);
    const reason = provedDeadlock(board, positions, playerPosition, canonical.reach);
    return {
      dead: Boolean(reason),
      reason,
      safePacked: packingAnalysis(board, positions).score,
    };
  }

  return Object.freeze({
    version: '5.1.0',
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
