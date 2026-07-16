/* BOXXY v113 solver worker — complete push search with safe pruning only. */
importScripts("solver-core.js?v=113");

self.onmessage = async event => {
  const message = event.data || {};
  if (message.type !== "solve") return;
  const id = message.id;
  try {
    const result = await self.SokobanCore.solve(message.level, {
      mode: "deep",
      unlimited: true,
      safeFallback: true,
      // Dense boards now begin with FESS. The older specialist searches are
      // disabled here because their heuristic pruning did not understand the
      // trapped 26-goal plateau seen on Small Chessboards 38.
      reverseAStar: false,
      reverse: false,
      productiveBridge: false,
      boundedBest: false,
      boundedIDA: false,
      featureSpace: true,
      featureMaxTimeMs: 600000,
      fessNonAdvisorWeight: 50,
      // The exhaustive fallback stores only the current depth-first route and
      // a disposable duplicate cache. Cache resets repeat work but cannot lose
      // an unexplored solution route.
      safeTranspositionStates: 80000,
      safeHeuristicCache: 60000,
      yieldEvery: 500,
      progressEveryMs: message.progressEveryMs || 750,
      onProgress(progress) {
        self.postMessage({ type: "progress", id, progress });
      }
    });
    if (result.status === "solved") {
      const validation = self.SokobanCore.validateSolution(message.level, result.mixedMoves || result.moves || "");
      if (!validation.valid || !validation.solved) {
        throw new Error("The solver produced a route that failed its final verification.");
      }
    }
    self.postMessage({ type: "result", id, result });
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      error: error && error.message ? error.message : "The solver stopped unexpectedly."
    });
  }
};
