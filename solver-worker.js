/* BOXXY v102 solver worker — keeps long searches off the game interface thread. */
importScripts("solver-core.js");

self.onmessage = async event => {
  const message = event.data || {};
  if (message.type !== "solve") return;
  const id = message.id;
  try {
    const result = await self.SokobanCore.solve(message.level, {
      mode: "deep",
      maxNodes: message.maxNodes || 5000000,
      maxTimeMs: message.maxTimeMs || 300000,
      yieldEvery: 500,
      progressEveryMs: 100,
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
