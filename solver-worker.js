/* BOXXY v124 Rust/WebAssembly solver worker.
 * External engine: dangarfield/sokoban-solver, festival-rust browser build.
 * This adapter contains no legacy BOXXY search engine or JavaScript fallback.
 * The upstream repository does not state a redistribution licence, so BOXXY
 * loads the compiled browser module at runtime instead of bundling a copy.
 */

const ENGINE_MODULE_URLS = [
  // Pinned to the upstream solver commit used and audited for this release.
  "https://cdn.jsdelivr.net/gh/dangarfield/sokoban-solver@d355ece7272ec89071056ef64ce257c797f9c2b1/festival-rust/pkg/festival_rust.js",
  // Maintainer-hosted fallback.
  "https://dangarfield.github.io/sokoban-solver/festival-rust/pkg/festival_rust.js"
];
let enginePromise = null;

async function loadEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const failures = [];
      for (const url of ENGINE_MODULE_URLS) {
        try {
          const module = await import(url);
          await module.default();
          if (typeof module.FestivalSolver !== "function") {
            throw new Error("The Rust solver class was not exported.");
          }
          return module.FestivalSolver;
        } catch (error) {
          failures.push(`${url}: ${error?.message || error}`);
        }
      }
      throw new Error(`The Rust/WebAssembly engine could not be loaded. ${failures.join(" | ")}`);
    })();
  }
  return enginePromise;
}

self.onmessage = async event => {
  const message = event.data || {};
  if (message.type !== "solve") return;

  const id = message.id;
  const level = String(message.level || "");
  const timeoutMs = Math.max(1000, Math.min(0xffffffff, Number(message.timeoutMs) || 43200000));
  let solver = null;

  try {
    self.postMessage({ type: "loading", id });
    const FestivalSolver = await loadEngine();
    self.postMessage({ type: "ready", id });
    solver = new FestivalSolver();

    const result = solver.solve(level, timeoutMs, progress => {
      self.postMessage({
        type: "progress",
        id,
        progress: {
          explored: Number(progress?.explored || 0),
          frontier: Number(progress?.frontier || 0),
          iterations: Number(progress?.iterations || 0),
          elapsedSeconds: Number(progress?.timeElapsed || 0)
        }
      });
    }) || {};

    self.postMessage({
      type: "result",
      id,
      result: {
        solved: Boolean(result.solved),
        solution: result.solution == null ? "" : String(result.solution),
        moves: Number(result.moves || 0),
        pushes: Number(result.pushes || 0),
        nodesSearched: Number(result.nodes_searched || result.nodesSearched || 0),
        timeMs: Number(result.time_ms || result.timeMs || 0),
        failReason: result.fail_reason == null ? "" : String(result.fail_reason)
      }
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      error: error?.message || String(error || "The Rust/WebAssembly solver could not be loaded.")
    });
  } finally {
    try { solver?.free?.(); } catch (_) {}
  }
};
