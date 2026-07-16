/* BOXXY v113 solver regression tests. Run with: node solver-regression-tests.js */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
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

// All 50 authored Microban routes must still replay successfully. This is the
// strongest practical guard against an unsafe structural deadlock false positive.
const packs = loadPacks();
const microban = packs.find(pack => pack.id === 'microban');
let validated = 0;
for (const level of microban.levels) {
  const text = level.layout.join('\n');
  const analysis = core.analyseDeadlocks(text);
  assert(!analysis.dead, `False initial deadlock on Microban level ${level.rank}: ${analysis.reason}`);
  if (level.solution) {
    const replay = core.validateSolution(text, level.solution);
    assert(replay.valid && replay.solved, `Stored route failed on Microban level ${level.rank}`);
    validated++;
  }
}

// A fixed off-goal box is a direct structural proof.
const cornerDead = [
  '#####',
  '#$@ #',
  '#  .#',
  '#####',
].join('\n');
const cornerAnalysis = core.analyseDeadlocks(cornerDead);
assert(cornerAnalysis.dead, 'Corner deadlock was not detected.');

// A solved fixed box is safe packing, not a deadlock.
const packed = [
  '#####',
  '#*@ #',
  '#####',
].join('\n');
const packedAnalysis = core.analyseDeadlocks(packed);
assert(!packedAnalysis.dead && packedAnalysis.safePacked === 1, 'Safely packed goal box was not recognised.');



// Distinct box-to-goal reachability exists for each box, but not as one
// complete matching. The old cheap nearest-goal score continued searching it.
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
const matchingAnalysis = core.analyseDeadlocks(matchingDead);
assert(matchingAnalysis.dead && matchingAnalysis.reason === 'dynamic-bipartite', 'Dynamic bipartite deadlock was not detected.');

// An inaccessible two-box region remains impossible even after every outside
// box is removed. This exercises the exact optimistic corral proof.
const corralDead = [
  '########',
  '#      #',
  '#   .  #',
  '#. #$ .#',
  '#  #  ##',
  '#   $$ #',
  '# #@#  #',
  '########',
].join('\n');
const corralAnalysis = core.analyseDeadlocks(corralDead);
assert(corralAnalysis.dead && corralAnalysis.reason === 'optimistic-corral', 'Optimistic corral deadlock was not detected.');

// Small Chessboards 38 must not be falsely rejected at its starting position.
const chess38 = packs.find(pack => pack.id === 'chessboards').levels[37];
const chessAnalysis = core.analyseDeadlocks(chess38.layout.join('\n'));
assert(!chessAnalysis.dead, `Small Chessboards 38 falsely rejected: ${chessAnalysis.reason}`);

// This position is not caught by a one-step structural test. Complete safe
// search must exhaust it and propagate the resulting dead proof back to root.
const propagatedDead = [
  '#######',
  '## # ##',
  '## @#.#',
  '# $$  #',
  '#.  # #',
  '# #  ##',
  '#######',
].join('\n');

(async () => {
  const result = await core.solve(propagatedDead, {
    safeOnly: true,
    maxTimeMs: 3000,
    maxNodes: 100000,
    safeFallback: true,
    yieldEvery: 500,
  });
  assert(result.status === 'unsolvable', 'Complete safe search failed to exhaust the propagated-dead test.');
  assert(result.stats.provenDeadStates > 0, 'Dead descendants were not propagated or retained.');
  console.log(`BOXXY v113 regression tests passed. ${validated} authored Microban solutions replayed.`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
