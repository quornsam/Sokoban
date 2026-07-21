/*
 * BOXXY — Pushbox Puzzle: solver integration worker
 * Copyright © 2026 Sam Cornwell. All rights reserved.
 * Personal non-commercial use only. See LICENSE.md.
 * Third-party engine details are in THIRD-PARTY-NOTICES.md.
 */
/* BOXXY v140 Rust/WebAssembly solver worker.
 *
 * External engine: dangarfield/sokoban-solver, festival-rust browser build.
 *
 * v140 retains the approach that avoids both forms which proved unreliable in Opera/GitHub Pages:
 *   - importing the remote module URL directly; and
 *   - importing fetched source through a Blob module URL.
 *
 * Instead it fetches the generated binding as text, converts its three ES
 * module exports into local worker bindings, evaluates it as ordinary worker
 * code, and initialises it with separately downloaded WASM bytes. A tiny
 * one-push Sokoban self-test must pass before the engine is reported ready.
 * No legacy BOXXY solver or JavaScript fallback is present.
 */

const ENGINE_SOURCES = [
  {
    name: "jsDelivr (pinned)",
    js: "https://cdn.jsdelivr.net/gh/dangarfield/sokoban-solver@d355ece7272ec89071056ef64ce257c797f9c2b1/festival-rust/pkg/festival_rust.js",
    wasm: "https://cdn.jsdelivr.net/gh/dangarfield/sokoban-solver@d355ece7272ec89071056ef64ce257c797f9c2b1/festival-rust/pkg/festival_rust_bg.wasm"
  },
  {
    name: "Maintainer GitHub Pages",
    js: "https://dangarfield.github.io/sokoban-solver/festival-rust/pkg/festival_rust.js",
    wasm: "https://dangarfield.github.io/sokoban-solver/festival-rust/pkg/festival_rust_bg.wasm"
  },
  {
    name: "GitHub raw (pinned)",
    js: "https://raw.githubusercontent.com/dangarfield/sokoban-solver/d355ece7272ec89071056ef64ce257c797f9c2b1/festival-rust/pkg/festival_rust.js",
    wasm: "https://raw.githubusercontent.com/dangarfield/sokoban-solver/d355ece7272ec89071056ef64ce257c797f9c2b1/festival-rust/pkg/festival_rust_bg.wasm"
  }
];

const SOURCE_TIMEOUT_MS = 15000;
let enginePromise = null;
let engineSourceName = "";

function describeError(error) {
  if (!error) return "unknown error";
  const name = error.name && error.name !== "Error" ? `${error.name}: ` : "";
  return `${name}${error.message || String(error)}`;
}

async function fetchChecked(url, responseType, timeoutMs = SOURCE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      redirect: "follow",
      referrerPolicy: "no-referrer",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText || ""}`.trim());
    }
    return responseType === "arrayBuffer" ? response.arrayBuffer() : response.text();
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`request timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function compileBinding(bindingSource) {
  if (typeof bindingSource !== "string" || bindingSource.length < 1000) {
    throw new Error("downloaded JavaScript binding is empty or incomplete");
  }
  if (!bindingSource.includes("class FestivalSolver") || !bindingSource.includes("__wbg_init")) {
    throw new Error("downloaded JavaScript is not the expected Festival-Rust binding");
  }

  // wasm-bindgen's web target contains exactly these module exports. Replacing
  // them lets the generated binding execute as ordinary worker code. The
  // import.meta fallback cannot be parsed outside a module, so replace it too;
  // v140 continues to pass WASM bytes explicitly and never uses that fallback.
  let source = bindingSource
    .replace(/export\s+class\s+FestivalSolver/, "class FestivalSolver")
    .replace(/export\s*\{\s*initSync\s*\}\s*;?/, "")
    .replace(/export\s+default\s+__wbg_init\s*;?/, "")
    .replace(/import\.meta\.url/g, "self.location.href");

  if (/\bexport\b/.test(source)) {
    throw new Error("the generated binding contains an unsupported module export");
  }

  try {
    // The binding itself already uses Function for wasm-bindgen imports, so
    // this does not introduce a new browser capability requirement.
    return new Function(`${source}\nreturn { FestivalSolver, init: __wbg_init };`)();
  } catch (error) {
    throw new Error(`JavaScript binding could not be initialised: ${describeError(error)}`);
  }
}

function validateWasm(wasmBytes) {
  if (!(wasmBytes instanceof ArrayBuffer) || wasmBytes.byteLength < 8) {
    throw new Error("downloaded WASM file is empty or invalid");
  }
  const magic = new Uint8Array(wasmBytes, 0, 4);
  if (magic[0] !== 0x00 || magic[1] !== 0x61 || magic[2] !== 0x73 || magic[3] !== 0x6d) {
    throw new Error("downloaded file is not a WebAssembly binary");
  }
}

async function runSelfTest(FestivalSolver) {
  let solver = null;
  try {
    solver = new FestivalSolver();
    const result = solver.solve("#####\n#@$.#\n#####", 5000, null) || {};
    const route = String(result.solution || "");
    if (!result.solved || !/[rR]/.test(route)) {
      throw new Error(`engine self-test failed${result.fail_reason ? `: ${result.fail_reason}` : ""}`);
    }
  } finally {
    try { solver?.free?.(); } catch (_) {}
  }
}

async function loadSource(source) {
  const [bindingSource, wasmBytes] = await Promise.all([
    fetchChecked(source.js, "text"),
    fetchChecked(source.wasm, "arrayBuffer")
  ]);
  validateWasm(wasmBytes);
  const binding = compileBinding(bindingSource);
  if (typeof binding.init !== "function" || typeof binding.FestivalSolver !== "function") {
    throw new Error("FestivalSolver exports were not created");
  }
  await binding.init({ module_or_path: wasmBytes });
  await runSelfTest(binding.FestivalSolver);
  return binding.FestivalSolver;
}

async function loadEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const failures = [];

      // Start all mirrors together. The first complete, self-tested engine wins,
      // so one blocked host cannot impose three consecutive network timeouts.
      const attempts = ENGINE_SOURCES.map(source =>
        loadSource(source)
          .then(FestivalSolver => ({ FestivalSolver, source }))
          .catch(error => {
            failures.push(`${source.name}: ${describeError(error)}`);
            throw error;
          })
      );

      try {
        const winner = await Promise.any(attempts);
        engineSourceName = winner.source.name;
        return winner.FestivalSolver;
      } catch (_) {
        throw new Error(`All Rust/WASM sources failed. ${failures.join(" | ") || "No source returned a usable engine."}`);
      }
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
    enginePromise = null;
    engineSourceName = "";
    self.postMessage({ type: "error", id, error: describeError(error) });
  } finally {
    try { solver?.free?.(); } catch (_) {}
  }
};
