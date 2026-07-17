/* BOXXY v124 solver adapter regression tests.
 * Run with: node solver-adapter-tests.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const verifier = require("./solver-route-verifier.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "data.js"), "utf8"), context);
const packs = context.window.BOXXY_LEVEL_PACKS;
const microban = packs.find(pack => pack.id === "microban");
assert(microban, "Microban pack not found.");

let verified = 0;
for (const level of microban.levels) {
  assert(typeof level.solution === "string" && level.solution.length, `Microban ${level.rank} has no route.`);
  const result = verifier.verify(level.layout.join("\n"), level.solution);
  assert(result.valid, `Microban ${level.rank} route is illegal: ${result.error}`);
  assert(result.solved, `Microban ${level.rank} route does not solve the board.`);
  assert(result.moves === result.route.length, `Microban ${level.rank} move count mismatch.`);
  verified++;
}

const alreadySolved = [
  "#####",
  "#@* #",
  "#####"
].join("\n");
const empty = verifier.verify(alreadySolved, "");
assert(empty.valid && empty.solved && empty.moves === 0, "Already-solved board was not accepted.");

const illegal = verifier.verify([
  "#####",
  "#@$.#",
  "#####"
].join("\n"), "u");
assert(!illegal.valid, "Illegal wall move was accepted.");

const invalidCharacter = verifier.verify([
  "#####",
  "#@$.#",
  "#####"
].join("\n"), "R!");
assert(!invalidCharacter.valid, "A route containing an invalid character was accepted.");

const whitespaceRoute = verifier.verify([
  "#####",
  "#@$.#",
  "#####"
].join("\n"), "  R\n");
assert(whitespaceRoute.valid && whitespaceRoute.solved, "Whitespace around a valid route was not tolerated.");

const incomplete = verifier.verify([
  "######",
  "#@ $ #",
  "#  . #",
  "######"
].join("\n"), "r");
assert(incomplete.valid && !incomplete.solved, "Legal incomplete route was misclassified.");

const outsidePadding = verifier.verify([
  " @$.#",
  "#####"
].join("\n"), "l");
assert(!outsidePadding.valid, "XSB padding outside an irregular board was treated as walkable floor.");

console.log(`PASS: ${verified} stored Microban routes replayed; invalid, incomplete, outside-padding and empty solved cases checked.`);
