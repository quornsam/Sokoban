/* BOXXY v119 solver worker — pure Feature Space Search. */
importScripts("solver-core.js?v=119");

self.onmessage = async event => {
  const message = event.data || {};
  if (message.type !== "solve") return;
  const id = message.id;
  try {
    const result = await self.SokobanCore.solve(message.level, {
      featureMaxTimeMs: message.unlimited ? 43200000 : (Number(message.maxTimeMs) || 600000),
      maxNodes: Number(message.maxNodes) || undefined,
      yieldEvery: 200,
      progressEveryMs: message.progressEveryMs || 750,
      onProgress(progress) {
        self.postMessage({ type: "progress", id, progress });
      }
    });
    if (result.status === "solved") {
      const validation = self.SokobanCore.validateSolution(message.level, result.mixedMoves || result.moves || "");
      if (!validation.valid || !validation.solved) throw new Error("The solver produced a route that failed its final verification.");
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
