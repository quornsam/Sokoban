/*
 * BOXXY Sokoban Solver Core v2.4.1
 * Original browser-first implementation by OpenAI for Sam Cornwell / BOXXY.
 *
 * Search model:
 *   - Push-based Weighted A* / A*
 *   - Canonical player-reachability states
 *   - Reverse-push distance heuristic with minimum-cost box/goal matching
 *   - Fast reverse construction plus exact-pattern reverse matching for dense puzzles
 *   - Dynamic vacancy-pattern matching for large, densely interlocked boards
 *   - Static dead-square, assignment, 2x2 and recursive freeze pruning
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
    const index = boxes.indexOf(oldPos);
    if (index < 0) throw new SolverError('Internal box movement failure.', 'INTERNAL_BOX');
    const next = boxes.slice();
    if (newPos > oldPos) {
      let i = index;
      while (i + 1 < next.length && next[i + 1] < newPos) {
        next[i] = next[i + 1];
        i++;
      }
      next[i] = newPos;
    } else {
      let i = index;
      while (i > 0 && next[i - 1] > newPos) {
        next[i] = next[i - 1];
        i--;
      }
      next[i] = newPos;
    }
    return next;
  }

  function sameBoxes(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function countBoxIntersections(a, b) {
    let i = 0;
    let j = 0;
    let count = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { count++; i++; j++; }
      else if (a[i] < b[j]) i++;
      else j++;
    }
    return count;
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


  function hungarianSubset(rowPositions, targetIndices, distanceTables) {
    const n = rowPositions.length;
    if (n !== targetIndices.length) return INF;
    if (n === 0) return 0;

    const u = new Float64Array(n + 1);
    const v = new Float64Array(n + 1);
    const assignment = new Int32Array(n + 1);
    const predecessor = new Int32Array(n + 1);

    for (let i = 1; i <= n; i++) {
      assignment[0] = i;
      let column = 0;
      const minimum = new Float64Array(n + 1);
      minimum.fill(INF);
      const used = new Uint8Array(n + 1);

      do {
        used[column] = 1;
        const row = assignment[column];
        let delta = INF;
        let nextColumn = 0;

        for (let j = 1; j <= n; j++) {
          if (used[j]) continue;
          const distance = distanceTables[targetIndices[j - 1]][rowPositions[row - 1]];
          const cost = distance < 0 ? INF : distance;
          const reduced = cost - u[row] - v[j];
          if (reduced < minimum[j]) {
            minimum[j] = reduced;
            predecessor[j] = column;
          }
          if (minimum[j] < delta) {
            delta = minimum[j];
            nextColumn = j;
          }
        }

        if (delta >= INF / 2 || nextColumn === 0) return INF;
        for (let j = 0; j <= n; j++) {
          if (used[j]) {
            u[assignment[j]] += delta;
            v[j] -= delta;
          } else {
            minimum[j] -= delta;
          }
        }
        column = nextColumn;
      } while (assignment[column] !== 0);

      do {
        const previousColumn = predecessor[column];
        assignment[column] = assignment[previousColumn];
        column = previousColumn;
      } while (column !== 0);
    }

    const result = Math.round(-v[0]);
    return result >= INF / 2 ? INF : result;
  }

  function createTargetPattern(count, targets, distanceTables) {
    const targetIndex = new Int32Array(count);
    targetIndex.fill(-1);
    for (let i = 0; i < targets.length; i++) targetIndex[targets[i]] = i;
    return { count, targets, distanceTables, targetIndex };
  }

  function minCostVacancyPattern(pattern, boxes) {
    const occupied = new Uint8Array(pattern.count);
    for (const box of boxes) occupied[box] = 1;

    const displacedBoxes = [];
    const vacantTargets = [];
    for (const box of boxes) {
      if (pattern.targetIndex[box] < 0) displacedBoxes.push(box);
    }
    for (let i = 0; i < pattern.targets.length; i++) {
      if (!occupied[pattern.targets[i]]) vacantTargets.push(i);
    }

    return hungarianSubset(displacedBoxes, vacantTargets, pattern.distanceTables);
  }

  function cheapGoalDistance(board, boxes) {
    let boxSum = 0;
    for (const box of boxes) {
      let best = INF;
      for (const dist of board.reverseDistances) {
        const value = dist[box];
        if (value >= 0 && value < best) best = value;
      }
      if (best >= INF) return INF;
      boxSum += best;
    }

    // Looking from both sides is still a lower bound and is much stronger than
    // allowing every box to select the same nearby goal.
    let goalSum = 0;
    for (const dist of board.reverseDistances) {
      let best = INF;
      for (const box of boxes) {
        const value = dist[box];
        if (value >= 0 && value < best) best = value;
      }
      if (best >= INF) return INF;
      goalSum += best;
    }
    return Math.max(boxSum, goalSum);
  }

  function recursiveFreezeDeadlock(board, boxes, movedBox, scratch) {
    const boxGen = nextGeneration(scratch, 'boxGeneration', 'boxMarks');
    for (const box of boxes) scratch.boxMarks[box] = boxGen;

    // -1 unknown, 0 free, 1 blocked, 2 currently being traced. A cycle of
    // mutually supporting boxes is blocked unless one member can escape on the
    // perpendicular axis.
    const horizontal = new Int8Array(board.count);
    const vertical = new Int8Array(board.count);

    const blockedOnAxis = (pos, axis) => {
      const memo = axis === 0 ? horizontal : vertical;
      if (memo[pos] === 1) return true;
      if (memo[pos] === 0 && memo[pos] !== -1) return false;
      if (memo[pos] === 2) return true;
      memo[pos] = 2;
      const directions = axis === 0 ? [1, 3] : [0, 2];
      let result = true;
      for (const d of directions) {
        const neighbour = board.neighbours[pos][d];
        if (neighbour < 0 || board.deadSquares[neighbour]) continue;
        if (scratch.boxMarks[neighbour] !== boxGen) {
          result = false;
          break;
        }
        if (!blockedOnAxis(neighbour, 1 - axis)) {
          result = false;
          break;
        }
      }
      memo[pos] = result ? 1 : 0;
      return result;
    };

    horizontal.fill(-1);
    vertical.fill(-1);
    const queue = [movedBox];
    const seen = new Uint8Array(board.count);
    while (queue.length) {
      const pos = queue.pop();
      if (seen[pos]) continue;
      seen[pos] = 1;
      if (!board.goals[pos] && blockedOnAxis(pos, 0) && blockedOnAxis(pos, 1)) return true;
      for (let d = 0; d < 4; d++) {
        const neighbour = board.neighbours[pos][d];
        if (neighbour >= 0 && scratch.boxMarks[neighbour] === boxGen && !seen[neighbour]) queue.push(neighbour);
      }
    }
    return false;
  }

  function precomputeForwardPushDistances(board, sources) {
    const result = [];
    for (const source of sources) {
      const dist = new Int32Array(board.count);
      dist.fill(-1);
      const queue = new Int32Array(board.count);
      let qh = 0;
      let qt = 0;
      dist[source] = 0;
      queue[qt++] = source;
      while (qh < qt) {
        const pos = queue[qh++];
        for (let d = 0; d < 4; d++) {
          const destination = board.neighbours[pos][d];
          const support = board.neighbours[pos][OPP[d]];
          if (destination < 0 || support < 0 || dist[destination] >= 0) continue;
          dist[destination] = dist[pos] + 1;
          queue[qt++] = destination;
        }
      }
      result.push(dist);
    }
    return result;
  }


  function minCostMatchingDistances(distances, boxes) {
    const n = boxes.length;
    if (n === 0 || distances.length !== n) return n === 0 ? 0 : INF;
    const u = new Float64Array(n + 1);
    const v = new Float64Array(n + 1);
    const p = new Int32Array(n + 1);
    const way = new Int32Array(n + 1);
    const cost = (i, j) => {
      const value = distances[j][boxes[i]];
      return value < 0 ? INF : value;
    };
    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = new Float64Array(n + 1);
      minv.fill(INF);
      const used = new Uint8Array(n + 1);
      do {
        used[j0] = 1;
        const i0 = p[j0];
        let delta = INF;
        let j1 = 0;
        for (let j = 1; j <= n; j++) {
          if (used[j]) continue;
          const cur = cost(i0 - 1, j - 1) - u[i0] - v[j];
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
        for (let j = 0; j <= n; j++) {
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

  async function reverseAStarSearch(board, options, shared) {
    const {
      startedAt, stats, maxNodes, maxTimeMs, yieldEvery, progressEveryMs,
      onProgress, shouldStop,
    } = shared;
    const boxCount = board.initialBoxes.length;
    const nodeCap = Math.max(10_000, Math.min(Number(options.reverseAStarMaxNodes) || 1_500_000, Math.floor(maxNodes * 0.25)));
    const timeCap = Math.max(2_000, Math.min(Number(options.reverseAStarMaxTimeMs) || Math.floor(maxTimeMs * 0.22), maxTimeMs - 500));
    const weight = Math.max(1, Number(options.reverseWeight) || (boxCount >= 30 ? 10 : boxCount >= 20 ? 4.5 : 3));
    const targetBoxes = board.initialBoxes;
    const targetReach = computeReachability(board, targetBoxes, board.initialPlayer, createScratch(board), false);
    const targetAnchor = targetReach.anchor;
    const distances = precomputeForwardPushDistances(board, targetBoxes);
    const targetPattern = createTargetPattern(board.count, targetBoxes, distances);
    const reverseHCache = new Map();
    const reverseHeuristic = (boxes) => {
      const key = boxesKey(boxes);
      const cached = reverseHCache.get(key);
      if (cached !== undefined) return cached;
      const value = boxCount <= 28 ? minCostMatchingDistances(distances, boxes) : reverseAssignmentScore(distances, boxes);
      reverseHCache.set(key, value);
      return value;
    };
    const solvedBoxes = board.goalList.slice().sort((a, b) => a - b);
    const scratch = createScratch(board);
    const childScratch = createScratch(board);
    const hCache = new Map();
    const heuristic = (boxes) => {
      const key = boxesKey(boxes);
      const cached = hCache.get(key);
      if (cached !== undefined) return cached;
      const vacancy = minCostVacancyPattern(targetPattern, boxes);
      // Vacancy matching follows the complete occupied/empty pattern. If that
      // pattern temporarily has no direct assignment, fall back to the full
      // matching rather than incorrectly declaring a deadlock.
      const value = vacancy < INF ? vacancy : minCostMatchingDistances(distances, boxes);
      hCache.set(key, value);
      return value;
    };
    const nodes = [];
    const bestG = new Map();
    const open = new MinHeap((aId, bId) => {
      const a = nodes[aId];
      const b = nodes[bId];
      return (a.f - b.f) || (a.h - b.h) || (b.matches - a.matches) || (a.g - b.g) || (aId - bId);
    });
    const initialH = heuristic(solvedBoxes);
    if (initialH >= INF) return null;
    for (const component of freePlayerComponents(board, solvedBoxes)) {
      const key = stateKey(solvedBoxes, component.anchor);
      if (bestG.has(key)) continue;
      const id = nodes.length;
      nodes.push({
        boxes: solvedBoxes,
        player: component.player,
        anchor: component.anchor,
        parent: -1,
        forwardBox: -1,
        forwardDir: -1,
        g: 0,
        h: initialH,
        f: weight * initialH,
        matches: countBoxIntersections(solvedBoxes, targetBoxes),
        key,
      });
      bestG.set(key, 0);
      open.push(id);
    }
    if (!open.size) return null;

    let closestReverseId = 0;
    const betterReverseClosest = (candidate, incumbent) => {
      if (!incumbent) return true;
      if (candidate.h !== incumbent.h) return candidate.h < incumbent.h;
      if (candidate.matches !== incumbent.matches) return candidate.matches > incumbent.matches;
      return candidate.g < incumbent.g;
    };
    for (let id = 1; id < nodes.length; id++) {
      if (betterReverseClosest(nodes[id], nodes[closestReverseId])) closestReverseId = id;
    }

    stats.phase = 'reverse-a-star';
    stats.strategy = 'reverse-a-star-then-forward';
    let expanded = 0;
    let generated = nodes.length;
    let lastProgress = startedAt;
    const phaseStartedAt = performanceNow();

    while (open.size) {
      if (shouldStop()) return { stopped: true };
      const now = performanceNow();
      if (now - phaseStartedAt >= timeCap || now - startedAt >= maxTimeMs || generated >= nodeCap) break;
      const nodeId = open.pop();
      if (nodeId === null) break;
      const node = nodes[nodeId];
      if (bestG.get(node.key) !== node.g) continue;
      if (betterReverseClosest(node, nodes[closestReverseId])) closestReverseId = nodeId;
      if (sameBoxes(node.boxes, targetBoxes) && node.anchor === targetAnchor) {
        const solution = reconstructReverseSolution(board, nodes, nodeId);
        stats.reverseAStarExpanded = expanded;
        stats.reverseAStarGenerated = generated;
        stats.reverseAStarHeuristicCache = hCache.size;
        return { solution };
      }
      expanded++;
      const reach = computeReachability(board, node.boxes, node.player, scratch, false);
      const candidates = [];
      for (const box of node.boxes) {
        for (let d = 0; d < 4; d++) {
          const previousBox = board.neighbours[box][OPP[d]];
          if (previousBox < 0 || scratch.boxMarks[previousBox] === reach.boxGen || scratch.reachMarks[previousBox] !== reach.reachGen) continue;
          const previousPlayer = board.neighbours[previousBox][OPP[d]];
          if (previousPlayer < 0 || scratch.boxMarks[previousPlayer] === reach.boxGen) continue;
          const childBoxes = moveBox(node.boxes, box, previousBox);
          const h = heuristic(childBoxes);
          if (h >= INF) continue;
          const childReach = computeReachability(board, childBoxes, previousPlayer, childScratch, false);
          const key = stateKey(childBoxes, childReach.anchor);
          const g = node.g + 1;
          const oldG = bestG.get(key);
          if (oldG !== undefined && oldG <= g) continue;
          candidates.push({ previousBox, previousPlayer, d, childBoxes, anchor: childReach.anchor, key, g, h, matches: countBoxIntersections(childBoxes, targetBoxes) });
        }
      }
      candidates.sort((a, b) => (a.h - b.h) || (b.matches - a.matches) || (a.previousBox - b.previousBox));
      for (const candidate of candidates) {
        const oldG = bestG.get(candidate.key);
        if (oldG !== undefined && oldG <= candidate.g) continue;
        bestG.set(candidate.key, candidate.g);
        const childId = nodes.length;
        nodes.push({
          boxes: candidate.childBoxes,
          player: candidate.previousPlayer,
          anchor: candidate.anchor,
          parent: nodeId,
          forwardBox: candidate.previousBox,
          forwardDir: candidate.d,
          g: candidate.g,
          h: candidate.h,
          f: candidate.g + weight * candidate.h - candidate.matches * 0.08,
          matches: candidate.matches,
          key: candidate.key,
        });
        open.push(childId);
        if (betterReverseClosest(nodes[childId], nodes[closestReverseId])) closestReverseId = childId;
        generated++;
        stats.generated++;
        if (generated >= nodeCap) break;
      }
      stats.peakOpen = Math.max(stats.peakOpen, open.size);
      const after = performanceNow();
      if (onProgress && after - lastProgress >= progressEveryMs) {
        lastProgress = after;
        onProgress({
          phase: 'reverse-a-star',
          elapsedMs: Math.round(after - startedAt),
          expanded,
          generated,
          open: open.size,
          bestPushDepth: nodes[closestReverseId].g,
          bestEstimate: nodes[closestReverseId].h,
          patternMatched: nodes[closestReverseId].matches,
          patternTotal: targetBoxes.length,
          deadlocks: stats.staticDeadlocks + stats.blockDeadlocks + stats.freezeDeadlocks + stats.assignmentDeadlocks,
          peakOpen: stats.peakOpen,
        });
      }
      if (expanded % yieldEvery === 0) await immediateYield();
    }
    stats.reverseAStarExpanded = expanded;
    stats.reverseAStarGenerated = generated;
    stats.reverseAStarHeuristicCache = hCache.size;
    return null;
  }

  function reverseAssignmentScore(distances, boxes) {
    const n = boxes.length;
    const used = new Uint8Array(n);
    const order = Array.from({ length: n }, (_, i) => i);
    const reachCounts = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      let count = 0;
      for (let j = 0; j < n; j++) if (distances[j][boxes[i]] >= 0) count++;
      if (count === 0) return INF;
      reachCounts[i] = count;
    }
    order.sort((a, b) => reachCounts[a] - reachCounts[b]);

    let total = 0;
    for (const i of order) {
      let chosen = -1;
      let best = INF;
      for (let j = 0; j < n; j++) {
        if (used[j]) continue;
        const value = distances[j][boxes[i]];
        if (value >= 0 && value < best) {
          best = value;
          chosen = j;
        }
      }
      // Greedy matching is guidance, not a proof. Falling back to a duplicated
      // nearest source avoids discarding a valid state because of a greedy tie.
      if (chosen < 0) {
        for (let j = 0; j < n; j++) {
          const value = distances[j][boxes[i]];
          if (value >= 0 && value < best) best = value;
        }
        if (best >= INF) return INF;
      } else {
        used[chosen] = 1;
      }
      total += best;
    }
    return total;
  }

  function freePlayerComponents(board, boxes) {
    const occupied = new Uint8Array(board.count);
    for (const box of boxes) occupied[box] = 1;
    const seen = new Uint8Array(board.count);
    const queue = new Int32Array(board.count);
    const components = [];
    for (let start = 0; start < board.count; start++) {
      if (!board.floor[start] || occupied[start] || seen[start]) continue;
      let qh = 0;
      let qt = 0;
      let anchor = start;
      seen[start] = 1;
      queue[qt++] = start;
      while (qh < qt) {
        const pos = queue[qh++];
        if (pos < anchor) anchor = pos;
        for (let d = 0; d < 4; d++) {
          const next = board.neighbours[pos][d];
          if (next >= 0 && !occupied[next] && !seen[next]) {
            seen[next] = 1;
            queue[qt++] = next;
          }
        }
      }
      components.push({ player: start, anchor });
    }
    return components;
  }

  function reconstructFromPushActions(board, actions) {
    let boxes = board.initialBoxes.slice();
    let player = board.initialPlayer;
    const scratch = createScratch(board);
    const segments = [];
    for (const action of actions) {
      const reach = computeReachability(board, boxes, player, scratch, true);
      const support = board.neighbours[action.box][OPP[action.dir]];
      const destination = board.neighbours[action.box][action.dir];
      if (support < 0 || destination < 0 || scratch.reachMarks[support] !== reach.reachGen || hasBoxSorted(boxes, destination)) {
        throw new SolverError('Internal solution reconstruction failure.', 'INTERNAL_PATH');
      }
      segments.push(reconstructWalk(scratch, player, support) + DIRS[action.dir].upper);
      boxes = moveBox(boxes, action.box, destination);
      player = action.box;
    }
    const mixedMoves = segments.join('');
    const pushesOnly = actions.map((action) => DIRS[action.dir].upper).join('');
    return {
      mixedMoves,
      moves: mixedMoves.toUpperCase(),
      pushesOnly,
      moveCount: mixedMoves.length,
      pushCount: actions.length,
    };
  }


  async function lowerBoundMonotoneSearch(board, options, shared) {
    const {
      startedAt, stats, initialBoxes, initialH, maxTimeMs, onProgress,
      progressEveryMs, shouldStop,
    } = shared;
    const nodeCap = Math.max(10_000, Number(options.monotoneMaxNodes) || Math.min(1_500_000, Math.max(150_000, Math.floor((Number(options.maxNodes) || 600_000) * 0.45))));
    const timeCap = Math.max(1_000, Number(options.monotoneMaxTimeMs) || Math.min(90_000, Math.max(10_000, Math.floor(maxTimeMs * 0.35))));
    const currentScratch = createScratch(board);
    const childScratch = createScratch(board);
    const heuristicCache = new Map();
    const exactHeuristic = (boxes) => {
      const key = boxesKey(boxes);
      const cached = heuristicCache.get(key);
      if (cached !== undefined) return cached;
      const value = minCostMatching(board, boxes);
      heuristicCache.set(key, value);
      return value;
    };

    const initialReach = computeReachability(board, initialBoxes, board.initialPlayer, childScratch, false);
    const initialKey = stateKey(initialBoxes, initialReach.anchor);
    const nodes = [{
      boxes: initialBoxes,
      player: board.initialPlayer,
      anchor: initialReach.anchor,
      g: 0,
      h: initialH,
      parent: -1,
      pushBox: -1,
      pushDir: -1,
      key: initialKey,
      goals: countGoals(board, initialBoxes),
    }];
    const seen = new Set([initialKey]);
    const stack = [{ nodeId: 0, prepared: false, candidates: null, next: 0 }];
    let expanded = 0;
    let generated = 1;
    let lastProgress = startedAt;
    const phaseStartedAt = performanceNow();

    stats.phase = 'monotone';
    stats.strategy = 'lower-bound-then-general';

    while (stack.length) {
      if (shouldStop()) return { stopped: true };
      const now = performanceNow();
      if (now - phaseStartedAt >= timeCap || generated >= nodeCap || now - startedAt >= maxTimeMs) break;

      const frame = stack[stack.length - 1];
      const node = nodes[frame.nodeId];
      if (node.h === 0 || allBoxesOnGoals(board, node.boxes)) {
        const solution = reconstructForwardSolution(board, nodes, frame.nodeId);
        stats.monotoneExpanded = expanded;
        stats.monotoneGenerated = generated;
        stats.monotoneHeuristicCache = heuristicCache.size;
        return { solution };
      }

      if (!frame.prepared) {
        frame.prepared = true;
        expanded++;
        const reach = computeReachability(board, node.boxes, node.player, currentScratch, false);
        const candidates = [];
        for (const box of node.boxes) {
          for (let d = 0; d < 4; d++) {
            const destination = board.neighbours[box][d];
            const support = board.neighbours[box][OPP[d]];
            if (destination < 0 || support < 0) continue;
            if (currentScratch.boxMarks[destination] === reach.boxGen) continue;
            if (currentScratch.reachMarks[support] !== reach.reachGen) continue;
            if (board.deadSquares[destination]) continue;

            const childBoxes = moveBox(node.boxes, box, destination);
            if (twoByTwoDeadlock(board, childBoxes, destination)) continue;
            if (recursiveFreezeDeadlock(board, childBoxes, destination, childScratch)) continue;
            const h = exactHeuristic(childBoxes);
            // A push changes an exact box-goal assignment lower bound by at
            // most one. A solution whose length equals the lower bound must
            // therefore reduce it on every push. This removes every detour
            // while retaining all lower-bound-optimal solutions.
            if (h !== node.h - 1) continue;
            const childPlayer = box;
            const childReach = computeReachability(board, childBoxes, childPlayer, childScratch, false);
            const key = stateKey(childBoxes, childReach.anchor);
            if (seen.has(key)) continue;
            const goals = countGoals(board, childBoxes);
            candidates.push({ box, destination, d, childBoxes, childPlayer, anchor: childReach.anchor, key, h, goals });
          }
        }
        candidates.sort((a, b) => {
          const goalDeltaA = (board.goals[a.destination] ? 1 : 0) - (board.goals[a.box] ? 1 : 0);
          const goalDeltaB = (board.goals[b.destination] ? 1 : 0) - (board.goals[b.box] ? 1 : 0);
          return (goalDeltaB - goalDeltaA) || (b.goals - a.goals) || (a.destination - b.destination);
        });
        frame.candidates = candidates;
        frame.next = 0;
      }

      if (frame.next >= frame.candidates.length) {
        stack.pop();
        continue;
      }

      const candidate = frame.candidates[frame.next++];
      if (seen.has(candidate.key)) continue;
      seen.add(candidate.key);
      const childId = nodes.length;
      nodes.push({
        boxes: candidate.childBoxes,
        player: candidate.childPlayer,
        anchor: candidate.anchor,
        g: node.g + 1,
        h: candidate.h,
        parent: frame.nodeId,
        pushBox: candidate.box,
        pushDir: candidate.d,
        key: candidate.key,
        goals: candidate.goals,
      });
      generated++;
      stack.push({ nodeId: childId, prepared: false, candidates: null, next: 0 });

      const after = performanceNow();
      if (onProgress && after - lastProgress >= progressEveryMs) {
        lastProgress = after;
        onProgress({
          phase: 'monotone',
          elapsedMs: Math.round(after - startedAt),
          expanded,
          generated,
          open: stack.length,
          bestPushDepth: nodes[childId].g,
          bestEstimate: nodes[childId].h,
          deadlocks: stats.staticDeadlocks + stats.blockDeadlocks + stats.freezeDeadlocks + stats.assignmentDeadlocks,
          peakOpen: Math.max(stats.peakOpen, stack.length),
        });
      }
      if (generated % 500 === 0) await immediateYield();
    }

    stats.monotoneExpanded = expanded;
    stats.monotoneGenerated = generated;
    stats.monotoneHeuristicCache = heuristicCache.size;
    return null;
  }



  async function boundedBestFirstSearch(board, options, shared) {
    const { startedAt, stats, initialBoxes, maxTimeMs, onProgress, progressEveryMs, shouldStop } = shared;
    const nodeCap = Math.max(20_000, Number(options.boundMaxNodes) || Math.min(1_500_000, Math.max(200_000, Math.floor((Number(options.maxNodes) || 600_000) * 0.12))));
    const timeCap = Math.max(1_000, Number(options.boundMaxTimeMs) || Math.min(150_000, Math.max(10_000, Math.floor(maxTimeMs * 0.12))));
    const slack = Math.max(1, Number(options.boundSlack) || (initialBoxes.length >= 25 ? 5 : 4));
    const currentScratch = createScratch(board);
    const childScratch = createScratch(board);
    const metricScratch = createScratch(board);
    const componentScratch = createScratch(board);
    const cache = new Map();
    const exactH = (boxes) => {
      const key=boxesKey(boxes); const c=cache.get(key); if(c!==undefined)return c;
      const v=minCostMatching(board,boxes); cache.set(key,v); return v;
    };
    const rootH=exactH(initialBoxes); if(rootH>=INF)return null;
    const bound=rootH+slack;
    const rootMob=countLegalPushes(board,initialBoxes,board.initialPlayer,metricScratch);
    const rootComp=countFreeComponents(board,initialBoxes,componentScratch);
    const rootReach=computeReachability(board,initialBoxes,board.initialPlayer,childScratch,false);
    const nodes=[{boxes:initialBoxes,player:board.initialPlayer,anchor:rootReach.anchor,g:0,h:rootH,parent:-1,pushBox:-1,pushDir:-1,key:stateKey(initialBoxes,rootReach.anchor),goals:countGoals(board,initialBoxes),reachCount:rootMob.reachCount,mobility:rootMob.pushes,components:rootComp.components}];
    const bestG=new Map([[nodes[0].key,0]]);
    const open=new MinHeap((aId,bId)=>{const a=nodes[aId],b=nodes[bId];return (a.h-b.h)||(b.goals-a.goals)||(a.components-b.components)||(b.reachCount-a.reachCount)||(b.mobility-a.mobility)||(a.g-b.g)||(aId-bId);});
    open.push(0);
    let closestId=0, expanded=0, generated=1, lastProgress=startedAt;
    const closer=(a,b)=>(a.h!==b.h?a.h<b.h:a.goals!==b.goals?a.goals>b.goals:a.components!==b.components?a.components<b.components:a.reachCount!==b.reachCount?a.reachCount>b.reachCount:a.g<b.g);
    const phaseStarted=performanceNow();
    stats.phase='bounded-best'; stats.strategy='bounded-best-first';
    while(open.size && generated<nodeCap && performanceNow()-phaseStarted<timeCap && performanceNow()-startedAt<maxTimeMs){
      if(shouldStop())return {stopped:true,closest:null};
      const id=open.pop(); if(id===null)break; const node=nodes[id]; if(bestG.get(node.key)!==node.g)continue;
      if(closer(node,nodes[closestId]))closestId=id;
      if(node.h===0||allBoxesOnGoals(board,node.boxes)){
        stats.boundExpanded=expanded;stats.boundGenerated=generated;stats.boundValue=bound;stats.boundHeuristicCache=cache.size;
        return {solution:reconstructForwardSolution(board,nodes,id),closest:null};
      }
      expanded++;
      const reach=computeReachability(board,node.boxes,node.player,currentScratch,false);
      const candidates=[];
      for(const box of node.boxes){for(let d=0;d<4;d++){
        const destination=board.neighbours[box][d],support=board.neighbours[box][OPP[d]];
        if(destination<0||support<0||currentScratch.boxMarks[destination]===reach.boxGen||currentScratch.reachMarks[support]!==reach.reachGen||board.deadSquares[destination])continue;
        const childBoxes=moveBox(node.boxes,box,destination);
        if(twoByTwoDeadlock(board,childBoxes,destination)||recursiveFreezeDeadlock(board,childBoxes,destination,childScratch)||clusterImmobileDeadlock(board,childBoxes,destination,childScratch))continue;
        const h=exactH(childBoxes);if(h>=INF)continue;const g=node.g+1;if(g+h>bound)continue;
        const player=box;const childReach=computeReachability(board,childBoxes,player,childScratch,false);const key=stateKey(childBoxes,childReach.anchor);const old=bestG.get(key);if(old!==undefined&&old<=g)continue;
        const goals=countGoals(board,childBoxes);const mob=countLegalPushes(board,childBoxes,player,metricScratch);const comp=countFreeComponents(board,childBoxes,componentScratch);
        candidates.push({boxes:childBoxes,player,anchor:childReach.anchor,g,h,parent:id,pushBox:box,pushDir:d,key,goals,reachCount:mob.reachCount,mobility:mob.pushes,components:comp.components,destination,boxOld:box});
      }}
      candidates.sort((a,b)=>(a.h-b.h)||(b.goals-a.goals)||(a.components-b.components)||(b.reachCount-a.reachCount)||(b.mobility-a.mobility)||(a.destination-b.destination));
      for(const c of candidates){const old=bestG.get(c.key);if(old!==undefined&&old<=c.g)continue;bestG.set(c.key,c.g);const cid=nodes.length;nodes.push(c);open.push(cid);generated++;stats.generated++;if(closer(c,nodes[closestId]))closestId=cid;if(c.h===0||allBoxesOnGoals(board,c.boxes)){stats.boundExpanded=expanded;stats.boundGenerated=generated;stats.boundValue=bound;stats.boundHeuristicCache=cache.size;return {solution:reconstructForwardSolution(board,nodes,cid),closest:null};}if(generated>=nodeCap)break;}
      stats.peakOpen=Math.max(stats.peakOpen,open.size);
      const now=performanceNow();if(onProgress&&now-lastProgress>=progressEveryMs){lastProgress=now;const best=nodes[closestId];onProgress({phase:'bounded-best',elapsedMs:Math.round(now-startedAt),expanded,generated,open:open.size,bestPushDepth:best.g,bestEstimate:best.h,goalsFilled:best.goals,totalGoals:board.goalList.length,bound,deadlocks:stats.staticDeadlocks+stats.blockDeadlocks+stats.freezeDeadlocks+stats.assignmentDeadlocks,peakOpen:stats.peakOpen});}
      if(expanded%300===0)await immediateYield();
    }
    stats.boundExpanded=expanded;stats.boundGenerated=generated;stats.boundValue=bound;stats.boundHeuristicCache=cache.size;
    const best=nodes[closestId];
    const sol=reconstructForwardSolution(board,nodes,closestId);
    return {closest:{solution:sol,boxes:best.boxes,player:best.player,goals:best.goals,h:best.h,g:best.g,components:best.components,reachCount:best.reachCount,mobility:best.mobility}};
  }

  async function boundedPushIDA(board, options, shared) {
    const {
      startedAt, stats, initialBoxes, maxTimeMs, onProgress,
      progressEveryMs, shouldStop,
    } = shared;
    const nodeCap = Math.max(10_000, Number(options.idaMaxNodes) || Math.min(1_200_000, Math.max(120_000, Math.floor((Number(options.maxNodes) || 600_000) * 0.08))));
    const timeCap = Math.max(1_000, Number(options.idaMaxTimeMs) || Math.min(120_000, Math.max(8_000, Math.floor(maxTimeMs * 0.08))));
    const maxSlack = Math.max(0, Number(options.idaMaxSlack) || (initialBoxes.length >= 25 ? 6 : 4));
    const exactCache = new Map();
    const exactH = (boxes) => {
      const key = boxesKey(boxes);
      const cached = exactCache.get(key);
      if (cached !== undefined) return cached;
      const value = minCostMatching(board, boxes);
      exactCache.set(key, value);
      return value;
    };
    const rootH = exactH(initialBoxes);
    if (rootH >= INF) return null;
    const rootScratch = createScratch(board);
    const rootReach = computeReachability(board, initialBoxes, board.initialPlayer, rootScratch, false);
    const phaseStartedAt = performanceNow();
    let totalExpanded = 0;
    let totalGenerated = 0;
    let lastProgress = startedAt;
    let closest = { boxes: initialBoxes, player: board.initialPlayer, goals: countGoals(board, initialBoxes), h: rootH, g: 0, actions: [] };
    const isCloser = (candidate) => {
      if (candidate.h !== closest.h) return candidate.h < closest.h;
      if (candidate.goals !== closest.goals) return candidate.goals > closest.goals;
      return candidate.g < closest.g;
    };

    stats.phase = 'bounded-ida';
    stats.strategy = 'bounded-push-ida';
    for (let threshold = rootH; threshold <= rootH + maxSlack; threshold++) {
      if (performanceNow() - phaseStartedAt >= timeCap || performanceNow() - startedAt >= maxTimeMs || totalGenerated >= nodeCap) break;
      const currentScratch = createScratch(board);
      const childScratch = createScratch(board);
      const metricScratch = createScratch(board);
      const nodes = [{
        boxes: initialBoxes, player: board.initialPlayer, anchor: rootReach.anchor,
        g: 0, h: rootH, parent: -1, pushBox: -1, pushDir: -1,
        key: stateKey(initialBoxes, rootReach.anchor), goals: countGoals(board, initialBoxes),
      }];
      const bestG = new Map([[nodes[0].key, 0]]);
      const stack = [{ nodeId: 0, prepared: false, candidates: null, next: 0 }];
      let nextThreshold = INF;

      while (stack.length) {
        if (shouldStop()) return { stopped: true, closest };
        const now = performanceNow();
        if (now - phaseStartedAt >= timeCap || now - startedAt >= maxTimeMs || totalGenerated >= nodeCap) break;
        const frame = stack[stack.length - 1];
        const node = nodes[frame.nodeId];
        if (node.h === 0 || allBoxesOnGoals(board, node.boxes)) {
          stats.idaExpanded = totalExpanded;
          stats.idaGenerated = totalGenerated;
          stats.idaThreshold = threshold;
          stats.idaHeuristicCache = exactCache.size;
          return { solution: reconstructForwardSolution(board, nodes, frame.nodeId), closest };
        }
        if (!frame.prepared) {
          frame.prepared = true;
          totalExpanded++;
          const reach = computeReachability(board, node.boxes, node.player, currentScratch, false);
          const candidates = [];
          for (const box of node.boxes) {
            for (let d = 0; d < 4; d++) {
              const destination = board.neighbours[box][d];
              const support = board.neighbours[box][OPP[d]];
              if (destination < 0 || support < 0) continue;
              if (currentScratch.boxMarks[destination] === reach.boxGen) continue;
              if (currentScratch.reachMarks[support] !== reach.reachGen) continue;
              if (board.deadSquares[destination]) continue;
              const childBoxes = moveBox(node.boxes, box, destination);
              if (twoByTwoDeadlock(board, childBoxes, destination)) continue;
              if (recursiveFreezeDeadlock(board, childBoxes, destination, childScratch)) continue;
              if (clusterImmobileDeadlock(board, childBoxes, destination, childScratch)) continue;
              const h = exactH(childBoxes);
              if (h >= INF) continue;
              const g = node.g + 1;
              const f = g + h;
              if (f > threshold) {
                if (f < nextThreshold) nextThreshold = f;
                continue;
              }
              const childPlayer = box;
              const childReach = computeReachability(board, childBoxes, childPlayer, childScratch, false);
              const key = stateKey(childBoxes, childReach.anchor);
              const oldG = bestG.get(key);
              if (oldG !== undefined && oldG <= g) continue;
              const goals = countGoals(board, childBoxes);
              const mobility = countLegalPushes(board, childBoxes, childPlayer, metricScratch);
              candidates.push({ box, destination, d, childBoxes, childPlayer, anchor: childReach.anchor, key, g, h, goals, mobility: mobility.pushes, reachCount: mobility.reachCount });
            }
          }
          candidates.sort((a,b) => {
            const goalDeltaA=(board.goals[a.destination]?1:0)-(board.goals[a.box]?1:0);
            const goalDeltaB=(board.goals[b.destination]?1:0)-(board.goals[b.box]?1:0);
            return (a.h-b.h)||(goalDeltaB-goalDeltaA)||(b.goals-a.goals)||(b.reachCount-a.reachCount)||(b.mobility-a.mobility)||(a.destination-b.destination);
          });
          frame.candidates = candidates;
          frame.next = 0;
        }
        if (frame.next >= frame.candidates.length) {
          stack.pop();
          continue;
        }
        const candidate = frame.candidates[frame.next++];
        const oldG = bestG.get(candidate.key);
        if (oldG !== undefined && oldG <= candidate.g) continue;
        bestG.set(candidate.key, candidate.g);
        const childId = nodes.length;
        nodes.push({
          boxes:candidate.childBoxes, player:candidate.childPlayer, anchor:candidate.anchor,
          g:candidate.g, h:candidate.h, parent:frame.nodeId, pushBox:candidate.box,
          pushDir:candidate.d, key:candidate.key, goals:candidate.goals,
        });
        totalGenerated++;
        const actions=[]; let trace=childId;
        while(trace>=0 && nodes[trace].parent>=0){actions.push({box:nodes[trace].pushBox,dir:nodes[trace].pushDir});trace=nodes[trace].parent;}
        actions.reverse();
        const closeCandidate={boxes:candidate.childBoxes,player:candidate.childPlayer,goals:candidate.goals,h:candidate.h,g:candidate.g,actions};
        if(isCloser(closeCandidate)) closest=closeCandidate;
        stack.push({nodeId:childId,prepared:false,candidates:null,next:0});
        const after=performanceNow();
        if(onProgress && after-lastProgress>=progressEveryMs){
          lastProgress=after;
          onProgress({phase:'bounded-ida',elapsedMs:Math.round(after-startedAt),expanded:totalExpanded,generated:totalGenerated,open:stack.length,bestPushDepth:closest.g,bestEstimate:closest.h,goalsFilled:closest.goals,totalGoals:board.goalList.length,threshold,deadlocks:stats.staticDeadlocks+stats.blockDeadlocks+stats.freezeDeadlocks+stats.assignmentDeadlocks,peakOpen:Math.max(stats.peakOpen,stack.length)});
        }
        if(totalGenerated%300===0) await immediateYield();
      }
      if (nextThreshold > threshold + 1 && nextThreshold < INF) threshold = nextThreshold - 1;
    }
    stats.idaExpanded = totalExpanded;
    stats.idaGenerated = totalGenerated;
    stats.idaHeuristicCache = exactCache.size;
    const solution = reconstructFromPushActions(board, closest.actions || []);
    return { closest: { ...closest, solution } };
  }

  function reconstructForwardSolution(board, nodes, nodeId) {
    const actions = [];
    let id = nodeId;
    while (id >= 0 && nodes[id].parent >= 0) {
      const node = nodes[id];
      actions.push({ box: node.pushBox, dir: node.pushDir });
      id = node.parent;
    }
    actions.reverse();
    return reconstructFromPushActions(board, actions);
  }

  function reconstructReverseSolution(board, nodes, nodeId) {
    const actions = [];
    let id = nodeId;
    // Each reverse child stores the forward push that returns it to its parent.
    // Walking from the found initial state up to the solved root is therefore
    // already in forward solution order.
    while (id >= 0 && nodes[id].parent >= 0) {
      const node = nodes[id];
      actions.push({ box: node.forwardBox, dir: node.forwardDir });
      id = node.parent;
    }
    return reconstructFromPushActions(board, actions);
  }

  async function reverseConstructionSearch(board, options, shared) {
    const {
      startedAt, stats, maxNodes, maxTimeMs, yieldEvery, progressEveryMs,
      onProgress, shouldStop,
    } = shared;
    const boxCount = board.initialBoxes.length;
    const beamWidth = Math.max(100, Number(options.beamWidth) || (boxCount >= 20 ? 1000 : boxCount >= 12 ? 1100 : 1200));
    const maxDepth = Math.max(60, Number(options.reverseMaxDepth) || Math.min(320, boxCount * 6 + 80));
    const nodeCap = Math.max(1000, Math.min(Number(options.reverseMaxNodes) || 1200000, Math.floor(maxNodes * 0.48)));
    const timeCap = Math.max(1000, Math.min(Number(options.reverseMaxTimeMs) || Math.floor(maxTimeMs * 0.30), maxTimeMs - 500));
    const targetBoxes = board.initialBoxes;
    const targetReach = computeReachability(board, targetBoxes, board.initialPlayer, createScratch(board), false);
    const targetAnchor = targetReach.anchor;
    const distances = precomputeForwardPushDistances(board, targetBoxes);
    const useExactReverse = options.reverseExact === true && boxCount <= 28;
    const reverseHCache = new Map();
    const reverseHeuristic = (boxes) => {
      const key = boxesKey(boxes);
      const cached = reverseHCache.get(key);
      if (cached !== undefined) return cached;
      const value = useExactReverse ? minCostMatchingDistances(distances, boxes) : reverseAssignmentScore(distances, boxes);
      reverseHCache.set(key, value);
      return value;
    };
    const solvedBoxes = board.goalList.slice().sort((a, b) => a - b);
    const nodes = [];
    const visited = new Map();
    let frontier = [];
    const reverseScratch = createScratch(board);
    const reverseChildScratch = createScratch(board);

    for (const component of freePlayerComponents(board, solvedBoxes)) {
      const h = reverseHeuristic(solvedBoxes);
      if (h >= INF) continue;
      const key = stateKey(solvedBoxes, component.anchor);
      if (visited.has(key)) continue;
      const id = nodes.length;
      nodes.push({
        boxes: solvedBoxes,
        player: component.player,
        anchor: component.anchor,
        parent: -1,
        forwardBox: -1,
        forwardDir: -1,
        h,
        depth: 0,
        matches: countBoxIntersections(solvedBoxes, targetBoxes),
        score: useExactReverse ? h * 100 - countBoxIntersections(solvedBoxes, targetBoxes) * 4 + id * 0.0001 : h * 100 + id,
      });
      visited.set(key, id);
      frontier.push(id);
    }
    if (!frontier.length) return null;

    stats.phase = useExactReverse ? 'reverse-pattern' : 'reverse';
    stats.strategy = useExactReverse ? 'exact-pattern-reverse' : 'reverse-construction';
    let lastProgress = startedAt;
    let reverseExpanded = 0;
    let reverseGenerated = nodes.length;

    for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
      if (shouldStop()) return { stopped: true };
      const now = performanceNow();
      if (now - startedAt >= timeCap || reverseGenerated >= nodeCap) break;
      const candidates = [];

      for (const nodeId of frontier) {
        const node = nodes[nodeId];
        const reach = computeReachability(board, node.boxes, node.player, reverseScratch, false);
        reverseExpanded++;

        for (const box of node.boxes) {
          for (let d = 0; d < 4; d++) {
            // Undo a forward push in direction d: box c returns to b=c-d,
            // while the player steps back to b-d.
            const previousBox = board.neighbours[box][OPP[d]];
            if (previousBox < 0 || reverseScratch.boxMarks[previousBox] === reach.boxGen || reverseScratch.reachMarks[previousBox] !== reach.reachGen) continue;
            const previousPlayer = board.neighbours[previousBox][OPP[d]];
            if (previousPlayer < 0 || reverseScratch.boxMarks[previousPlayer] === reach.boxGen) continue;

            const childBoxes = moveBox(node.boxes, box, previousBox);
            const childReach = computeReachability(board, childBoxes, previousPlayer, reverseChildScratch, false);
            const key = stateKey(childBoxes, childReach.anchor);
            if (visited.has(key)) {
              stats.duplicates++;
              continue;
            }
            const h = reverseHeuristic(childBoxes);
            if (h >= INF) continue;
            const childId = nodes.length;
            nodes.push({
              boxes: childBoxes,
              player: previousPlayer,
              anchor: childReach.anchor,
              parent: nodeId,
              forwardBox: previousBox,
              forwardDir: d,
              h,
              matches: countBoxIntersections(childBoxes, targetBoxes),
              depth: depth + 1,
              score: useExactReverse ? h * 100 - countBoxIntersections(childBoxes, targetBoxes) * 4 + depth + 1 : h * 100 + depth + 1,
            });
            visited.set(key, childId);
            candidates.push(childId);
            reverseGenerated++;
            stats.generated++;

            if (sameBoxes(childBoxes, targetBoxes) && childReach.anchor === targetAnchor) {
              const solution = reconstructReverseSolution(board, nodes, childId);
              stats.reverseExpanded = reverseExpanded;
              stats.reverseGenerated = reverseGenerated;
              stats.beamWidth = beamWidth;
              return { solution };
            }
            if (reverseGenerated >= nodeCap) break;
          }
          if (reverseGenerated >= nodeCap) break;
        }
        if (reverseGenerated >= nodeCap) break;
      }

      candidates.sort((aId, bId) => {
        const a = nodes[aId];
        const b = nodes[bId];
        if (useExactReverse) return (a.score - b.score) || (a.h - b.h) || (b.matches - a.matches) || (aId - bId);
        return (a.score - b.score) || (a.h - b.h) || (aId - bId);
      });
      if (candidates.length > beamWidth) stats.beamPruned += candidates.length - beamWidth;
      frontier = candidates.slice(0, beamWidth);
      stats.peakOpen = Math.max(stats.peakOpen, frontier.length);

      const afterDepth = performanceNow();
      if (onProgress && afterDepth - lastProgress >= progressEveryMs) {
        lastProgress = afterDepth;
        const best = frontier.length ? nodes[frontier[0]] : null;
        onProgress({
          phase: useExactReverse ? 'reverse-pattern' : 'reverse',
          elapsedMs: Math.round(afterDepth - startedAt),
          expanded: reverseExpanded,
          generated: reverseGenerated,
          open: frontier.length,
          bestPushDepth: depth + 1,
          bestEstimate: best ? best.h : null,
          beamWidth,
          deadlocks: stats.staticDeadlocks + stats.blockDeadlocks + stats.freezeDeadlocks + stats.assignmentDeadlocks,
          peakOpen: stats.peakOpen,
        });
      }
      if ((depth + 1) % Math.max(1, Math.floor(yieldEvery / 250)) === 0) await immediateYield();
    }

    stats.reverseExpanded = reverseExpanded;
    stats.reverseGenerated = reverseGenerated;
    stats.beamWidth = beamWidth;
    return null;
  }

  function makeResult(status, startedAt, stats, extra = {}) {
    return {
      status,
      elapsedMs: Math.round(performanceNow() - startedAt),
      stats: { ...stats },
      ...extra,
    };
  }

  function chooseClosestAttempt(current, candidate) {
    if (!candidate) return current || null;
    if (!current) return candidate;
    const aH = Number.isFinite(Number(current.h)) ? Number(current.h) : INF;
    const bH = Number.isFinite(Number(candidate.h)) ? Number(candidate.h) : INF;
    if (bH !== aH) return bH < aH ? candidate : current;
    const aGoals = Number(current.goals || 0);
    const bGoals = Number(candidate.goals || 0);
    if (bGoals !== aGoals) return bGoals > aGoals ? candidate : current;
    const aComponents = Number.isFinite(Number(current.components)) ? Number(current.components) : INF;
    const bComponents = Number.isFinite(Number(candidate.components)) ? Number(candidate.components) : INF;
    if (bComponents !== aComponents) return bComponents < aComponents ? candidate : current;
    const aReach = Number(current.reachCount || 0);
    const bReach = Number(candidate.reachCount || 0);
    if (bReach !== aReach) return bReach > aReach ? candidate : current;
    const aMobility = Number(current.mobility || 0);
    const bMobility = Number(candidate.mobility || 0);
    if (bMobility !== aMobility) return bMobility > aMobility ? candidate : current;
    return Number(candidate.g || 0) < Number(current.g || 0) ? candidate : current;
  }

  function makeClosestResult(board, attempt) {
    if (!attempt) return null;
    const solution = attempt.solution || { mixedMoves: '', moveCount: 0, pushCount: 0 };
    const state = { player: attempt.player, boxes: attempt.boxes ? attempt.boxes.slice() : board.initialBoxes.slice() };
    return {
      mixedMoves: solution.mixedMoves || '',
      moveCount: solution.moveCount || 0,
      pushCount: solution.pushCount || attempt.g || 0,
      goalsFilled: attempt.goals || countGoals(board, state.boxes),
      totalGoals: board.goalList.length,
      remainingEstimate: attempt.h,
      boardText: boardToXSB(board, state),
      components: attempt.components,
      reachableSquares: attempt.reachCount,
      legalPushes: attempt.mobility,
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


  function countFreeComponents(board, boxes, scratch) {
    const boxGen = nextGeneration(scratch, 'boxGeneration', 'boxMarks');
    for (const box of boxes) scratch.boxMarks[box] = boxGen;
    const seenGen = nextGeneration(scratch, 'reachGeneration', 'reachMarks');
    const queue = scratch.queue;
    let components = 0;
    let largest = 0;
    for (let start = 0; start < board.count; start++) {
      if (!board.floor[start] || scratch.boxMarks[start] === boxGen || scratch.reachMarks[start] === seenGen) continue;
      components++;
      let qh = 0;
      let qt = 0;
      scratch.reachMarks[start] = seenGen;
      queue[qt++] = start;
      while (qh < qt) {
        const pos = queue[qh++];
        for (let d = 0; d < 4; d++) {
          const next = board.neighbours[pos][d];
          if (next < 0 || scratch.boxMarks[next] === boxGen || scratch.reachMarks[next] === seenGen) continue;
          scratch.reachMarks[next] = seenGen;
          queue[qt++] = next;
        }
      }
      if (qt > largest) largest = qt;
    }
    return { components, largest };
  }

  function countLegalPushes(board, boxes, player, scratch) {
    const reach = computeReachability(board, boxes, player, scratch, false);
    let pushes = 0;
    for (const box of boxes) {
      for (let d = 0; d < 4; d++) {
        const destination = board.neighbours[box][d];
        const support = board.neighbours[box][OPP[d]];
        if (destination < 0 || support < 0) continue;
        if (scratch.boxMarks[destination] === reach.boxGen) continue;
        if (scratch.reachMarks[support] !== reach.reachGen) continue;
        pushes++;
      }
    }
    return { pushes, reachCount: reach.reachableCount, anchor: reach.anchor };
  }

  function clusterImmobileDeadlock(board, boxes, movedBox, scratch) {
    const boxGen = nextGeneration(scratch, 'boxGeneration', 'boxMarks');
    for (const box of boxes) scratch.boxMarks[box] = boxGen;
    const seen = new Uint8Array(board.count);
    const stack = [movedBox];
    let hasOffGoal = false;
    let hasGeometricPush = false;
    while (stack.length) {
      const pos = stack.pop();
      if (seen[pos]) continue;
      seen[pos] = 1;
      if (!board.goals[pos]) hasOffGoal = true;
      for (let d = 0; d < 4; d++) {
        const neighbour = board.neighbours[pos][d];
        if (neighbour >= 0 && scratch.boxMarks[neighbour] === boxGen && !seen[neighbour]) stack.push(neighbour);
        const destination = board.neighbours[pos][d];
        const support = board.neighbours[pos][OPP[d]];
        if (destination >= 0 && support >= 0 && scratch.boxMarks[destination] !== boxGen && scratch.boxMarks[support] !== boxGen) {
          hasGeometricPush = true;
        }
      }
    }
    return hasOffGoal && !hasGeometricPush;
  }

  function featureCellKey(node) {
    const hBucket = Math.min(99, Math.floor(node.h / 2));
    const reachBucket = Math.min(31, Math.floor(node.reachCount / 4));
    const mobilityBucket = Math.min(31, Math.floor(node.mobility / 3));
    return `${node.goals}|${hBucket}|${node.components}|${reachBucket}|${mobilityBucket}`;
  }

  function reconstructMacroSolution(board, nodes, nodeId) {
    const edges = [];
    let id = nodeId;
    while (id >= 0 && nodes[id].parent >= 0) {
      edges.push(nodes[id].edgeActions || []);
      id = nodes[id].parent;
    }
    edges.reverse();
    const actions = [];
    for (const edge of edges) actions.push(...edge);
    return reconstructFromPushActions(board, actions);
  }

  function generateSameBoxMacros(board, node, boxStart, options, shared) {
    const maxPushes = Math.max(2, Number(options.macroMaxPushes) || 14);
    const maxStates = Math.max(12, Number(options.macroStatesPerBox) || 72);
    const scratch = createScratch(board);
    const childScratch = createScratch(board);
    const queue = [{ boxes: node.boxes, player: node.player, box: boxStart, actions: [], lastDir: -1 }];
    const visited = new Set();
    const results = [];
    let qh = 0;
    while (qh < queue.length && queue.length <= maxStates * 5) {
      const current = queue[qh++];
      const reach = computeReachability(board, current.boxes, current.player, scratch, false);
      const localKey = `${current.box}|${reach.anchor}`;
      if (visited.has(localKey)) continue;
      visited.add(localKey);
      if (current.actions.length) results.push(current);
      if (current.actions.length >= maxPushes) continue;
      for (let d = 0; d < 4; d++) {
        const destination = board.neighbours[current.box][d];
        const support = board.neighbours[current.box][OPP[d]];
        if (destination < 0 || support < 0) continue;
        if (scratch.boxMarks[destination] === reach.boxGen) continue;
        if (scratch.reachMarks[support] !== reach.reachGen) continue;
        if (board.deadSquares[destination]) continue;
        const childBoxes = moveBox(current.boxes, current.box, destination);
        if (twoByTwoDeadlock(board, childBoxes, destination)) continue;
        if (recursiveFreezeDeadlock(board, childBoxes, destination, childScratch)) continue;
        if (clusterImmobileDeadlock(board, childBoxes, destination, childScratch)) continue;
        const actions = current.actions.concat([{ box: current.box, dir: d }]);
        queue.push({ boxes: childBoxes, player: current.box, box: destination, actions, lastDir: d });
      }
    }
    if (results.length <= maxStates) return results;
    // Retain a diverse set of endpoints: goals, turns, long macros, and distinct
    // destination squares. The full one-push move set is generated separately,
    // so this cap affects guidance rather than completeness.
    const byDestination = new Map();
    for (const result of results) {
      const existing = byDestination.get(result.box);
      const score = (board.goals[result.box] ? 1000 : 0) + result.actions.length * 4 + (result.actions.length > 1 && result.actions.at(-1).dir !== result.actions.at(-2).dir ? 25 : 0);
      if (!existing || score > existing.score) byDestination.set(result.box, { result, score });
    }
    return [...byDestination.values()].sort((a, b) => b.score - a.score).slice(0, maxStates).map((entry) => entry.result);
  }

  async function featureSpaceSearch(board, options, shared, heuristic) {
    const {
      startedAt, stats, maxNodes, maxTimeMs, yieldEvery, progressEveryMs,
      onProgress, shouldStop,
    } = shared;
    const nodeCap = Math.max(20_000, Math.min(Number(options.featureMaxNodes) || Math.floor(maxNodes * 0.30), maxNodes));
    const timeCap = Math.max(2_000, Math.min(Number(options.featureMaxTimeMs) || Math.floor(maxTimeMs * 0.30), maxTimeMs - 500));
    const featureScratch = createScratch(board);
    const metricScratch = createScratch(board);
    const childScratch = createScratch(board);
    const initialBoxes = board.initialBoxes.slice();
    const initialMobility = countLegalPushes(board, initialBoxes, board.initialPlayer, metricScratch);
    const initialComp = countFreeComponents(board, initialBoxes, featureScratch);
    const initialH = heuristic(initialBoxes);
    const nodes = [];
    const queues = [];
    const expanded = new Uint8Array(nodeCap + 8);
    const bestCost = new Map();
    const cellCounts = new Map();
    const makeNode = (data) => {
      const id = nodes.length;
      const node = { id, ...data };
      node.cell = featureCellKey(node);
      nodes.push(node);
      cellCounts.set(node.cell, (cellCounts.get(node.cell) || 0) + 1);
      return node;
    };
    const comparators = [
      (aId,bId)=>{const a=nodes[aId],b=nodes[bId];return (a.advisorCost-b.advisorCost)||(a.h-b.h)||(b.goals-a.goals)||(a.g-b.g)||(aId-bId);},
      (aId,bId)=>{const a=nodes[aId],b=nodes[bId];return (b.goals-a.goals)||(a.h-b.h)||(a.components-b.components)||(a.advisorCost-b.advisorCost)||(aId-bId);},
      (aId,bId)=>{const a=nodes[aId],b=nodes[bId];return (a.h-b.h)||(b.goals-a.goals)||(b.reachCount-a.reachCount)||(a.advisorCost-b.advisorCost)||(aId-bId);},
      (aId,bId)=>{const a=nodes[aId],b=nodes[bId];return (a.components-b.components)||(b.reachCount-a.reachCount)||(b.mobility-a.mobility)||(a.h-b.h)||(aId-bId);},
      (aId,bId)=>{const a=nodes[aId],b=nodes[bId];return ((cellCounts.get(a.cell)||0)-(cellCounts.get(b.cell)||0))||(a.advisorCost-b.advisorCost)||(a.h-b.h)||(aId-bId);},
    ];
    for (const compare of comparators) queues.push(new MinHeap(compare));
    const initialReach = computeReachability(board, initialBoxes, board.initialPlayer, childScratch, false);
    const root = makeNode({
      boxes: initialBoxes, player: board.initialPlayer, anchor: initialReach.anchor,
      parent: -1, edgeActions: [], g: 0, h: initialH,
      goals: countGoals(board, initialBoxes), components: initialComp.components,
      reachCount: initialMobility.reachCount, mobility: initialMobility.pushes,
      advisorCost: 0, key: stateKey(initialBoxes, initialReach.anchor),
    });
    bestCost.set(root.key, { cost: 0, g: 0 });
    for (const q of queues) q.push(root.id);
    let closestId = root.id;
    const betterClosest = (a,b) => {
      if (a.goals !== b.goals) return a.goals > b.goals;
      if (a.h !== b.h) return a.h < b.h;
      if (a.components !== b.components) return a.components < b.components;
      if (a.reachCount !== b.reachCount) return a.reachCount > b.reachCount;
      if (a.mobility !== b.mobility) return a.mobility > b.mobility;
      return a.g < b.g;
    };
    let generated = 1;
    let expandedCount = 0;
    let queueCursor = 0;
    let lastProgress = startedAt;
    const phaseStartedAt = performanceNow();
    stats.phase = 'feature-space';
    stats.strategy = 'feature-space-macro';
    stats.featureCells = 1;

    while (generated < nodeCap && performanceNow() - phaseStartedAt < timeCap && performanceNow() - startedAt < maxTimeMs) {
      if (shouldStop()) return { stopped: true, closest: closestId };
      let nodeId = null;
      for (let tries = 0; tries < queues.length; tries++) {
        const q = queues[queueCursor++ % queues.length];
        while (q.size) {
          const candidate = q.pop();
          if (candidate !== null && !expanded[candidate]) { nodeId = candidate; break; }
        }
        if (nodeId !== null) break;
      }
      if (nodeId === null) break;
      const node = nodes[nodeId];
      expanded[nodeId] = 1;
      expandedCount++;
      if (betterClosest(node, nodes[closestId])) closestId = nodeId;
      if (allBoxesOnGoals(board, node.boxes)) {
        stats.featureExpanded = expandedCount;
        stats.featureGenerated = generated;
        stats.featureCells = cellCounts.size;
        return { solution: reconstructMacroSolution(board, nodes, nodeId), closest: nodeId };
      }

      const reach = computeReachability(board, node.boxes, node.player, metricScratch, false);
      const legalBoxes = [];
      for (const box of node.boxes) {
        let canPush = false;
        for (let d = 0; d < 4; d++) {
          const destination = board.neighbours[box][d];
          const support = board.neighbours[box][OPP[d]];
          if (destination >= 0 && support >= 0 && metricScratch.boxMarks[destination] !== reach.boxGen && metricScratch.reachMarks[support] === reach.reachGen) { canPush = true; break; }
        }
        if (canPush) legalBoxes.push(box);
      }

      const generatedChildren = [];
      for (const box of legalBoxes) {
        // Single-box macro endpoints include all one-push children and selected
        // longer paths. This is the critical abstraction used by Festival/FESS.
        const macros = generateSameBoxMacros(board, node, box, options, shared);
        for (const macro of macros) {
          const childBoxes = macro.boxes;
          const h = heuristic(childBoxes);
          if (h >= INF) { stats.assignmentDeadlocks++; continue; }
          const childMobility = countLegalPushes(board, childBoxes, macro.player, childScratch);
          const childComp = countFreeComponents(board, childBoxes, featureScratch);
          const childReach = computeReachability(board, childBoxes, macro.player, childScratch, false);
          const key = stateKey(childBoxes, childReach.anchor);
          const g = node.g + macro.actions.length;
          const goals = countGoals(board, childBoxes);
          let edgeCost = 1;
          if (goals > node.goals || h < node.h || childComp.components < node.components || childMobility.reachCount > node.reachCount + 2) edgeCost = 0;
          if (goals < node.goals) edgeCost += 2;
          if (h > node.h) edgeCost += 1;
          if (childComp.components > node.components) edgeCost += 1;
          const advisorCost = node.advisorCost + edgeCost;
          const old = bestCost.get(key);
          if (old && (old.cost < advisorCost || (old.cost === advisorCost && old.g <= g))) { stats.duplicates++; continue; }
          bestCost.set(key, { cost: advisorCost, g });
          generatedChildren.push({ boxes: childBoxes, player: macro.player, anchor: childReach.anchor, parent: nodeId, edgeActions: macro.actions, g, h, goals, components: childComp.components, reachCount: childMobility.reachCount, mobility: childMobility.pushes, advisorCost, key });
        }
      }
      // Keep all novel / improving children, but cap highly redundant macro
      // endpoints from one expansion. One-push states remain represented across
      // repeated feature-space scans.
      generatedChildren.sort((a,b)=>(a.advisorCost-b.advisorCost)||(b.goals-a.goals)||(a.h-b.h)||(a.components-b.components)||(b.reachCount-a.reachCount)||(a.g-b.g));
      const perExpansionCap = Math.max(80, Number(options.featureChildrenCap) || 420);
      for (const childData of generatedChildren.slice(0, perExpansionCap)) {
        if (generated >= nodeCap) break;
        const child = makeNode(childData);
        if (betterClosest(child, nodes[closestId])) closestId = child.id;
        for (const q of queues) q.push(child.id);
        generated++;
        stats.generated++;
        if (allBoxesOnGoals(board, child.boxes)) {
          stats.featureExpanded = expandedCount;
          stats.featureGenerated = generated;
          stats.featureCells = cellCounts.size;
          return { solution: reconstructMacroSolution(board, nodes, child.id), closest: child.id };
        }
      }
      stats.peakOpen = Math.max(stats.peakOpen, ...queues.map(q=>q.size));
      const now = performanceNow();
      if (onProgress && now - lastProgress >= progressEveryMs) {
        lastProgress = now;
        const closest = nodes[closestId];
        onProgress({
          phase: 'feature-space', elapsedMs: Math.round(now-startedAt), expanded: expandedCount,
          generated, open: queues.reduce((sum,q)=>sum+q.size,0), bestPushDepth: closest.g,
          bestEstimate: closest.h, goalsFilled: closest.goals, totalGoals: board.goalList.length,
          featureCells: cellCounts.size,
          deadlocks: stats.staticDeadlocks + stats.blockDeadlocks + stats.freezeDeadlocks + stats.assignmentDeadlocks,
          peakOpen: stats.peakOpen,
        });
      }
      if (expandedCount % Math.max(20, Math.floor(yieldEvery / 8)) === 0) await immediateYield();
    }
    stats.featureExpanded = expandedCount;
    stats.featureGenerated = generated;
    stats.featureCells = cellCounts.size;
    const closestNode = nodes[closestId];
    return { closest: {
      solution: reconstructMacroSolution(board, nodes, closestId),
      boxes: closestNode.boxes,
      player: closestNode.player,
      goals: closestNode.goals,
      h: closestNode.h,
      g: closestNode.g,
      components: closestNode.components,
      reachCount: closestNode.reachCount,
      mobility: closestNode.mobility,
    }};
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
      freezeDeadlocks: 0,
      assignmentDeadlocks: 0,
      beamPruned: 0,
      reverseExpanded: 0,
      reverseGenerated: 0,
      reverseAStarExpanded: 0,
      reverseAStarGenerated: 0,
      monotoneExpanded: 0,
      monotoneGenerated: 0,
      featureExpanded: 0,
      featureGenerated: 0,
      featureCells: 0,
      idaExpanded: 0,
      idaGenerated: 0,
      boundExpanded: 0,
      boundGenerated: 0,
      phase: 'initialising',
      strategy: 'forward-a-star',
      peakOpen: 0,
      heuristicCache: 0,
      weight,
      optimalPushes: weight === 1,
    };

    const currentScratch = createScratch(board);
    const childScratch = createScratch(board);
    const heuristicCache = new Map();
    const exactMatching = options.exactMatching === true || board.initialBoxes.length <= 12;
    const goalPattern = createTargetPattern(board.count, board.goalList, board.reverseDistances);
    const useVacancyPattern = options.vacancyPattern !== false && board.initialBoxes.length >= 16;
    const heuristic = (boxes) => {
      const key = boxesKey(boxes);
      const cached = heuristicCache.get(key);
      if (cached !== undefined) return cached;

      let h;
      if (useVacancyPattern) {
        const vacancy = minCostVacancyPattern(goalPattern, boxes);
        h = vacancy < INF
          ? vacancy
          : (exactMatching ? minCostMatching(board, boxes) : cheapGoalDistance(board, boxes));
      } else {
        h = exactMatching ? minCostMatching(board, boxes) : cheapGoalDistance(board, boxes);
      }
      heuristicCache.set(key, h);
      return h;
    };
    stats.heuristicType = useVacancyPattern
      ? 'dynamic vacancy-pattern matching'
      : (exactMatching ? 'minimum-cost matching' : 'two-sided push distance');

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

    // First try to prove the assignment lower bound attainable. Dense patterned
    // levels often have an optimal route in which every push makes necessary
    // progress. This search is exact for that class and avoids millions of
    // detours without assuming any particular visual pattern.
    const exactInitialH = exactMatching ? initialH : minCostMatching(board, initialBoxes);
    const monotoneAllowance = initialBoxes.length + Math.max(2, Math.floor(initialBoxes.length * 0.2));
    const useMonotone = options.monotone !== false && initialBoxes.length >= 3 && initialBoxes.length <= 12 && exactInitialH < INF && exactInitialH <= monotoneAllowance;
    if (useMonotone) {
      const monotoneResult = await lowerBoundMonotoneSearch(board, options, {
        startedAt, stats, initialBoxes, initialH: exactInitialH, maxTimeMs,
        onProgress, progressEveryMs, shouldStop,
      });
      if (monotoneResult?.stopped) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('stopped', startedAt, stats, { message: 'Search stopped.' });
      }
      if (monotoneResult?.solution) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('solved', startedAt, stats, {
          ...monotoneResult.solution,
          strategy: 'lower-bound-monotone',
          message: 'Solved at the exact assignment lower bound: every push makes necessary progress.',
        });
      }
    }

    let closestAttempt = null;

    // Dense patterned boards benefit from a complete weighted reverse A* search:
    // it searches only configurations that are guaranteed to have a route to
    // the goals, while exact assignment to the initial box pattern supplies a
    // much stronger direction than the forward nearest-goal estimate.
    const useReverseAStar = options.reverseAStar === true || (options.reverseAStar !== false && initialBoxes.length >= 30 && initialBoxes.length <= 45);
    if (useReverseAStar) {
      const reverseAStarResult = await reverseAStarSearch(board, options, {
        startedAt, stats, maxNodes, maxTimeMs, yieldEvery, progressEveryMs,
        onProgress, shouldStop,
      });
      if (reverseAStarResult?.stopped) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('stopped', startedAt, stats, { message: 'Search stopped.' });
      }
      if (reverseAStarResult?.solution) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('solved', startedAt, stats, {
          ...reverseAStarResult.solution,
          strategy: 'reverse-a-star',
          message: 'Solved by exact-pattern reverse A* search and verified forwards.',
        });
      }
    }

    // Dense levels are often much easier when built backwards from the fully
    // solved position. Every retained reverse state has a known route back to
    // all goals, so the search does not waste time inside forward dead ends.
    const useReverse = options.reverse !== false && (initialBoxes.length >= 14 || ((mode === 'deep' || mode === 'thorough') && initialBoxes.length >= 8));
    if (useReverse) {
      const fastReverseOptions = {
        ...options,
        reverseExact: false,
        reverseMaxNodes: Math.min(Number(options.reverseFastMaxNodes) || 650000, Math.floor(maxNodes * 0.20)),
        reverseMaxTimeMs: Math.min(Number(options.reverseFastMaxTimeMs) || 15000, Math.floor(maxTimeMs * 0.16)),
      };
      const fastReverseResult = await reverseConstructionSearch(board, fastReverseOptions, {
        startedAt, stats, maxNodes, maxTimeMs, yieldEvery, progressEveryMs,
        onProgress, shouldStop,
      });
      if (fastReverseResult?.stopped) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('stopped', startedAt, stats, { message: 'Search stopped.' });
      }
      if (fastReverseResult?.solution) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('solved', startedAt, stats, {
          ...fastReverseResult.solution,
          strategy: 'reverse-construction',
          message: 'Solved by constructing a verified route backwards from the completed goal position.',
        });
      }

      const remainingTime = maxTimeMs - (performanceNow() - startedAt);
      if (remainingTime > 3000 && initialBoxes.length <= 28) {
        const exactReverseOptions = {
          ...options,
          reverseExact: true,
          beamWidth: Number(options.exactBeamWidth) || 1000,
          reverseMaxNodes: Math.min(Number(options.reverseExactMaxNodes) || 1500000, Math.floor(maxNodes * 0.5)),
          reverseMaxTimeMs: Math.min(Number(options.reverseExactMaxTimeMs) || 120000, Math.floor(remainingTime * 0.65)),
        };
        const exactReverseResult = await reverseConstructionSearch(board, exactReverseOptions, {
          startedAt, stats, maxNodes, maxTimeMs, yieldEvery, progressEveryMs,
          onProgress, shouldStop,
        });
        if (exactReverseResult?.stopped) {
          stats.heuristicCache = heuristicCache.size;
          return makeResult('stopped', startedAt, stats, { message: 'Search stopped.' });
        }
        if (exactReverseResult?.solution) {
          stats.heuristicCache = heuristicCache.size;
          return makeResult('solved', startedAt, stats, {
            ...exactReverseResult.solution,
            strategy: 'exact-pattern-reverse',
            message: 'Solved by matching the complete box pattern backwards from the goals and verifying the route forwards.',
          });
        }
      }

      stats.phase = 'forward';
      stats.strategy = 'reverse-then-forward';
      if (onProgress) onProgress({
        phase: 'forward',
        elapsedMs: Math.round(performanceNow() - startedAt),
        expanded: stats.reverseExpanded,
        generated: stats.generated,
        open: 0,
        bestPushDepth: 0,
        bestEstimate: initialH,
        deadlocks: stats.staticDeadlocks + stats.blockDeadlocks + stats.freezeDeadlocks + stats.assignmentDeadlocks,
        peakOpen: stats.peakOpen,
      });
    }

    // Search directly inside a small push-cost band above the exact
    // assignment lower bound. Unlike IDA*, this does not waste most of its time
    // proving that lower, impossible bounds contain no solution; it is aimed at
    // finding a valid route rather than proving optimality.
    const useBoundedBest = options.boundedBest === true || (options.boundedBest !== false && initialBoxes.length >= 16 && initialBoxes.length <= 45);
    if (useBoundedBest) {
      const boundedResult = await boundedBestFirstSearch(board, options, {
        startedAt, stats, initialBoxes, maxTimeMs, onProgress, progressEveryMs, shouldStop,
      });
      if (boundedResult?.stopped) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('stopped', startedAt, stats, { message: 'Search stopped.' });
      }
      if (boundedResult?.solution) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('solved', startedAt, stats, {
          ...boundedResult.solution,
          strategy: 'bounded-best-first',
          message: 'Solved inside a narrow push-cost band above the exact assignment lower bound.',
        });
      }
      if (boundedResult?.closest) closestAttempt = chooseClosestAttempt(closestAttempt, boundedResult.closest);
    }

    // Near-lower-bound push search. Many patterned collections have a
    // solution only a few pushes above the exact box-goal assignment lower
    // bound. Iterative bounded search explores that region without hard-coding
    // a particular level.
    const useBoundedIDA = options.boundedIDA === true || (options.boundedIDA !== false && initialBoxes.length >= 16 && initialBoxes.length <= 45);
    if (useBoundedIDA) {
      const idaResult = await boundedPushIDA(board, options, {
        startedAt, stats, initialBoxes, maxTimeMs, onProgress,
        progressEveryMs, shouldStop,
      });
      if (idaResult?.stopped) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('stopped', startedAt, stats, { message: 'Search stopped.' });
      }
      if (idaResult?.solution) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('solved', startedAt, stats, {
          ...idaResult.solution,
          strategy: 'bounded-push-ida',
          message: 'Solved by bounded push search near the exact assignment lower bound.',
        });
      }
      if (idaResult?.closest) closestAttempt = chooseClosestAttempt(closestAttempt, idaResult.closest);
    }

    // Difficult dense boards are then explored with a FESS-inspired
    // multi-feature search. It alternates between packing, assignment distance,
    // connectivity, mobility and novelty instead of collapsing all guidance
    // into one A* number. Same-box macro moves let one strategic action span
    // several pushes while every intermediate position is deadlock checked.
    const useFeatureSpace = options.featureSpace === true || (options.featureSpace !== false && initialBoxes.length >= 16);
    if (useFeatureSpace) {
      const featureResult = await featureSpaceSearch(board, options, {
        startedAt, stats, maxNodes, maxTimeMs, yieldEvery, progressEveryMs,
        onProgress, shouldStop,
      }, heuristic);
      if (featureResult?.stopped) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('stopped', startedAt, stats, { message: 'Search stopped.' });
      }
      if (featureResult?.solution) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('solved', startedAt, stats, {
          ...featureResult.solution,
          strategy: 'feature-space-macro',
          message: 'Solved with multi-feature space search and same-box macro moves.',
        });
      }
      if (featureResult?.closest) closestAttempt = chooseClosestAttempt(closestAttempt, featureResult.closest);
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
      pushBox: -1,
      pushDir: -1,
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
    let closestForwardId = 0;
    const betterForwardClosest = (candidate, incumbent) => {
      if (candidate.h !== incumbent.h) return candidate.h < incumbent.h;
      if (candidate.goals !== incumbent.goals) return candidate.goals > incumbent.goals;
      return candidate.g < incumbent.g;
    };
    const captureForwardClosest = () => {
      const best = nodes[closestForwardId];
      if (!best) return closestAttempt;
      return chooseClosestAttempt(closestAttempt, {
        solution: reconstructForwardSolution(board, nodes, closestForwardId),
        boxes: best.boxes,
        player: best.player,
        goals: best.goals,
        h: best.h,
        g: best.g,
      });
    };
    stats.phase = 'forward';
    stats.peakOpen = Math.max(stats.peakOpen, 1);
    let lastProgress = startedAt;

    while (open.size > 0) {
      if (shouldStop()) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('stopped', startedAt, stats, { message: 'Search stopped.' });
      }
      const now = performanceNow();
      if (now - startedAt >= maxTimeMs) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('limit', startedAt, stats, { message: `Time limit reached after ${(maxTimeMs / 1000).toFixed(1)} seconds.`, closest: (() => { const attempt = captureForwardClosest(); return attempt ? makeClosestResult(board, attempt) : undefined; })() });
      }
      if (stats.generated >= maxNodes) {
        stats.heuristicCache = heuristicCache.size;
        return makeResult('limit', startedAt, stats, { message: `Node limit reached (${maxNodes.toLocaleString()}).`, closest: (() => { const attempt = captureForwardClosest(); return attempt ? makeClosestResult(board, attempt) : undefined; })() });
      }

      const nodeId = open.pop();
      if (nodeId === null) break;
      const node = nodes[nodeId];
      if (bestG.get(node.key) !== node.g) continue; // stale heap entry
      if (betterForwardClosest(node, nodes[closestForwardId])) closestForwardId = nodeId;

      if (allBoxesOnGoals(board, node.boxes)) {
        const solution = reconstructForwardSolution(board, nodes, nodeId);
        stats.heuristicCache = heuristicCache.size;
        return makeResult('solved', startedAt, stats, {
          ...solution,
          message: weight === 1 ? 'Solved with the minimum number of pushes.' : 'Solved. Fast mode does not guarantee the minimum number of pushes.',
        });
      }

      stats.expanded++;
      const reach = computeReachability(board, node.boxes, node.player, currentScratch, false);
      const candidates = [];

      for (const box of node.boxes) {
        for (let d = 0; d < 4; d++) {
          const destination = board.neighbours[box][d];
          const support = board.neighbours[box][OPP[d]];
          if (destination < 0 || support < 0) continue;
          if (currentScratch.boxMarks[destination] === reach.boxGen) continue;
          if (currentScratch.reachMarks[support] !== reach.reachGen) continue;
          candidates.push({ box, destination, d });
        }
      }

      // Good move ordering is important even when it does not alter completeness.
      candidates.sort((a, b) => {
        const goalDeltaA = (board.goals[a.destination] ? 1 : 0) - (board.goals[a.box] ? 1 : 0);
        const goalDeltaB = (board.goals[b.destination] ? 1 : 0) - (board.goals[b.box] ? 1 : 0);
        return goalDeltaB - goalDeltaA || a.destination - b.destination;
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
        if (recursiveFreezeDeadlock(board, childBoxes, candidate.destination, childScratch)) {
          stats.freezeDeadlocks++;
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
          pushBox: candidate.box,
          pushDir: candidate.d,
          key,
          goals,
        });
        open.push(childId);
        if (betterForwardClosest(nodes[childId], nodes[closestForwardId])) closestForwardId = childId;
        stats.generated++;
        if (open.size > stats.peakOpen) stats.peakOpen = open.size;

        if (allBoxesOnGoals(board, childBoxes)) {
          const solution = reconstructForwardSolution(board, nodes, childId);
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
          phase: 'forward',
          elapsedMs: Math.round(afterExpansion - startedAt),
          expanded: stats.expanded,
          generated: stats.generated,
          open: open.size,
          bestPushDepth: node.g,
          bestEstimate: node.h,
          deadlocks: stats.staticDeadlocks + stats.blockDeadlocks + stats.freezeDeadlocks + stats.assignmentDeadlocks,
          peakOpen: stats.peakOpen,
        });
      }
      if (stats.expanded % yieldEvery === 0) await immediateYield();
    }

    stats.heuristicCache = heuristicCache.size;
    return makeResult('unsolvable', startedAt, stats, {
      message: 'The complete reachable push-state graph was exhausted without finding a solution.',
      closest: (() => { const attempt = captureForwardClosest(); return attempt ? makeClosestResult(board, attempt) : undefined; })(),
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
    version: '2.4.1',
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
