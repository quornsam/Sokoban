/*
 * BOXXY Sokoban Solver Core v1.0
 * Original browser-first implementation by OpenAI for Sam Cornwell / BOXXY.
 *
 * Search model:
 *   - Push-based Weighted A* / A*
 *   - Canonical player-reachability states
 *   - Reverse-push distance heuristic with minimum-cost box/goal matching
 *   - Static dead-square, assignment and conservative 2x2 deadlock pruning
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
      if (a.length === 0) return null;
      const root = a[0];
      const last = a.pop();
      if (a.length && last !== undefined) {
        let i = 0;
        while (true) {
          const l = i * 2 + 1;
          if (l >= a.length) break;
          const r = l + 1;
          let c = l;
          if (r < a.length && this.compare(a[r], a[l]) < 0) c = r;
          if (this.compare(last, a[c]) <= 0) break;
          a[i] = a[c];
          i = c;
        }
        a[i] = last;
      }
      return root;
    }
  }

  function normaliseLevelText(text) {
    if (typeof text !== 'string') throw new SolverError('The level must be supplied as text.', 'INVALID_LEVEL');
    let lines = text.replace(/\r/g, '').split('\n');

    // Ignore common XSB comment/title lines, but only when they are not part of a board.
    lines = lines.filter((line) => !/^\s*;/.test(line));
    while (lines.length && lines[0].trim() === '') lines.shift();
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    if (!lines.length) throw new SolverError('The level is empty.', 'EMPTY_LEVEL');
    return lines;
  }

  function parseLevel(text) {
    const lines = normaliseLevelText(text);
    const height = lines.length;
    const width = Math.max(...lines.map((line) => line.length));
    if (width < 3 || height < 3) throw new SolverError('The level is too small to be a Sokoban board.', 'INVALID_LEVEL');

    const count = width * height;
    const raw = new Array(count).fill(' ');
    for (let y = 0; y < height; y++) {
      const line = lines[y];
      for (let x = 0; x < line.length; x++) raw[y * width + x] = line[x];
    }

    const valid = new Set([' ', '#', '.', '$', '@', '*', '+', '-', '_']);
    for (let i = 0; i < count; i++) {
      if (!valid.has(raw[i])) {
        const x = i % width;
        const y = Math.floor(i / width);
        throw new SolverError(`Unsupported character ${JSON.stringify(raw[i])} at row ${y + 1}, column ${x + 1}.`, 'INVALID_CHARACTER');
      }
    }

    // Spaces connected to the outer border are void, not playable floor.
    const outside = new Uint8Array(count);
    const queue = new Int32Array(count);
    let qh = 0;
    let qt = 0;
    const enqueueOutside = (pos) => {
      if (pos < 0 || pos >= count || outside[pos] || raw[pos] !== ' ') return;
      outside[pos] = 1;
      queue[qt++] = pos;
    };
    for (let x = 0; x < width; x++) {
      enqueueOutside(x);
      enqueueOutside((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
      enqueueOutside(y * width);
      enqueueOutside(y * width + width - 1);
    }
    while (qh < qt) {
      const pos = queue[qh++];
      const x = pos % width;
      const y = Math.floor(pos / width);
      if (y > 0) enqueueOutside(pos - width);
      if (x + 1 < width) enqueueOutside(pos + 1);
      if (y + 1 < height) enqueueOutside(pos + width);
      if (x > 0) enqueueOutside(pos - 1);
    }

    const floor = new Uint8Array(count);
    const goals = new Uint8Array(count);
    const boxes = [];
    let player = -1;
    let players = 0;

    for (let pos = 0; pos < count; pos++) {
      const ch = raw[pos];
      if (ch === '#') continue;
      if (ch === ' ' && outside[pos]) continue;
      floor[pos] = 1;
      if (ch === '.' || ch === '*' || ch === '+') goals[pos] = 1;
      if (ch === '$' || ch === '*') boxes.push(pos);
      if (ch === '@' || ch === '+') {
        player = pos;
        players++;
      }
    }

    if (players !== 1) throw new SolverError(`The level must contain exactly one player; found ${players}.`, 'PLAYER_COUNT');
    const goalList = [];
    for (let i = 0; i < count; i++) if (goals[i]) goalList.push(i);
    if (boxes.length === 0) throw new SolverError('The level contains no boxes.', 'NO_BOXES');
    if (boxes.length !== goalList.length) {
      throw new SolverError(`The level has ${boxes.length} box${boxes.length === 1 ? '' : 'es'} but ${goalList.length} goal${goalList.length === 1 ? '' : 's'}.`, 'BOX_GOAL_MISMATCH');
    }
    if (!floor[player]) throw new SolverError('The player is not on a playable square.', 'INVALID_PLAYER');

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
      reverseDistances: null,
      deadSquares: null,
      floorCount: floor.reduce((sum, value) => sum + value, 0),
    };
    precomputeBoard(board);
    return board;
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

  function precomputeBoard(board) {
    const distances = [];
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
          // Reverse of a forward push predecessor -> current.
          const predecessor = board.neighbours[current][OPP[d]];
          if (predecessor < 0) continue;
          const support = board.neighbours[predecessor][OPP[d]];
          if (support < 0 || dist[predecessor] >= 0) continue;
          dist[predecessor] = dist[current] + 1;
          queue[qt++] = predecessor;
        }
      }
      distances.push(dist);
    }
    board.reverseDistances = distances;

    const dead = new Uint8Array(board.count);
    for (let pos = 0; pos < board.count; pos++) {
      if (!board.floor[pos] || board.goals[pos]) continue;
      let reachesGoal = false;
      for (const dist of distances) {
        if (dist[pos] >= 0) {
          reachesGoal = true;
          break;
        }
      }
      if (!reachesGoal) dead[pos] = 1;
    }
    board.deadSquares = dead;
  }

  function createScratch(board) {
    return {
      boxMarks: new Uint32Array(board.count),
      boxGeneration: 0,
      reachMarks: new Uint32Array(board.count),
      reachGeneration: 0,
      parent: new Int32Array(board.count),
      parentDir: new Int8Array(board.count),
      queue: new Int32Array(board.count),
    };
  }

  function nextGeneration(scratch, field, marks) {
    scratch[field]++;
    if (scratch[field] === 0xffffffff) {
      scratch[marks].fill(0);
      scratch[field] = 1;
    }
    return scratch[field];
  }

  function computeReachability(board, boxes, player, scratch, withParents) {
    const boxGen = nextGeneration(scratch, 'boxGeneration', 'boxMarks');
    for (const box of boxes) scratch.boxMarks[box] = boxGen;

    const reachGen = nextGeneration(scratch, 'reachGeneration', 'reachMarks');
    const q = scratch.queue;
    let qh = 0;
    let qt = 0;
    let anchor = player;
    scratch.reachMarks[player] = reachGen;
    if (withParents) {
      scratch.parent[player] = -1;
      scratch.parentDir[player] = -1;
    }
    q[qt++] = player;

    while (qh < qt) {
      const p = q[qh++];
      if (p < anchor) anchor = p;
      for (let d = 0; d < 4; d++) {
        const n = board.neighbours[p][d];
        if (n < 0 || scratch.boxMarks[n] === boxGen || scratch.reachMarks[n] === reachGen) continue;
        scratch.reachMarks[n] = reachGen;
        if (withParents) {
          scratch.parent[n] = p;
          scratch.parentDir[n] = d;
        }
        q[qt++] = n;
      }
    }

    return { boxGen, reachGen, anchor, reachableCount: qt };
  }

  function reconstructWalk(scratch, start, target) {
    if (start === target) return '';
    const chars = [];
    let p = target;
    while (p !== start) {
      const d = scratch.parentDir[p];
      if (d < 0) throw new SolverError('Internal path reconstruction failure.', 'INTERNAL_PATH');
      chars.push(DIRS[d].lower);
      p = scratch.parent[p];
    }
    chars.reverse();
    return chars.join('');
  }

  function hasBoxSorted(boxes, pos) {
    let lo = 0;
    let hi = boxes.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const value = boxes[mid];
      if (value === pos) return true;
      if (value < pos) lo = mid + 1;
      else hi = mid - 1;
    }
    return false;
  }

  function moveBox(boxes, oldPos, newPos) {
    const next = boxes.slice();
    const index = next.indexOf(oldPos);
    next[index] = newPos;
    next.sort((a, b) => a - b);
    return next;
  }

  function boxesKey(boxes) {
    return boxes.join(',');
  }

  function stateKey(boxes, anchor) {
    return `${boxes.join(',')}|${anchor}`;
  }

  function allBoxesOnGoals(board, boxes) {
    for (const box of boxes) if (!board.goals[box]) return false;
    return true;
  }

  function countGoals(board, boxes) {
    let count = 0;
    for (const box of boxes) count += board.goals[box] ? 1 : 0;
    return count;
  }

  function twoByTwoDeadlock(board, boxes, movedBox) {
    const x = movedBox % board.width;
    const y = Math.floor(movedBox / board.width);
    const candidates = [
      [x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y],
    ];
    for (const [left, top] of candidates) {
      if (left < 0 || top < 0 || left + 1 >= board.width || top + 1 >= board.height) continue;
      const cells = [
        top * board.width + left,
        top * board.width + left + 1,
        (top + 1) * board.width + left,
        (top + 1) * board.width + left + 1,
      ];
      let fullyBlocked = true;
      let hasOffGoalBox = false;
      for (const cell of cells) {
        const box = hasBoxSorted(boxes, cell);
        if (board.floor[cell] && !box) {
          fullyBlocked = false;
          break;
        }
        if (box && !board.goals[cell]) hasOffGoalBox = true;
      }
      if (fullyBlocked && hasOffGoalBox) return true;
    }
    return false;
  }

  function minCostMatching(board, boxes) {
    const n = boxes.length;
    if (n === 0) return 0;
    const m = board.goalList.length;
    if (n !== m) return INF;

    // Hungarian algorithm for a square minimum-cost assignment.
    const u = new Float64Array(n + 1);
    const v = new Float64Array(m + 1);
    const p = new Int32Array(m + 1);
    const way = new Int32Array(m + 1);

    const cost = (i, j) => {
      const d = board.reverseDistances[j][boxes[i]];
      return d < 0 ? INF : d;
    };

    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = new Float64Array(m + 1);
      minv.fill(INF);
      const used = new Uint8Array(m + 1);
      do {
        used[j0] = 1;
        const i0 = p[j0];
        let delta = INF;
        let j1 = 0;
        for (let j = 1; j <= m; j++) {
          if (used[j]) continue;
          const c = cost(i0 - 1, j - 1);
          const cur = c - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
        if (delta >= INF / 2 || j1 === 0) return INF;
        for (let j = 0; j <= m; j++) {
          if (used[j]) {
            u[p[j]] += delta;
            v[j] -= delta;
          } else {
            minv[j] -= delta;
          }
        }
        j0 = j1;
      } while (p[j0] !== 0);

      do {
        const j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0 !== 0);
    }

    const result = Math.round(-v[0]);
    return result >= INF / 2 ? INF : result;
  }

  function reconstructSolution(nodes, nodeId) {
    const segments = [];
    let id = nodeId;
    while (id >= 0) {
      const node = nodes[id];
      if (node.segment) segments.push(node.segment);
      id = node.parent;
    }
    segments.reverse();
    const mixedMoves = segments.join('');
    const moves = mixedMoves.toUpperCase();
    const pushesOnly = mixedMoves.replace(/[urdl]/g, '');
    return {
      mixedMoves,
      moves,
      pushesOnly,
      moveCount: mixedMoves.length,
      pushCount: pushesOnly.length,
    };
  }

  function makeResult(status, startedAt, stats, extra = {}) {
    return {
      status,
      elapsedMs: Math.round(performanceNow() - startedAt),
      stats: { ...stats },
      ...extra,
    };
  }

  function performanceNow() {
    if (typeof performance !== 'undefined' && performance.now) return performance.now();
    return Date.now();
  }

  function immediateYield() {
    return new Promise((resolve) => {
      if (typeof setTimeout === 'function') setTimeout(resolve, 0);
      else resolve();
    });
  }

  async function solve(levelOrBoard, options = {}) {
    const board = typeof levelOrBoard === 'string' ? parseLevel(levelOrBoard) : levelOrBoard;
    if (!board || !board.floor || !board.initialBoxes) throw new SolverError('Invalid parsed board.', 'INVALID_BOARD');

    const mode = options.mode || 'fast';
    const weight = Number.isFinite(options.weight)
      ? Math.max(1, options.weight)
      : mode === 'optimal' ? 1 : mode === 'thorough' ? 1.35 : 2.2;
    const maxNodes = Math.max(1, Number(options.maxNodes) || (mode === 'optimal' ? 1_500_000 : 600_000));
    const maxTimeMs = Math.max(1, Number(options.maxTimeMs) || (mode === 'optimal' ? 120_000 : 30_000));
    const yieldEvery = Math.max(50, Number(options.yieldEvery) || 750);
    const progressEveryMs = Math.max(50, Number(options.progressEveryMs) || 150);
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    const shouldStop = typeof options.shouldStop === 'function' ? options.shouldStop : () => Boolean(options.signal && options.signal.aborted);

    const startedAt = performanceNow();
    const stats = {
      expanded: 0,
      generated: 0,
      reopened: 0,
      duplicates: 0,
      staticDeadlocks: 0,
      blockDeadlocks: 0,
      assignmentDeadlocks: 0,
      peakOpen: 0,
      heuristicCache: 0,
      weight,
      optimalPushes: weight === 1,
    };

    const currentScratch = createScratch(board);
    const childScratch = createScratch(board);
    const heuristicCache = new Map();
    const heuristic = (boxes) => {
      const key = boxesKey(boxes);
      const cached = heuristicCache.get(key);
      if (cached !== undefined) return cached;
      const h = minCostMatching(board, boxes);
      heuristicCache.set(key, h);
      return h;
    };

    const initialBoxes = board.initialBoxes.slice();
    if (allBoxesOnGoals(board, initialBoxes)) {
      return makeResult('solved', startedAt, stats, {
        mixedMoves: '', moves: '', pushesOnly: '', moveCount: 0, pushCount: 0,
        message: 'The level is already solved.',
      });
    }

    for (const box of initialBoxes) {
      if (board.deadSquares[box]) {
        stats.staticDeadlocks++;
        return makeResult('unsolvable', startedAt, stats, {
          message: 'A box starts on a static dead square from which no goal can be reached.',
        });
      }
    }

    const initialH = heuristic(initialBoxes);
    if (initialH >= INF) {
      stats.assignmentDeadlocks++;
      return makeResult('unsolvable', startedAt, stats, {
        message: 'The boxes cannot be assigned to distinct goals under the board geometry.',
      });
    }

    const initialReach = computeReachability(board, initialBoxes, board.initialPlayer, childScratch, false);
    const initialKey = stateKey(initialBoxes, initialReach.anchor);
    const nodes = [{
      boxes: initialBoxes,
      player: board.initialPlayer,
      anchor: initialReach.anchor,
      g: 0,
      h: initialH,
      f: weight * initialH,
      parent: -1,
      segment: '',
      key: initialKey,
      goals: countGoals(board, initialBoxes),
    }];

    const bestG = new Map([[initialKey, 0]]);
    const open = new MinHeap((aId, bId) => {
      const a = nodes[aId];
      const b = nodes[bId];
      return (a.f - b.f) || (a.h - b.h) || (b.goals - a.goals) || (a.g - b.g) || (aId - bId);
    });
    open.push(0);
    stats.peakOpen = 1;
    let lastProgress = startedAt;

    while (open.size > 0) {
      if (shouldStop()) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('stopped', startedAt, stats, { message: 'Search stopped.' });
      }
      const now = performanceNow();
      if (now - startedAt >= maxTimeMs) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('limit', startedAt, stats, { message: `Time limit reached after ${(maxTimeMs / 1000).toFixed(1)} seconds.` });
      }
      if (stats.generated >= maxNodes) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('limit', startedAt, stats, { message: `Node limit reached (${maxNodes.toLocaleString()}).` });
      }

      const nodeId = open.pop();
      if (nodeId === null) break;
      const node = nodes[nodeId];
      if (bestG.get(node.key) !== node.g) continue; // stale heap entry

      if (allBoxesOnGoals(board, node.boxes)) {
        const solution = reconstructSolution(nodes, nodeId);
        stats.heuristicCache = heuristicCache.size;
        return makeResult('solved', startedAt, stats, {
          ...solution,
          message: weight === 1 ? 'Solved with the minimum number of pushes.' : 'Solved. Fast mode does not guarantee the minimum number of pushes.',
        });
      }

      stats.expanded++;
      const reach = computeReachability(board, node.boxes, node.player, currentScratch, true);
      const candidates = [];

      for (const box of node.boxes) {
        for (let d = 0; d < 4; d++) {
          const destination = board.neighbours[box][d];
          const support = board.neighbours[box][OPP[d]];
          if (destination < 0 || support < 0) continue;
          if (currentScratch.boxMarks[destination] === reach.boxGen) continue;
          if (currentScratch.reachMarks[support] !== reach.reachGen) continue;
          const walk = reconstructWalk(currentScratch, node.player, support);
          candidates.push({ box, destination, d, segment: walk + DIRS[d].upper });
        }
      }

      // Good move ordering is important even when it does not alter completeness.
      candidates.sort((a, b) => {
        const goalDeltaA = (board.goals[a.destination] ? 1 : 0) - (board.goals[a.box] ? 1 : 0);
        const goalDeltaB = (board.goals[b.destination] ? 1 : 0) - (board.goals[b.box] ? 1 : 0);
        return goalDeltaB - goalDeltaA || a.segment.length - b.segment.length;
      });

      for (const candidate of candidates) {
        if (board.deadSquares[candidate.destination]) {
          stats.staticDeadlocks++;
          continue;
        }

        const childBoxes = moveBox(node.boxes, candidate.box, candidate.destination);
        if (twoByTwoDeadlock(board, childBoxes, candidate.destination)) {
          stats.blockDeadlocks++;
          continue;
        }

        const h = heuristic(childBoxes);
        if (h >= INF) {
          stats.assignmentDeadlocks++;
          continue;
        }

        const childPlayer = candidate.box; // after the push, the player occupies the box's old square
        const childReach = computeReachability(board, childBoxes, childPlayer, childScratch, false);
        const key = stateKey(childBoxes, childReach.anchor);
        const g = node.g + 1;
        const oldG = bestG.get(key);
        if (oldG !== undefined && oldG <= g) {
          stats.duplicates++;
          continue;
        }
        if (oldG !== undefined) stats.reopened++;
        bestG.set(key, g);

        const childId = nodes.length;
        const goals = countGoals(board, childBoxes);
        nodes.push({
          boxes: childBoxes,
          player: childPlayer,
          anchor: childReach.anchor,
          g,
          h,
          f: g + weight * h,
          parent: nodeId,
          segment: candidate.segment,
          key,
          goals,
        });
        open.push(childId);
        stats.generated++;
        if (open.size > stats.peakOpen) stats.peakOpen = open.size;

        if (allBoxesOnGoals(board, childBoxes)) {
          const solution = reconstructSolution(nodes, childId);
          stats.heuristicCache = heuristicCache.size;
          return makeResult('solved', startedAt, stats, {
            ...solution,
            message: weight === 1 ? 'Solved with the minimum number of pushes.' : 'Solved. Fast mode does not guarantee the minimum number of pushes.',
          });
        }
      }

      const afterExpansion = performanceNow();
      if (onProgress && afterExpansion - lastProgress >= progressEveryMs) {
        lastProgress = afterExpansion;
        onProgress({
          elapsedMs: Math.round(afterExpansion - startedAt),
          expanded: stats.expanded,
          generated: stats.generated,
          open: open.size,
          bestPushDepth: node.g,
          bestEstimate: node.h,
          deadlocks: stats.staticDeadlocks + stats.blockDeadlocks + stats.assignmentDeadlocks,
          peakOpen: stats.peakOpen,
        });
      }
      if (stats.expanded % yieldEvery === 0) await immediateYield();
    }

    stats.heuristicCache = heuristicCache.size;
    return makeResult('unsolvable', startedAt, stats, {
      message: 'The complete reachable push-state graph was exhausted without finding a solution.',
    });
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
    if (destination < 0 || state.boxes.includes(destination)) {
      return { ok: false, pushed: false, reason: 'The box cannot be pushed.' };
    }
    state.boxes[boxIndex] = destination;
    state.boxes.sort((a, b) => a - b);
    state.player = next;
    return { ok: true, pushed: true };
  }

  function validateSolution(levelOrBoard, moves) {
    const board = typeof levelOrBoard === 'string' ? parseLevel(levelOrBoard) : levelOrBoard;
    const state = createInitialState(board);
    let pushes = 0;
    for (let i = 0; i < moves.length; i++) {
      const ch = moves[i];
      if (!/[udlrUDLR]/.test(ch)) continue;
      const result = applyMove(board, state, ch);
      if (!result.ok) {
        return { valid: false, solved: false, index: i, reason: result.reason, state };
      }
      if (result.pushed) pushes++;
    }
    return {
      valid: true,
      solved: allBoxesOnGoals(board, state.boxes),
      moveCount: moves.replace(/[^udlrUDLR]/g, '').length,
      pushCount: pushes,
      state,
    };
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

  return Object.freeze({
    version: '1.0.0',
    DIRS,
    SolverError,
    parseLevel,
    solve,
    validateSolution,
    createInitialState,
    applyMove,
    boardToXSB,
    allBoxesOnGoals,
  });
});
