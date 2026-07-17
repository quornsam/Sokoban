/*
  BOXXY Rust/WASM solver bridge.
  Backend engine adapted from dangarfield/sokoban-solver Festival-Rust.
  https://github.com/dangarfield/sokoban-solver

  The solver module is loaded from the project's GitHub Pages deployment.
  BOXXY itself remains a static GitHub Pages application.
*/

const ENGINE_MODULE_URL = "https://dangarfield.github.io/sokoban-solver/festival-rust/pkg/festival_rust.js";
let enginePromise = null;

async function loadEngine() {
  if (!enginePromise) {
    enginePromise = import(ENGINE_MODULE_URL).then(async wasm => {
      await wasm.default();
      return wasm.FestivalSolver;
    });
  }
  return enginePromise;
}

function numberValue(value) {
  if (typeof value === "bigint") return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

self.onmessage = async event => {
  const message = event.data || {};
  if (message.type !== "solve") return;
  const id = message.id;
  const started = performance.now();

  try {
    const FestivalSolver = await loadEngine();
    const solver = new FestivalSolver();
    const timeLimitMs = message.unlimited
      ? 43_200_000
      : Math.max(1_000, numberValue(message.maxTimeMs) || 600_000);

    let lastProgressAt = 0;
    const progressEveryMs = Math.max(250, numberValue(message.progressEveryMs) || 750);
    const progressCallback = progress => {
      const now = performance.now();
      if (now - lastProgressAt < progressEveryMs) return;
      lastProgressAt = now;
      self.postMessage({
        type: "progress",
        id,
        progress: {
          phase: "forward",
          generated: numberValue(progress?.explored),
          expanded: numberValue(progress?.explored),
          open: numberValue(progress?.frontier),
          depth: numberValue(progress?.iterations),
          elapsedMs: numberValue(progress?.timeElapsed) || (now - started)
        }
      });
    };

    const raw = solver.solve(String(message.level || ""), timeLimitMs, progressCallback);
    const elapsedMs = performance.now() - started;
    const route = String(raw?.solution || "").replace(/[^udlrUDLR]/g, "");

    if (raw?.solved && route) {
      self.postMessage({
        type: "result",
        id,
        result: {
          status: "solved",
          strategy: "festival-rust-wasm",
          mixedMoves: route,
          moves: route,
          moveCount: route.length,
          pushCount: (route.match(/[UDLR]/g) || []).length,
          elapsedMs,
          stats: {
            generated: numberValue(raw?.nodes_searched),
            expanded: numberValue(raw?.nodes_searched)
          }
        }
      });
    } else {
      const reason = String(raw?.fail_reason || "No solution was found within the solver allowance.");
      const timedOut = /time|timeout|limit/i.test(reason);
      self.postMessage({
        type: "result",
        id,
        result: {
          status: timedOut ? "limit" : "unsolvable",
          strategy: "festival-rust-wasm",
          elapsedMs,
          message: reason,
          stats: {
            generated: numberValue(raw?.nodes_searched),
            expanded: numberValue(raw?.nodes_searched)
          }
        }
      });
    }

    solver.free?.();
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      error: error?.message || "The Rust/WASM solver stopped unexpectedly."
    });
  }
};
