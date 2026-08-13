/*
 * Fail the build when an import cycle appears in `src/client`.
 *
 * Cycles listed in ALLOWED are known and tolerated; every other cycle is an error.
 */
import fs from "node:fs";
import path from "node:path";

const SRC = "src/client";

// Known, tolerated cycles.  `Palette` and the cell components it renders refer to each other
// through `CellTypeRegistry`; that works because Preact resolves components lazily at render.
// Removing this entry is tracked as separate work.
const ALLOWED = [/CellTypeRegistry/];

// Every `.ts`/`.js` file under `src/client`, at any depth.  Type declarations are not modules.
function sourceFiles (dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__screenshots__") { found.push(...sourceFiles(full)); }
    } else if (/\.(ts|js)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      found.push(full);
    }
  }
  return found;
}

// A module's identity is its path below `src/client`, without the extension:
// `cells/ActionSpeakCell`, `core/MessageLog`.
const moduleId = (file) => path.relative(SRC, file).replace(/\.(ts|js)$/, "");

function buildGraph () {
  const graph = new Map();
  for (const file of sourceFiles(SRC)) {
    const source = fs.readFileSync(file, "utf8");
    const deps = new Set();
    // A relative specifier is resolved against the importing file's folder, so
    // `../state/GlobalData` from `cells/` and `./GlobalData` from `state/` are one module.
    const addDep = (specifier) => {
      deps.add(moduleId(path.resolve(path.dirname(file), specifier)));
    };
    // Value imports and re-exports only.  `import type` erases at compile time and cannot
    // create a runtime cycle.
    for (const match of source.matchAll(/import\s+(type\s+)?[\s\S]*?from\s+"(\.[^"]*)"/g)) {
      if (!match[1]) { addDep(match[2]); }
    }
    for (const match of source.matchAll(/export\s+\{[^}]*\}\s+from\s+"(\.[^"]*)"/g)) {
      addDep(match[1]);
    }
    graph.set(moduleId(file), [...deps]);
  }
  return graph;
}

function findCycles (graph) {
  const found = new Set();
  const walk = (node, trail, seen) => {
    for (const dep of graph.get(node) ?? []) {
      const at = trail.indexOf(dep);
      if (at >= 0) {
        const cycle = trail.slice(at);
        // Rotate to a stable starting point so the same cycle is not reported twice.
        const lowest = cycle.indexOf([...cycle].sort()[0]);
        found.add([...cycle.slice(lowest), ...cycle.slice(0, lowest)].join(" -> "));
        continue;
      }
      if (seen.has(dep)) { continue; }
      walk(dep, [...trail, dep], new Set([...seen, dep]));
    }
  };
  for (const node of graph.keys()) { walk(node, [node], new Set([node])); }
  return [...found].sort();
}

const graph = buildGraph();
const cycles = findCycles(graph);
const offending = cycles.filter((cycle) => !ALLOWED.some((allowed) => allowed.test(cycle)));

if (offending.length > 0) {
  console.error(`Found ${offending.length} disallowed import cycle(s) in ${SRC}:`);
  for (const cycle of offending) { console.error(`  ${cycle}`); }
  process.exit(1);
}
// The module count makes a vacuous pass visible: a checker that graphs nothing finds nothing.
console.log(`No disallowed import cycles in ${SRC}. (${graph.size} modules, ${cycles.length - offending.length} allowed)`);
