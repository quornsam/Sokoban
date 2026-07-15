(() => {
  "use strict";

  const modal = document.getElementById("levelMakerModal");
  const gridEl = document.getElementById("makerGrid");
  const gridShell = gridEl?.closest(".maker-grid-shell");
  const widthInput = document.getElementById("makerWidth");
  const heightInput = document.getElementById("makerHeight");
  const boxesInput = document.getElementById("makerBoxes");
  const testedInput = document.getElementById("makerTested");
  const squareInput = document.getElementById("makerSquare");
  const generateBtn = document.getElementById("makerGenerateBtn");
  const resizeBtn = document.getElementById("makerResizeBtn");
  const roomBtn = document.getElementById("makerRoomBtn");
  const clearBtn = document.getElementById("makerClearBtn");
  const closeBtn = document.getElementById("makerCloseBtn");
  const importBtn = document.getElementById("makerImportBtn");
  const copyBtn = document.getElementById("makerCopyBtn");
  const testBtn = document.getElementById("makerTestBtn");
  const exitTestBtn = document.getElementById("makerExitTestBtn");
  const textEl = document.getElementById("makerText");
  const statusEl = document.getElementById("makerStatus");
  const hotspot = document.getElementById("makerHotspot");
  const saveNameInput = document.getElementById("makerSaveName");
  const saveBtn = document.getElementById("makerSaveBtn");
  const savedSelect = document.getElementById("makerSavedSelect");
  const loadBtn = document.getElementById("makerLoadBtn");
  const deleteBtn = document.getElementById("makerDeleteBtn");
  const toolButtons = [...document.querySelectorAll("[data-maker-tool]")];

  if (!modal || !gridEl) return;

  const MIN_SIZE = 3;
  const GENERATOR_MIN_SIZE = 5;
  const MAX_SIZE = 24;
  const MAX_GENERATOR_BOXES = 12;
  const VOID = "~";
  const SAVE_KEY = "boxxy-level-maker-saves-v1";
  const VALID = new Set([VOID, " ", "#", "@", "$", ".", "*", "+"]);
  const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const CLASS_BY_VALUE = {
    [VOID]: "void",
    " ": "floor",
    "#": "wall",
    "@": "player",
    "$": "box",
    ".": "goal",
    "*": "boxgoal",
    "+": "playergoal"
  };
  const LABEL_BY_VALUE = {
    [VOID]: "void",
    " ": "floor",
    "#": "wall",
    "@": "player",
    "$": "box",
    ".": "goal",
    "*": "box on goal",
    "+": "player on goal"
  };

  let cols = 10;
  let rows = 10;
  let cells = [];
  let activeTool = "wall";
  let painting = false;
  let lastPaintIndex = -1;
  let unlockClicks = 0;
  let unlockArmed = false;
  let unlockTimer = null;
  let activeSaveId = "";
  let pendingDeleteId = "";
  let deleteTimer = null;
  let fitFrame = 0;

  const clampSize = value => Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(Number(value) || 10)));
  const clampGeneratorSize = value => Math.max(GENERATOR_MIN_SIZE, clampSize(value));
  const clampBoxes = value => Math.max(1, Math.min(MAX_GENERATOR_BOXES, Math.round(Number(value) || 1)));
  const indexOf = (x, y) => y * cols + x;
  const coordsOf = index => [index % cols, Math.floor(index / cols)];
  const localIndex = (x, y, width) => y * width + x;
  const localCoords = (index, width) => [index % width, Math.floor(index / width)];
  const waitForPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randomItem = list => list[Math.floor(Math.random() * list.length)];

  function shuffled(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function fitGridToShell() {
    if (!gridShell || modal.hidden) return;
    const style = getComputedStyle(gridShell);
    const horizontalPadding = parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
    const verticalPadding = parseFloat(style.paddingTop || 0) + parseFloat(style.paddingBottom || 0);
    const availableWidth = Math.max(1, gridShell.clientWidth - horizontalPadding - 4);
    const availableHeight = Math.max(1, gridShell.clientHeight - verticalPadding - 4);
    const maximum = window.matchMedia("(max-width: 620px)").matches ? 44 : 56;
    const fitted = Math.floor(Math.min(availableWidth / cols, availableHeight / rows, maximum));
    const cellSize = Math.max(9, fitted);
    gridEl.style.setProperty("--maker-cell", `${cellSize}px`);
  }

  function scheduleGridFit() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      fitGridToShell();
      fitFrame = requestAnimationFrame(fitGridToShell);
    });
  }

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", type === "error");
    statusEl.classList.toggle("success", type === "success");
  }

  function blankGrid(width, height, value = VOID) {
    return Array.from({ length: width * height }, () => value);
  }

  function clearActiveSave() {
    activeSaveId = "";
    if (savedSelect) savedSelect.value = "";
    if (saveNameInput) saveNameInput.value = "";
  }

  function countBoxes(values = cells) {
    return values.filter(value => value === "$" || value === "*").length;
  }

  function makeRoom(width = cols, height = rows, announce = true) {
    cols = clampSize(width);
    rows = clampSize(height);
    cells = blankGrid(cols, rows, VOID);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const edge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
        cells[indexOf(x, y)] = edge ? "#" : " ";
      }
    }
    if (cols >= 6 && rows >= 5) {
      cells[indexOf(2, 2)] = "@";
      cells[indexOf(Math.min(cols - 3, 4), Math.min(rows - 3, 3))] = "$";
      cells[indexOf(Math.min(cols - 2, 6), Math.min(rows - 3, 3))] = ".";
    }
    syncSizeInputs();
    if (boxesInput) boxesInput.value = String(Math.max(1, countBoxes()));
    renderGrid();
    updateTextFromGrid();
    if (announce) {
      clearActiveSave();
      setStatus("Empty room ready.");
    }
  }

  function syncSizeInputs() {
    widthInput.value = String(cols);
    heightInput.value = String(rows);
  }

  function removeExistingPlayer(exceptIndex = -1) {
    cells = cells.map((value, index) => {
      if (index === exceptIndex) return value;
      if (value === "@") return " ";
      if (value === "+") return ".";
      return value;
    });
  }

  function valueForTool(tool, current, index) {
    switch (tool) {
      case "void": return VOID;
      case "floor": return " ";
      case "wall": return "#";
      case "goal":
        if (current === "$") return "*";
        if (current === "@") return "+";
        return ".";
      case "box":
        if (current === "." || current === "+") return "*";
        return "$";
      case "boxgoal": return "*";
      case "player":
        removeExistingPlayer(index);
        return current === "." || current === "*" ? "+" : "@";
      case "playergoal":
        removeExistingPlayer(index);
        return "+";
      default: return current;
    }
  }

  function updateCellElement(index) {
    const button = gridEl.children[index];
    if (!button) return;
    const value = cells[index];
    button.className = `maker-cell type-${CLASS_BY_VALUE[value] || "void"}`;
    button.dataset.index = String(index);
    button.dataset.value = value;
    const [x, y] = coordsOf(index);
    button.setAttribute("aria-label", `Column ${x + 1}, row ${y + 1}: ${LABEL_BY_VALUE[value] || "void"}`);
  }

  function paintIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= cells.length || index === lastPaintIndex) return;
    const before = cells.slice();
    const next = valueForTool(activeTool, cells[index], index);
    cells[index] = next;
    if (activeTool === "player" || activeTool === "playergoal") {
      before.forEach((value, i) => {
        if (i !== index && cells[i] !== value) updateCellElement(i);
      });
    }
    updateCellElement(index);
    lastPaintIndex = index;
    updateTextFromGrid(false);
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    gridEl.style.setProperty("--maker-cols", String(cols));
    const fragment = document.createDocumentFragment();
    cells.forEach((value, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `maker-cell type-${CLASS_BY_VALUE[value] || "void"}`;
      button.dataset.index = String(index);
      button.dataset.value = value;
      button.setAttribute("role", "gridcell");
      const [x, y] = coordsOf(index);
      button.setAttribute("aria-label", `Column ${x + 1}, row ${y + 1}: ${LABEL_BY_VALUE[value] || "void"}`);
      fragment.appendChild(button);
    });
    gridEl.appendChild(fragment);
    scheduleGridFit();
  }

  function resizeGrid(nextCols, nextRows) {
    nextCols = clampSize(nextCols);
    nextRows = clampSize(nextRows);
    const next = blankGrid(nextCols, nextRows, VOID);
    const copyW = Math.min(cols, nextCols);
    const copyH = Math.min(rows, nextRows);
    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) next[y * nextCols + x] = cells[indexOf(x, y)];
    }
    cols = nextCols;
    rows = nextRows;
    cells = next;
    syncSizeInputs();
    renderGrid();
    updateTextFromGrid();
    setStatus(`Grid resized to ${cols} × ${rows}.`);
  }

  function exportRows() {
    const output = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const value = cells[indexOf(x, y)];
        line += value === VOID ? " " : value;
      }
      output.push(line.replace(/\s+$/g, ""));
    }
    while (output.length && output[0] === "") output.shift();
    while (output.length && output.at(-1) === "") output.pop();
    return output.length ? output : [""];
  }

  function updateTextFromGrid(force = true) {
    if (!force && document.activeElement === textEl) return;
    textEl.value = exportRows().join("\n");
  }

  function commonIndent(lines) {
    const nonblank = lines.filter(line => line.trim().length);
    if (!nonblank.length) return 0;
    return Math.min(...nonblank.map(line => (line.match(/^ */) || [""])[0].length));
  }

  function normalizePastedText(raw) {
    const trimmedFence = String(raw || "")
      .replace(/^\s*```(?:text|txt|xsb|sokoban|json)?\s*\n?/i, "")
      .replace(/\n?\s*```\s*$/i, "");

    const candidate = trimmedFence.trim();
    if (candidate.startsWith("[") || candidate.startsWith("{")) {
      try {
        const parsed = JSON.parse(candidate);
        const layout = Array.isArray(parsed) ? parsed : parsed?.layout;
        if (Array.isArray(layout) && layout.every(row => typeof row === "string")) return layout.slice();
      } catch (_) {}
    }

    let lines = trimmedFence.replace(/\r/g, "").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    const indent = commonIndent(lines);
    if (indent) lines = lines.map(line => line.slice(indent));
    return lines;
  }

  function classifySpaces(lines) {
    const height = lines.length;
    const width = Math.max(1, ...lines.map(line => line.length));
    const chars = lines.map(line => line.padEnd(width, " ").split(""));
    const outside = new Set();
    const queue = [];
    const key = (x, y) => `${x},${y}`;
    const add = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      if (chars[y][x] !== " ") return;
      const id = key(x, y);
      if (outside.has(id)) return;
      outside.add(id);
      queue.push([x, y]);
    };
    for (let x = 0; x < width; x++) {
      add(x, 0);
      add(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      add(0, y);
      add(width - 1, y);
    }
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      add(x - 1, y);
      add(x + 1, y);
      add(x, y - 1);
      add(x, y + 1);
    }
    return { width, height, chars, outside };
  }

  function importRows(lines, options = {}) {
    if (!Array.isArray(lines) || !lines.length) throw new Error("No level text was found.");
    if (lines.length > MAX_SIZE) throw new Error(`The level is ${lines.length} rows high. The editor supports up to ${MAX_SIZE}.`);
    const maxWidth = Math.max(...lines.map(line => line.length));
    if (maxWidth > MAX_SIZE) throw new Error(`The level is ${maxWidth} columns wide. The editor supports up to ${MAX_SIZE}.`);

    const cleaned = lines.map(line => String(line).replace(/\t/g, "    ").replace(/_/g, " "));
    const invalid = [...new Set(cleaned.join("").split("").filter(ch => !" #@$.+*".includes(ch)))];
    if (invalid.length) throw new Error(`Unsupported character${invalid.length === 1 ? "" : "s"}: ${invalid.join(" ")}`);

    const classified = classifySpaces(cleaned);
    cols = clampSize(classified.width);
    rows = clampSize(classified.height);
    cells = blankGrid(cols, rows, VOID);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const ch = classified.chars[y]?.[x] ?? " ";
        const value = ch === " " && classified.outside.has(`${x},${y}`) ? VOID : ch;
        cells[indexOf(x, y)] = VALID.has(value) ? value : VOID;
      }
    }
    syncSizeInputs();
    if (boxesInput) boxesInput.value = String(Math.max(1, countBoxes()));
    renderGrid();
    updateTextFromGrid();
    if (!options.keepSave) clearActiveSave();
    if (!options.quiet) setStatus(`Imported ${cols} × ${rows} level.`, "success");
  }

  function validate() {
    const playerCount = cells.filter(value => value === "@" || value === "+").length;
    const boxCount = cells.filter(value => value === "$" || value === "*").length;
    const goalCount = cells.filter(value => value === "." || value === "*" || value === "+").length;
    if (playerCount !== 1) return { ok: false, error: `The level needs exactly one player. It currently has ${playerCount}.` };
    if (boxCount < 1) return { ok: false, error: "The level needs at least one box and one goal." };
    if (boxCount !== goalCount) return { ok: false, error: `Boxes and goals must match. There are ${boxCount} boxes and ${goalCount} goals.` };
    const exported = exportRows();
    if (!exported.some(line => line.includes("#"))) return { ok: false, error: "Add some walls before testing the level." };
    return { ok: true, rows: exported, boxes: boxCount };
  }

  function terrainWalkable(terrain, index) {
    return terrain[index] === " ";
  }

  function localNeighbour(index, dx, dy, width, height) {
    const [x, y] = localCoords(index, width);
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return -1;
    return localIndex(nx, ny, width);
  }

  function reachableSet(terrain, width, height, boxSet, start) {
    const seen = new Set();
    if (start < 0 || !terrainWalkable(terrain, start) || boxSet.has(start)) return seen;
    const queue = [start];
    seen.add(start);
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      for (const [dx, dy] of DIRECTIONS) {
        const next = localNeighbour(current, dx, dy, width, height);
        if (next < 0 || seen.has(next) || boxSet.has(next) || !terrainWalkable(terrain, next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    return seen;
  }

  function floorIsConnected(terrain, width, height) {
    const first = terrain.findIndex(value => value === " ");
    if (first < 0) return false;
    const reached = reachableSet(terrain, width, height, new Set(), first);
    const floorCount = terrain.filter(value => value === " ").length;
    return reached.size === floorCount;
  }

  function terrainFloorCount(terrain) {
    return terrain.reduce((total, value) => total + (value === " " ? 1 : 0), 0);
  }

  function openNeighbourCount(terrain, width, height, index) {
    return DIRECTIONS.reduce((count, [dx, dy]) => {
      const next = localNeighbour(index, dx, dy, width, height);
      return count + (next >= 0 && terrain[next] === " " ? 1 : 0);
    }, 0);
  }

  function blockerNeighbourCount(terrain, width, height, index) {
    return 4 - openNeighbourCount(terrain, width, height, index);
  }

  function countThreeSidedPockets(terrain, width, height) {
    let count = 0;
    terrain.forEach((value, index) => {
      if (value === " " && blockerNeighbourCount(terrain, width, height, index) >= 3) count++;
    });
    return count;
  }

  function countPushLaneCells(terrain, width, height) {
    let count = 0;
    terrain.forEach((value, index) => {
      if (value !== " ") return;
      const [x, y] = localCoords(index, width);
      const horizontal = x > 0 && x < width - 1
        && terrain[localIndex(x - 1, y, width)] === " "
        && terrain[localIndex(x + 1, y, width)] === " ";
      const vertical = y > 0 && y < height - 1
        && terrain[localIndex(x, y - 1, width)] === " "
        && terrain[localIndex(x, y + 1, width)] === " ";
      if (horizontal || vertical) count++;
    });
    return count;
  }

  function countLargeOpenAreas(terrain, width, height) {
    let count = 0;
    const sizes = [[4, 3], [3, 4]];
    for (const [blockWidth, blockHeight] of sizes) {
      for (let y = 1; y <= height - 1 - blockHeight; y++) {
        for (let x = 1; x <= width - 1 - blockWidth; x++) {
          let allOpen = true;
          for (let oy = 0; oy < blockHeight && allOpen; oy++) {
            for (let ox = 0; ox < blockWidth; ox++) {
              if (terrain[localIndex(x + ox, y + oy, width)] !== " ") {
                allOpen = false;
                break;
              }
            }
          }
          if (allOpen) count++;
        }
      }
    }
    return count;
  }

  function internalWallCount(terrain, width, height) {
    let count = 0;
    terrain.forEach((value, index) => {
      if (value !== "#") return;
      const [x, y] = localCoords(index, width);
      if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) return;
      const floorNeighbours = DIRECTIONS.reduce((total, [dx, dy]) => {
        const next = localNeighbour(index, dx, dy, width, height);
        return total + (next >= 0 && terrain[next] === " " ? 1 : 0);
      }, 0);
      if (floorNeighbours >= 2) count++;
    });
    return count;
  }

  function terrainScore(terrain, width, height) {
    let corridorCells = 0;
    let junctionCells = 0;
    terrain.forEach((value, index) => {
      if (value !== " ") return;
      const open = openNeighbourCount(terrain, width, height, index);
      if (open === 2) corridorCells++;
      else if (open >= 3) junctionCells++;
    });
    return internalWallCount(terrain, width, height) * 3
      + corridorCells * 0.35
      + junctionCells * 0.15
      - countLargeOpenAreas(terrain, width, height) * 2.5
      - countThreeSidedPockets(terrain, width, height) * 30;
  }

  function terrainRemainsUseful(terrain, width, height, boxCount) {
    const floorCount = terrainFloorCount(terrain);
    const minimumFloor = Math.max(boxCount * 4 + 5, Math.floor((width - 2) * (height - 2) * 0.38));
    if (floorCount < minimumFloor) return false;
    if (!floorIsConnected(terrain, width, height)) return false;
    if (countThreeSidedPockets(terrain, width, height) > 0) return false;
    if (countPushLaneCells(terrain, width, height) < Math.max(6, boxCount * 3)) return false;
    return true;
  }

  function tryWallFeature(terrain, width, height, indices, boxCount) {
    const feature = [...new Set(indices)].filter(index => Number.isInteger(index) && index >= 0 && index < terrain.length);
    if (!feature.length || feature.some(index => terrain[index] !== " ")) return false;
    feature.forEach(index => { terrain[index] = "#"; });
    if (!terrainRemainsUseful(terrain, width, height, boxCount)) {
      feature.forEach(index => { terrain[index] = " "; });
      return false;
    }
    return true;
  }

  function makeBaseTerrain(width, height, square) {
    const terrain = blankGrid(width, height, VOID);
    if (square || width < 7 || height < 7) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
          terrain[localIndex(x, y, width)] = edge ? "#" : " ";
        }
      }
      return terrain;
    }

    const floorMask = Array.from({ length: width * height }, () => false);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) floorMask[localIndex(x, y, width)] = true;
    }

    if (!square && width >= 7 && height >= 7) {
      const carveCorner = (cornerX, cornerY) => {
        const depthX = randomInt(1, Math.max(1, Math.min(3, Math.floor((width - 4) / 3))));
        const depthY = randomInt(1, Math.max(1, Math.min(3, Math.floor((height - 4) / 3))));
        for (let oy = 0; oy < depthY; oy++) {
          const rowWidth = Math.max(1, Math.ceil(depthX * (depthY - oy) / depthY));
          for (let ox = 0; ox < rowWidth; ox++) {
            const x = cornerX === "left" ? 1 + ox : width - 2 - ox;
            const y = cornerY === "top" ? 1 + oy : height - 2 - oy;
            floorMask[localIndex(x, y, width)] = false;
          }
        }
      };

      const corners = shuffled([
        ["left", "top"], ["right", "top"], ["left", "bottom"], ["right", "bottom"]
      ]);
      corners.slice(0, randomInt(1, 4)).forEach(([cx, cy]) => carveCorner(cx, cy));

      const notchCount = randomInt(1, Math.max(1, Math.min(4, Math.floor((width + height) / 7))));
      for (let notch = 0; notch < notchCount; notch++) {
        const horizontalSide = Math.random() < 0.5;
        if (horizontalSide && width >= 8) {
          const notchWidth = randomInt(1, Math.min(3, width - 6));
          const notchDepth = randomInt(1, Math.min(2, height - 5));
          const start = randomInt(2, width - 2 - notchWidth);
          const top = Math.random() < 0.5;
          for (let oy = 0; oy < notchDepth; oy++) {
            for (let ox = 0; ox < notchWidth; ox++) {
              const y = top ? 1 + oy : height - 2 - oy;
              floorMask[localIndex(start + ox, y, width)] = false;
            }
          }
        } else if (height >= 8) {
          const notchHeight = randomInt(1, Math.min(3, height - 6));
          const notchDepth = randomInt(1, Math.min(2, width - 5));
          const start = randomInt(2, height - 2 - notchHeight);
          const left = Math.random() < 0.5;
          for (let ox = 0; ox < notchDepth; ox++) {
            for (let oy = 0; oy < notchHeight; oy++) {
              const x = left ? 1 + ox : width - 2 - ox;
              floorMask[localIndex(x, start + oy, width)] = false;
            }
          }
        }
      }
    }

    for (let index = 0; index < floorMask.length; index++) {
      if (floorMask[index]) terrain[index] = " ";
    }
    for (let index = 0; index < floorMask.length; index++) {
      if (floorMask[index]) continue;
      const touchesFloor = DIRECTIONS.some(([dx, dy]) => {
        const neighbour = localNeighbour(index, dx, dy, width, height);
        return neighbour >= 0 && floorMask[neighbour];
      });
      if (touchesFloor) terrain[index] = "#";
    }
    return terrain;
  }

  function dividerFeature(terrain, width, height, vertical) {
    const positions = [];
    if (vertical) {
      if (width < 7) return positions;
      const x = randomInt(2, width - 3);
      for (let y = 1; y < height - 1; y++) {
        const index = localIndex(x, y, width);
        if (terrain[index] === " ") positions.push(index);
      }
    } else {
      if (height < 7) return positions;
      const y = randomInt(2, height - 3);
      for (let x = 1; x < width - 1; x++) {
        const index = localIndex(x, y, width);
        if (terrain[index] === " ") positions.push(index);
      }
    }
    if (positions.length < 5) return [];

    const gapCount = positions.length >= 9 && Math.random() < 0.55 ? 2 : 1;
    const gapSet = new Set();
    const available = positions.slice(1, -1);
    for (const centre of shuffled(available).slice(0, gapCount)) {
      gapSet.add(centre);
      if (Math.random() < 0.45) {
        const position = positions.indexOf(centre);
        const neighbour = positions[position + (Math.random() < 0.5 ? -1 : 1)];
        if (neighbour !== undefined) gapSet.add(neighbour);
      }
    }
    return positions.filter(index => !gapSet.has(index));
  }

  const WALL_MOTIFS = [
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 0], [0, 1], [1, 1], [2, 1]]
  ];

  function transformMotif(points) {
    let transformed = points.map(([x, y]) => [x, y]);
    if (Math.random() < 0.5) transformed = transformed.map(([x, y]) => [-x, y]);
    const rotations = randomInt(0, 3);
    for (let turn = 0; turn < rotations; turn++) transformed = transformed.map(([x, y]) => [-y, x]);
    const minX = Math.min(...transformed.map(([x]) => x));
    const minY = Math.min(...transformed.map(([, y]) => y));
    return transformed.map(([x, y]) => [x - minX, y - minY]);
  }

  function placeRandomMotif(terrain, width, height, boxCount) {
    for (let attempt = 0; attempt < 24; attempt++) {
      const motif = transformMotif(randomItem(WALL_MOTIFS));
      const motifWidth = Math.max(...motif.map(([x]) => x)) + 1;
      const motifHeight = Math.max(...motif.map(([, y]) => y)) + 1;
      if (motifWidth > width - 4 || motifHeight > height - 4) continue;
      const originX = randomInt(2, width - 2 - motifWidth);
      const originY = randomInt(2, height - 2 - motifHeight);
      const feature = motif.map(([x, y]) => localIndex(originX + x, originY + y, width));
      if (tryWallFeature(terrain, width, height, feature, boxCount)) return true;
    }
    return false;
  }

  function breakLargeOpenAreas(terrain, width, height, boxCount) {
    const sizes = shuffled([[4, 3], [3, 4]]);
    for (let pass = 0; pass < 18; pass++) {
      let changed = false;
      for (const [blockWidth, blockHeight] of sizes) {
        const origins = [];
        for (let y = 1; y <= height - 1 - blockHeight; y++) {
          for (let x = 1; x <= width - 1 - blockWidth; x++) origins.push([x, y]);
        }
        for (const [x, y] of shuffled(origins)) {
          let allOpen = true;
          for (let oy = 0; oy < blockHeight && allOpen; oy++) {
            for (let ox = 0; ox < blockWidth; ox++) {
              if (terrain[localIndex(x + ox, y + oy, width)] !== " ") {
                allOpen = false;
                break;
              }
            }
          }
          if (!allOpen) continue;
          const centreX = x + Math.floor(blockWidth / 2);
          const centreY = y + Math.floor(blockHeight / 2);
          const alternatives = shuffled([
            [centreX, centreY],
            [centreX - 1, centreY],
            [centreX, centreY - 1],
            [centreX + 1, centreY]
          ]);
          for (const [wallX, wallY] of alternatives) {
            if (tryWallFeature(terrain, width, height, [localIndex(wallX, wallY, width)], boxCount)) {
              changed = true;
              break;
            }
          }
          if (changed) break;
        }
        if (changed) break;
      }
      if (!changed) break;
    }
  }

  function buildTerrain(width, height, square, boxCount) {
    let bestTerrain = null;
    let bestScore = -Infinity;
    const interiorArea = Math.max(1, (width - 2) * (height - 2));

    for (let attempt = 0; attempt < 28; attempt++) {
      const terrain = makeBaseTerrain(width, height, square);
      if (!floorIsConnected(terrain, width, height) || !terrainRemainsUseful(terrain, width, height, boxCount)) continue;

      const styleRoll = Math.random();
      const dividerTarget = width >= 7 && height >= 7
        ? (styleRoll < 0.34 ? randomInt(2, 4) : styleRoll < 0.72 ? randomInt(1, 3) : randomInt(0, 2))
        : 0;
      const motifTarget = styleRoll < 0.34
        ? randomInt(1, 3)
        : styleRoll < 0.72 ? randomInt(3, 6) : randomInt(4, 8);
      const targetInternalWalls = Math.max(2, Math.min(Math.floor(interiorArea * 0.24), randomInt(
        Math.max(2, Math.floor(interiorArea * 0.10)),
        Math.max(3, Math.floor(interiorArea * 0.19))
      )));

      for (let divider = 0; divider < dividerTarget; divider++) {
        const preferVertical = width > height ? true : width < height ? false : Math.random() < 0.5;
        const vertical = Math.random() < 0.7 ? preferVertical : !preferVertical;
        const feature = dividerFeature(terrain, width, height, vertical);
        if (feature.length) tryWallFeature(terrain, width, height, feature, boxCount);
      }

      for (let motif = 0; motif < motifTarget; motif++) placeRandomMotif(terrain, width, height, boxCount);
      while (internalWallCount(terrain, width, height) < targetInternalWalls) {
        if (!placeRandomMotif(terrain, width, height, boxCount)) break;
      }

      breakLargeOpenAreas(terrain, width, height, boxCount);
      if (!terrainRemainsUseful(terrain, width, height, boxCount)) continue;

      const score = terrainScore(terrain, width, height) + Math.random() * 4;
      if (score > bestScore) {
        bestScore = score;
        bestTerrain = terrain.slice();
      }
      const enoughStructure = internalWallCount(terrain, width, height) >= Math.max(2, Math.floor(interiorArea * 0.07));
      const openAreas = countLargeOpenAreas(terrain, width, height);
      if (enoughStructure && openAreas <= Math.max(2, Math.floor(interiorArea / 35))) return terrain;
    }

    if (bestTerrain) return bestTerrain;

    const fallback = makeBaseTerrain(width, height, square);
    for (let i = 0; i < Math.max(2, Math.floor(interiorArea / 16)); i++) placeRandomMotif(fallback, width, height, boxCount);
    return fallback;
  }

  function isTerrainBlocker(terrain, width, height, index, dx, dy) {
    const neighbour = localNeighbour(index, dx, dy, width, height);
    return neighbour < 0 || terrain[neighbour] !== " ";
  }

  function isStaticCorner(terrain, width, height, index) {
    const up = isTerrainBlocker(terrain, width, height, index, 0, -1);
    const down = isTerrainBlocker(terrain, width, height, index, 0, 1);
    const left = isTerrainBlocker(terrain, width, height, index, -1, 0);
    const right = isTerrainBlocker(terrain, width, height, index, 1, 0);
    return (up && left) || (up && right) || (down && left) || (down && right);
  }

  function chooseSpaced(candidates, count, width, minimumDistance = 2) {
    const chosen = [];
    for (const candidate of shuffled(candidates)) {
      const [x, y] = localCoords(candidate, width);
      const farEnough = chosen.every(existing => {
        const [ex, ey] = localCoords(existing, width);
        return Math.abs(x - ex) + Math.abs(y - ey) >= minimumDistance;
      });
      if (farEnough) chosen.push(candidate);
      if (chosen.length === count) return chosen;
    }
    const remainder = shuffled(candidates.filter(candidate => !chosen.includes(candidate)));
    while (chosen.length < count && remainder.length) chosen.push(remainder.pop());
    return chosen.length === count ? chosen : null;
  }

  function chooseGoalPositions(candidates, count, terrain, width, height) {
    const chosen = [];
    const remaining = new Set(candidates);
    while (chosen.length < count && remaining.size) {
      const scored = [...remaining].map(index => {
        const [x, y] = localCoords(index, width);
        const wallTouches = DIRECTIONS.reduce((total, [dx, dy]) => {
          const next = localNeighbour(index, dx, dy, width, height);
          return total + (next < 0 || terrain[next] !== " " ? 1 : 0);
        }, 0);
        const nearestGoal = chosen.length
          ? Math.min(...chosen.map(existing => {
              const [ex, ey] = localCoords(existing, width);
              return Math.abs(x - ex) + Math.abs(y - ey);
            }))
          : 99;
        let score = Math.random() * 5 + wallTouches * 2.4;
        if (nearestGoal === 1) score += 4.5;
        else if (nearestGoal === 2) score += 1.5;
        if (chosen.length > 1 && nearestGoal === 1) score -= 1.5;
        return { index, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const band = scored.slice(0, Math.min(6, scored.length));
      const selected = randomItem(band).index;
      chosen.push(selected);
      remaining.delete(selected);
    }
    return chosen.length === count ? chosen : null;
  }

  function composeGeneratedCells(terrain, goals, boxes, player) {
    const generated = terrain.slice();
    const goalSet = new Set(goals);
    goals.forEach(goal => { generated[goal] = "."; });
    boxes.forEach(box => { generated[box] = goalSet.has(box) ? "*" : "$"; });
    generated[player] = goalSet.has(player) ? "+" : "@";
    return generated;
  }

  function generateUnchecked(width, height, boxCount, square) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const terrain = buildTerrain(width, height, square, boxCount);
      const floors = terrain.map((value, index) => value === " " ? index : -1).filter(index => index >= 0);
      if (floors.length < boxCount * 3 + 2) continue;
      const goals = chooseGoalPositions(floors, boxCount, terrain, width, height);
      if (!goals) continue;
      const goalSet = new Set(goals);
      const boxCandidates = floors.filter(index => !goalSet.has(index) && !isStaticCorner(terrain, width, height, index));
      const boxes = chooseSpaced(boxCandidates, boxCount, width, 2);
      if (!boxes) continue;
      const used = new Set([...goals, ...boxes]);
      const playerCandidates = floors.filter(index => !used.has(index));
      if (!playerCandidates.length) continue;
      const player = randomItem(playerCandidates);
      return {
        width,
        height,
        boxes: boxCount,
        cells: composeGeneratedCells(terrain, goals, boxes, player),
        tested: false,
        square
      };
    }
    return null;
  }

  function verifyPullSolution(terrain, width, height, goalByBox, finalBoxes, finalPlayer, pulls) {
    const boxes = finalBoxes.slice();
    let player = finalPlayer;
    for (let i = pulls.length - 1; i >= 0; i--) {
      const pull = pulls[i];
      if (boxes[pull.boxId] !== pull.to) return false;
      const [fromX, fromY] = localCoords(pull.from, width);
      const [toX, toY] = localCoords(pull.to, width);
      const dx = fromX - toX;
      const dy = fromY - toY;
      if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
      const behindX = toX - dx;
      const behindY = toY - dy;
      if (behindX < 0 || behindY < 0 || behindX >= width || behindY >= height) return false;
      const behind = localIndex(behindX, behindY, width);
      const boxSet = new Set(boxes);
      const reachable = reachableSet(terrain, width, height, boxSet, player);
      if (!reachable.has(behind)) return false;
      if (!terrainWalkable(terrain, pull.from) || boxSet.has(pull.from)) return false;
      boxes[pull.boxId] = pull.from;
      player = pull.to;
    }
    return boxes.every((position, boxId) => position === goalByBox[boxId]);
  }

  function reverseBuildTested(terrain, width, height, boxCount) {
    const floors = terrain.map((value, index) => value === " " ? index : -1).filter(index => index >= 0);
    if (floors.length < boxCount * 3 + 3) return null;

    const goalCandidates = floors.filter(index => {
      const open = DIRECTIONS.filter(([dx, dy]) => {
        const next = localNeighbour(index, dx, dy, width, height);
        const beyond = next >= 0 ? localNeighbour(next, dx, dy, width, height) : -1;
        return next >= 0 && beyond >= 0 && terrain[next] === " " && terrain[beyond] === " ";
      });
      return open.length > 0;
    });
    const goals = chooseGoalPositions(goalCandidates, boxCount, terrain, width, height);
    if (!goals) return null;

    const boxes = goals.slice();
    const occupied = new Set(boxes);
    const playerCandidates = floors.filter(index => !occupied.has(index));
    if (!playerCandidates.length) return null;
    let player = randomItem(playerCandidates);
    const pulls = [];
    const moved = new Set();
    const seenBoxStates = new Set([boxes.slice().sort((a, b) => a - b).join(",")]);
    const targetPulls = Math.max(7, boxCount * randomInt(5, 8));

    for (let step = 0; step < targetPulls * 4 && pulls.length < targetPulls; step++) {
      const boxSet = new Set(boxes);
      const reachable = reachableSet(terrain, width, height, boxSet, player);
      const options = [];

      boxes.forEach((boxPosition, boxId) => {
        for (const [dx, dy] of DIRECTIONS) {
          const [bx, by] = localCoords(boxPosition, width);
          const playerX = bx - dx;
          const playerY = by - dy;
          const behindX = playerX - dx;
          const behindY = playerY - dy;
          if (playerX < 0 || playerY < 0 || playerX >= width || playerY >= height) continue;
          if (behindX < 0 || behindY < 0 || behindX >= width || behindY >= height) continue;
          const pullTo = localIndex(playerX, playerY, width);
          const playerAfter = localIndex(behindX, behindY, width);
          if (!reachable.has(pullTo)) continue;
          if (!terrainWalkable(terrain, pullTo) || !terrainWalkable(terrain, playerAfter)) continue;
          if (boxSet.has(pullTo) || boxSet.has(playerAfter)) continue;

          const nextBoxes = boxes.slice();
          nextBoxes[boxId] = pullTo;
          const stateKey = nextBoxes.slice().sort((a, b) => a - b).join(",");
          const previous = pulls.at(-1);
          const immediateUndo = previous && previous.boxId === boxId && previous.from === pullTo && previous.to === boxPosition;
          let score = Math.random() * 3;
          if (!moved.has(boxId)) score += 10;
          if (!goals.includes(pullTo)) score += 4;
          if (!seenBoxStates.has(stateKey)) score += 5;
          if (previous) {
            if (previous.boxId !== boxId) score += 4;
            else if (previous.dx !== dx || previous.dy !== dy) score += 5;
            else score -= 2.5;
          }
          const openAtDestination = openNeighbourCount(terrain, width, height, pullTo);
          if (openAtDestination === 2) score += 1.5;
          if (immediateUndo) score -= 24;
          options.push({ boxId, from: boxPosition, to: pullTo, playerAfter, stateKey, dx, dy, score });
        }
      });

      if (!options.length) break;
      options.sort((a, b) => b.score - a.score);
      const bestBand = options.slice(0, Math.min(4, options.length));
      const chosen = randomItem(bestBand);
      boxes[chosen.boxId] = chosen.to;
      player = chosen.playerAfter;
      moved.add(chosen.boxId);
      seenBoxStates.add(chosen.stateKey);
      pulls.push(chosen);
    }

    const goalsSet = new Set(goals);
    const unsolvedBoxes = boxes.filter(position => !goalsSet.has(position)).length;
    let boxLines = 0;
    let boxChanges = 0;
    pulls.forEach((pull, index) => {
      const previous = pulls[index - 1];
      if (!previous || previous.boxId !== pull.boxId || previous.dx !== pull.dx || previous.dy !== pull.dy) boxLines++;
      if (previous && previous.boxId !== pull.boxId) boxChanges++;
    });
    if (pulls.length < Math.max(7, boxCount * 3)) return null;
    if (moved.size !== boxCount) return null;
    if (unsolvedBoxes < Math.max(1, boxCount - 1)) return null;
    if (boxLines < Math.max(boxCount + 2, Math.floor(pulls.length * 0.32))) return null;
    if (boxCount >= 3 && boxChanges < 2) return null;
    if (!verifyPullSolution(terrain, width, height, goals, boxes, player, pulls)) return null;

    return {
      width,
      height,
      boxes: boxCount,
      cells: composeGeneratedCells(terrain, goals, boxes, player),
      tested: true,
      square: false,
      solutionPushes: pulls.length,
      solutionLines: boxLines,
      solutionBoxChanges: boxChanges
    };
  }

  async function generateChecked(width, height, boxCount, square) {
    for (let attempt = 1; attempt <= 180; attempt++) {
      const terrain = buildTerrain(width, height, square, boxCount);
      const generated = reverseBuildTested(terrain, width, height, boxCount);
      if (generated) {
        generated.square = square;
        return generated;
      }
      if (attempt % 10 === 0) {
        setStatus(`Generating and checking… attempt ${attempt}.`);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    return null;
  }

  function applyGeneratedLevel(generated) {
    cols = generated.width;
    rows = generated.height;
    cells = generated.cells.slice();
    syncSizeInputs();
    boxesInput.value = String(generated.boxes);
    renderGrid();
    updateTextFromGrid();
    clearActiveSave();
  }

  async function generateLevel() {
    const width = clampGeneratorSize(widthInput.value);
    const height = clampGeneratorSize(heightInput.value);
    const boxCount = clampBoxes(boxesInput.value);
    const square = Boolean(squareInput.checked);
    const tested = Boolean(testedInput.checked);
    widthInput.value = String(width);
    heightInput.value = String(height);
    boxesInput.value = String(boxCount);

    const approximateFloor = Math.max(1, (width - 2) * (height - 2));
    const sensibleMaximum = Math.min(MAX_GENERATOR_BOXES, Math.max(1, Math.floor((approximateFloor - 1) / 3)));
    if (boxCount > sensibleMaximum) {
      setStatus(`That size has too little working space for ${boxCount} boxes. Try ${sensibleMaximum} or fewer.`, "error");
      return;
    }

    generateBtn.disabled = true;
    generateBtn.setAttribute("aria-busy", "true");
    const originalLabel = generateBtn.textContent;
    generateBtn.textContent = tested ? "GENERATING + CHECKING…" : "GENERATING…";
    setStatus(tested ? "Generating a level and checking its solution path…" : "Generating a new level…");
    await waitForPaint();

    try {
      const generated = tested
        ? await generateChecked(width, height, boxCount, square)
        : generateUnchecked(width, height, boxCount, square);
      if (!generated) {
        setStatus(tested
          ? "A checked level could not be built with those settings. Try fewer boxes or a larger grid."
          : "A level could not be built with those settings. Try fewer boxes or a larger grid.", "error");
        return;
      }
      applyGeneratedLevel(generated);
      if (tested) {
        setStatus(`Generated and checked: ${boxCount} ${boxCount === 1 ? "box" : "boxes"}, verified ${generated.solutionPushes}-push path across ${generated.solutionLines} box lines.`, "success");
      } else {
        setStatus(`Generated ${boxCount}-box level without a completion check.`, "success");
      }
    } catch (error) {
      setStatus(error?.message || "The level generator stopped unexpectedly.", "error");
    } finally {
      generateBtn.disabled = false;
      generateBtn.removeAttribute("aria-busy");
      generateBtn.textContent = originalLabel;
    }
  }

  function readSavedLevels() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(record => record && typeof record.id === "string" && typeof record.name === "string");
    } catch (_) {
      return [];
    }
  }

  function writeSavedLevels(records) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(records.slice(0, 100)));
  }

  function newSaveId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `level-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function renderSavedLevels(preferredId = "") {
    const records = readSavedLevels().sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    savedSelect.innerHTML = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = records.length ? "CHOOSE A SAVED LEVEL" : "NO SAVED LEVELS";
    savedSelect.appendChild(emptyOption);
    records.forEach(record => {
      const option = document.createElement("option");
      option.value = record.id;
      const boxTotal = Array.isArray(record.cells) ? countBoxes(record.cells) : Number(record.boxes || 0);
      option.textContent = `${record.name} · ${record.cols || "?"}×${record.rows || "?"} · ${boxTotal} ${boxTotal === 1 ? "box" : "boxes"}`;
      savedSelect.appendChild(option);
    });
    const selection = preferredId && records.some(record => record.id === preferredId) ? preferredId : "";
    savedSelect.value = selection;
    loadBtn.disabled = !records.length;
    deleteBtn.disabled = !records.length;
  }

  function saveCurrentLevel() {
    const records = readSavedLevels();
    const existingIndex = activeSaveId ? records.findIndex(record => record.id === activeSaveId) : -1;
    const defaultNumber = records.length + (existingIndex >= 0 ? 0 : 1);
    const name = saveNameInput.value.trim() || `Saved level ${Math.max(1, defaultNumber)}`;
    const now = Date.now();
    const record = {
      id: existingIndex >= 0 ? records[existingIndex].id : newSaveId(),
      name,
      cols,
      rows,
      cells: cells.slice(),
      boxes: countBoxes(),
      createdAt: existingIndex >= 0 ? records[existingIndex].createdAt || now : now,
      updatedAt: now
    };
    if (existingIndex >= 0) records[existingIndex] = record;
    else records.push(record);
    try {
      writeSavedLevels(records);
      activeSaveId = record.id;
      saveNameInput.value = name;
      renderSavedLevels(record.id);
      setStatus(`Saved “${name}”.`, "success");
    } catch (_) {
      setStatus("This browser would not allow the level to be saved locally.", "error");
    }
  }

  function loadSavedLevel() {
    const id = savedSelect.value;
    const record = readSavedLevels().find(item => item.id === id);
    if (!record) {
      setStatus("Choose a saved level first.", "error");
      return;
    }
    const savedCols = clampSize(record.cols);
    const savedRows = clampSize(record.rows);
    if (!Array.isArray(record.cells) || record.cells.length !== savedCols * savedRows || record.cells.some(value => !VALID.has(value))) {
      setStatus("That saved level is damaged and could not be loaded.", "error");
      return;
    }
    cols = savedCols;
    rows = savedRows;
    cells = record.cells.slice();
    activeSaveId = record.id;
    saveNameInput.value = record.name;
    syncSizeInputs();
    boxesInput.value = String(Math.max(1, countBoxes()));
    renderGrid();
    updateTextFromGrid();
    renderSavedLevels(record.id);
    setStatus(`Loaded “${record.name}”.`, "success");
  }

  function resetDeleteButton() {
    pendingDeleteId = "";
    clearTimeout(deleteTimer);
    deleteBtn.textContent = "DELETE";
  }

  function deleteSavedLevel() {
    const id = savedSelect.value;
    if (!id) {
      setStatus("Choose a saved level first.", "error");
      return;
    }
    if (pendingDeleteId !== id) {
      pendingDeleteId = id;
      deleteBtn.textContent = "CONFIRM";
      setStatus("Press CONFIRM to delete the selected saved level.");
      deleteTimer = window.setTimeout(resetDeleteButton, 3500);
      return;
    }
    const records = readSavedLevels();
    const removed = records.find(record => record.id === id);
    try {
      writeSavedLevels(records.filter(record => record.id !== id));
      if (activeSaveId === id) clearActiveSave();
      resetDeleteButton();
      renderSavedLevels();
      setStatus(removed ? `Deleted “${removed.name}”.` : "Saved level deleted.", "success");
    } catch (_) {
      setStatus("This browser would not allow the saved level to be deleted.", "error");
    }
  }

  function openMaker() {
    modal.hidden = false;
    exitTestBtn.hidden = !window.BoxxyGameAPI?.isMakerTesting?.();
    renderSavedLevels(activeSaveId);
    scheduleGridFit();
    closeBtn.focus({ preventScroll: true });
  }

  function closeMaker() {
    modal.hidden = true;
  }

  function selectTool(tool) {
    activeTool = tool;
    toolButtons.forEach(button => button.classList.toggle("selected", button.dataset.makerTool === tool));
  }

  toolButtons.forEach(button => {
    button.addEventListener("click", () => selectTool(button.dataset.makerTool));
  });

  gridEl.addEventListener("pointerdown", event => {
    const cell = event.target.closest(".maker-cell");
    if (!cell) return;
    event.preventDefault();
    painting = true;
    lastPaintIndex = -1;
    paintIndex(Number(cell.dataset.index));
  });

  gridEl.addEventListener("pointermove", event => {
    if (!painting) return;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".maker-cell");
    if (target && gridEl.contains(target)) paintIndex(Number(target.dataset.index));
  });

  window.addEventListener("pointerup", () => {
    painting = false;
    lastPaintIndex = -1;
  });
  window.addEventListener("pointercancel", () => {
    painting = false;
    lastPaintIndex = -1;
  });

  gridEl.addEventListener("keydown", event => {
    const cell = event.target.closest(".maker-cell");
    if (!cell) return;
    const index = Number(cell.dataset.index);
    const [x, y] = coordsOf(index);
    let nextIndex = null;
    if (event.key === "ArrowLeft" && x > 0) nextIndex = index - 1;
    if (event.key === "ArrowRight" && x < cols - 1) nextIndex = index + 1;
    if (event.key === "ArrowUp" && y > 0) nextIndex = index - cols;
    if (event.key === "ArrowDown" && y < rows - 1) nextIndex = index + cols;
    if (nextIndex !== null) {
      event.preventDefault();
      gridEl.children[nextIndex]?.focus();
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      lastPaintIndex = -1;
      paintIndex(index);
    }
  });

  generateBtn.addEventListener("click", generateLevel);
  resizeBtn.addEventListener("click", () => resizeGrid(widthInput.value, heightInput.value));
  roomBtn.addEventListener("click", () => makeRoom(widthInput.value, heightInput.value));
  clearBtn.addEventListener("click", () => {
    cols = clampSize(widthInput.value);
    rows = clampSize(heightInput.value);
    cells = blankGrid(cols, rows, VOID);
    syncSizeInputs();
    renderGrid();
    updateTextFromGrid();
    clearActiveSave();
    setStatus("Grid cleared.");
  });

  importBtn.addEventListener("click", () => {
    try {
      importRows(normalizePastedText(textEl.value));
    } catch (error) {
      setStatus(error?.message || "The level could not be imported.", "error");
    }
  });

  copyBtn.addEventListener("click", async () => {
    const validation = validate();
    updateTextFromGrid();
    try {
      await navigator.clipboard.writeText(textEl.value);
      setStatus(validation.ok ? "Level copied to the clipboard." : `Copied, but note: ${validation.error}`, validation.ok ? "success" : "error");
    } catch (_) {
      textEl.focus();
      textEl.select();
      const copied = document.execCommand?.("copy");
      setStatus(copied ? "Level copied to the clipboard." : "The level is ready in the text box for manual copying.", copied ? "success" : "");
    }
  });

  saveBtn.addEventListener("click", saveCurrentLevel);
  loadBtn.addEventListener("click", loadSavedLevel);
  deleteBtn.addEventListener("click", deleteSavedLevel);
  savedSelect.addEventListener("change", resetDeleteButton);
  saveNameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveCurrentLevel();
    }
  });

  testBtn.addEventListener("click", () => {
    const validation = validate();
    if (!validation.ok) {
      setStatus(validation.error, "error");
      return;
    }
    const result = window.BoxxyGameAPI?.startMakerTest?.(validation.rows);
    if (!result?.ok) {
      setStatus(result?.error || "The game could not load this level.", "error");
      return;
    }
    setStatus(`Testing a level with ${validation.boxes} ${validation.boxes === 1 ? "box" : "boxes"}.`, "success");
    exitTestBtn.hidden = false;
    closeMaker();
  });

  exitTestBtn.addEventListener("click", () => {
    window.BoxxyGameAPI?.exitMakerTest?.();
    exitTestBtn.hidden = true;
    closeMaker();
  });

  closeBtn.addEventListener("click", closeMaker);
  modal.addEventListener("click", event => {
    if (event.target === modal) closeMaker();
  });

  hotspot?.addEventListener("click", event => {
    event.preventDefault();
    unlockClicks += 1;
    clearTimeout(unlockTimer);
    if (unlockClicks >= 5) {
      unlockArmed = true;
      unlockTimer = window.setTimeout(() => {
        unlockClicks = 0;
        unlockArmed = false;
      }, 12000);
    } else {
      unlockTimer = window.setTimeout(() => {
        unlockClicks = 0;
        unlockArmed = false;
      }, 5000);
    }
  });

  document.addEventListener("keydown", event => {
    if (unlockArmed && event.key.toLowerCase() === "x" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      unlockClicks = 0;
      unlockArmed = false;
      clearTimeout(unlockTimer);
      openMaker();
      return;
    }
    if (event.key === "Escape" && !modal.hidden) {
      event.preventDefault();
      event.stopPropagation();
      closeMaker();
    }
  }, { capture: true });

  window.addEventListener("boxxy-maker-return", openMaker);
  window.addEventListener("resize", scheduleGridFit);
  window.addEventListener("orientationchange", scheduleGridFit);
  if (gridShell && "ResizeObserver" in window) {
    const makerResizeObserver = new ResizeObserver(scheduleGridFit);
    makerResizeObserver.observe(gridShell);
  }

  selectTool("wall");
  makeRoom(10, 10, false);
  boxesInput.value = "3";
  renderSavedLevels();
})();
