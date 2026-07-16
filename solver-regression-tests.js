/* BOXXY v119 pure-FESS solver regression tests.
 * Run with: node solver-regression-tests.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const core = require('./solver-core.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadPacks() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8'), context);
  return context.window.BOXXY_LEVEL_PACKS;
}

const packs = loadPacks();
const allLevels = packs.flatMap(pack => pack.levels.map(level => ({ pack, level })));
const microban = packs.find(pack => pack.id === 'microban');
const chessboards = packs.find(pack => pack.id === 'chessboards');

(async () => {
  assert(core.version === '5.4.0', `Unexpected solver-core version ${core.version}.`);

  // Structural pruning must not falsely reject any supplied starting board.
  let analysed = 0;
  for (const { pack, level } of allLevels) {
    const text = level.layout.join('\n');
    const analysis = core.analyseDeadlocks(text);
    assert(!analysis.dead, `False initial deadlock on ${pack.id} level ${level.rank}: ${analysis.reason}`);
    analysed++;
  }
  assert(analysed === 238, `Expected 238 supplied boards; analysed ${analysed}.`);

  // Preserve and replay every authored solution bundled with BOXXY.
  let replayed = 0;
  for (const level of microban.levels) {
    assert(level.solution, `Microban level ${level.rank} has no stored route.`);
    const replay = core.validateSolution(level.layout.join('\n'), level.solution);
    assert(replay.valid && replay.solved, `Stored route failed on Microban level ${level.rank}.`);
    replayed++;
  }

  // Solve the 50 authored levels afresh with the new engine only.
  let freshlySolved = 0;
  let freshElapsedMs = 0;
  for (const level of microban.levels) {
    const text = level.layout.join('\n');
    const result = await core.solve(text, {
      featureMaxTimeMs: 10000,
      maxNodes: 500000,
      yieldEvery: 10000,
      progressEveryMs: 10000,
    });
    assert(result.strategy === 'fess', `Microban ${level.rank} used ${result.strategy || 'no strategy'} instead of FESS.`);
    assert(result.status === 'solved', `FESS failed to solve Microban level ${level.rank}: ${result.status}.`);
    const replay = core.validateSolution(text, result.moves);
    assert(replay.valid && replay.solved, `Fresh FESS route failed replay on Microban level ${level.rank}.`);
    freshlySolved++;
    freshElapsedMs += Number(result.elapsedMs || 0);
  }

  // Direct structural proofs.
  const cornerDead = [
    '#####',
    '#$@ #',
    '#  .#',
    '#####',
  ].join('\n');
  const corner = core.analyseDeadlocks(cornerDead);
  assert(corner.dead && corner.reason === 'static-dead-square', 'Static corner deadlock was not proved.');

  const matchingDead = [
    '########',
    '## .  ##',
    '# @    #',
    '#.#$   #',
    '##  $ ##',
    '#   $.##',
    '#  ##  #',
    '########',
  ].join('\n');
  const matching = core.analyseDeadlocks(matchingDead);
  assert(matching.dead && matching.reason === 'box-goal-matching', 'Box-goal matching deadlock was not proved.');

  const freezeDead = [
    '#######',
    '#@# # #',
    '# #$ .#',
    '## $# #',
    '#.   $#',
    '#    .#',
    '#######',
  ].join('\n');
  const freeze = core.analyseDeadlocks(freezeDead);
  assert(freeze.dead && freeze.reason === 'freeze-deadlock', 'Mutually frozen box group was not proved.');

  const frozenGoalInterference = [
    '########',
    '#*     #',
    '###$ #.#',
    '#  @   #',
    '########',
  ].join('\n');
  const frozenGoal = core.analyseDeadlocks(frozenGoalInterference);
  assert(frozenGoal.dead && frozenGoal.reason === 'frozen-goal-interference',
    'Frozen goal box was not converted to a wall for the remaining assignment.');

  // Local sealed-region regression: the starting position is live, while the
  // demonstrated later state has no recoverable continuation. The structural
  // position, not the notation used to reach it, must be recognised.
  const corralLevel = [
    '#########################',
    '# $ . . #   .   #   .   #',
    '# #$# #$# #$# #$# #$# # #',
    '#@  #   .   #   .   # $ #',
    '#######################.#',
    '#   #   .   #   .   #   #',
    '# # # # #$# #$# #$# #$# #',
    '#  $.   #   .   #   .   #',
    '#########################',
  ].join('\n');
  const corralBoard = core.parseLevel(corralLevel);
  const corralState = core.createInitialState(corralBoard);
  assert(!core.analyseDeadlocks(corralBoard, corralState.boxes, corralState.player).dead,
    'Corral regression was falsely rejected before the bad sequence.');
  const demonstrationMoves = 'uuRRRR';
  for (const move of demonstrationMoves) {
    const result = core.applyMove(corralBoard, corralState, move);
    assert(result.ok, `Corral regression move ${move} was unexpectedly illegal.`);
  }
  const corral = core.analyseDeadlocks(corralBoard, corralState.boxes, corralState.player);
  assert(corral.dead && ['corral-deadlock','maze-pattern-deadlock'].includes(corral.reason),
    `Demonstrated corral state was not proved; got ${corral.reason || 'live'}.`);
  const corralExhaustion = await core.solve(core.boardToXSB(corralBoard, corralState), {
    featureMaxTimeMs: 3000,
    maxNodes: 100000,
    yieldEvery: 1000,
  });
  assert(corralExhaustion.status === 'unsolvable' && corralExhaustion.stats.generated === 0,
    'Dead corral was not rejected before search generation.');

  // This board is not rejected initially. FESS must exhaust it and exhaust
  // all reachable non-dead states without crashing or looping.
  const propagatedDead = [
    '#######',
    '## # ##',
    '## @#.#',
    '# $$  #',
    '#.  # #',
    '# #  ##',
    '#######',
  ].join('\n');
  assert(!core.analyseDeadlocks(propagatedDead).dead, 'Propagation test was rejected before search.');
  const exhausted = await core.solve(propagatedDead, {
    featureMaxTimeMs: 3000,
    maxNodes: 100000,
    yieldEvery: 1000,
  });
  assert(exhausted.strategy === 'fess' && exhausted.status === 'unsolvable', 'FESS did not exhaust the propagated-dead test.');
  assert(exhausted.stats.provenDeadStates > 0, 'Terminal dead states were not recorded.');

  // The known dense stress board must remain accepted and searchable.
  const chess38 = chessboards.levels[37];
  const chessText = chess38.layout.join('\n');
  assert(!core.analyseDeadlocks(chessText).dead, 'Small Chessboards 38 was falsely rejected.');
  const stress = await core.solve(chessText, {
    featureMaxTimeMs: 2000,
    maxNodes: 1000000,
    yieldEvery: 100,
  });
  assert(stress.strategy === 'fess', 'Dense stress run left the FESS engine.');
  assert(['solved', 'limit'].includes(stress.status), `Unexpected dense stress result: ${stress.status}.`);
  if (stress.status === 'solved') {
    const replay = core.validateSolution(chessText, stress.moves);
    assert(replay.valid && replay.solved, 'Dense stress solution failed replay.');
  }

  // No old portfolio or fallback algorithm remains in the solver files.
  const source = fs.readFileSync(path.join(__dirname, 'solver-core.js'), 'utf8') + '\n' +
    fs.readFileSync(path.join(__dirname, 'solver-worker.js'), 'utf8');
  for (const legacy of ['safeFallback', 'boundedIDA', 'reverseAStar', 'productiveBridge', 'exact-pattern-reverse']) {
    assert(!source.includes(legacy), `Legacy solver option remains: ${legacy}.`);
  }

  console.log([
    'BOXXY v119 pure-FESS regression tests passed.',
    `${analysed} supplied starting boards accepted.`,
    `${replayed} stored routes replayed.`,
    `${freshlySolved} Microban levels solved afresh in ${freshElapsedMs} ms of reported solver time.`,
    `Dense stress result: ${stress.status}; ${stress.stats.generated} states; closest ${stress.closest?.goalsFilled ?? 0}/${stress.closest?.totalGoals ?? 0} goals; FESS packing ${stress.closest?.safePacked ?? 0}.`,
  ].join('\n'));
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
