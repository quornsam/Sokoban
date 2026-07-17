/* BOXXY v125 Rust/WebAssembly solver worker.
 * External engine: dangarfield/sokoban-solver, festival-rust browser build.
 *
 * v125 deliberately does not import a remote JavaScript module directly.
 * Some browsers and privacy settings reject cross-origin module imports inside
 * workers even when an ordinary CORS fetch succeeds. Instead, this adapter:
 *   1. fetches the generated JavaScript binding as text;
 *   2. imports that text from a local Blob URL;
 *   3. fetches the matching WASM binary as bytes; and
 *   4. passes those bytes explicitly to the generated initialiser.
 *
 * No legacy BOXXY/FESS search code or JavaScript solver fallback is present.
 */

const ENGINE_SOURCES = [
  {
    name: "GitHub raw (pinned)",
    js: "https://raw.githubusercontent.com/dangarfield/sokoban-solver/d355ece7272ec89071056ef64ce257c797f9c2b1/festival-rust/pkg/festival_rust.js",
    wasm: "https://raw.githubusercontent.com/dangarfield/sokoban-solver/d355ece7272ec89071056ef64ce257c797f9c2b1/festival-rust/pkg/festival_rust_bg.wasm"
  },
  {
    name: "jsDelivr (pinned)",
    js: "https://cdn.jsdelivr.net/gh/dangarfield/sokoban-solver@d355ece7272ec89071056ef64ce257c797f9c2b1/festival-rust/pkg/festival_rust.js",
    wasm: "https://cdn.jsdelivr.net/gh/dangarfield/sokoban-solver@d355ece7272ec89071056ef64ce257c797f9c2b1/festival-rust/pkg/festival_rust_bg.wasm"
  },
  {
    name: "Maintainer GitHub Pages",
    js: "https://dangarfield.github.io/sokoban-solver/festival-rust/pkg/festival_rust.js",
    wasm: "https://dangarfield.github.io/sokoban-solver/festival-rust/pkg/festival_rust_bg.wasm"
  }
];

let enginePromise = null;
let engineSourceName = "";

function describeError(error) {
  if (!error) return "unknown error";
  const name = error.name && error.name !== "Error" ? `${error.name}: ` : "";
  return `${name}${error.message || String(error)}`;
}

async function fetchChecked(url, responseType) {
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
    redirect: "follow",
    referrerPolicy: "no-referrer"
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText || ""}`.trim());
  }
  return responseType === "arrayBuffer" ? response.arrayBuffer() : response.text();
}

async function loadSource(source) {
  // Fetch both artefacts before evaluating anything, so a partial source cannot
  // become the selected engine accidentally.
  const [bindingSource, wasmBytes] = await Promise.all([
    fetchChecked(source.js, "text"),
    fetchChecked(source.wasm, "arrayBuffer")
  ]);

  if (!bindingSource.includes("FestivalSolver")) {
    throw new Error("downloaded JavaScript does not export FestivalSolver");
  }
  if (!(wasmBytes instanceof ArrayBuffer) || wasmBytes.byteLength < 8) {
    throw new Error("downloaded WASM file is empty or invalid");
  }

  const magic = new Uint8Array(wasmBytes, 0, 4);
  if (magic[0] !== 0x00 || magic[1] !== 0x61 || magic[2] !== 0x73 || magic[3] !== 0x6d) {
    throw new Error("downloaded file is not a WebAssembly binary");
  }

  const moduleUrl = URL.createObjectURL(new Blob([bindingSource], { type: "text/javascript" }));
  try {
    const module = await import(moduleUrl);
    if (typeof module.default !== "function") {
      throw new Error("generated WASM initialiser was not exported");
    }
    if (typeof module.FestivalSolver !== "function") {
      throw new Error("FestivalSolver class was not exported");
    }

    // Passing the bytes explicitly prevents the generated binding from trying
    // to resolve festival_rust_bg.wasm relative to a remote or Blob module URL.
    await module.default({ module_or_path: wasmBytes });
    return module.FestivalSolver;
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
}

async function loadEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const failures = [];
      for (const source of ENGINE_SOURCES) {
        try {
          const FestivalSolver = await loadSource(source);
          engineSourceName = source.name;
          return FestivalSolver;
        } catch (error) {
          failures.push(`${source.name}: ${describeError(error)}`);
        }
      }
      throw new Error(`All three Rust/WASM sources failed. ${failures.join(" | ")}`);
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
    self.postMessage({ type: "ready", id, source: engineSourceName });
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
        failReason: result.fail_reason == null ? "" : String(result.fail_reason),
        engineSource: engineSourceName
      }
    });
  } catch (error) {
    // Reset the cached promise after a failed load. A second attempt can then
    // succeed if a transient network or privacy-filter problem has cleared.
    enginePromise = null;
    engineSourceName = "";
    self.postMessage({
      type: "error",
      id,
      error: describeError(error)
    });
  } finally {
    try { solver?.free?.(); } catch (_) {}
  }
};
