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

const moduleName = (file) => file.replace(/\.(ts|js)$/, "");

function buildGraph () {
  const graph = new Map();
  for (const file of fs.readdirSync(SRC)) {
    if (!/\.(ts|js)$/.test(file) || file.endsWith(".d.ts")) { continue; }
    const source = fs.readFileSync(path.join(SRC, file), "utf8");
    const deps = new Set();
    // Value imports and re-exports only.  `import type` erases at compile time and cannot
    // create a runtime cycle.
    for (const match of source.matchAll(/import\s+(type\s+)?[\s\S]*?from\s+"\.\/([\w.]+)"/g)) {
      if (!match[1]) { deps.add(match[2]); }
    }
    for (const match of source.matchAll(/export\s+\{[^}]*\}\s+from\s+"\.\/([\w.]+)"/g)) {
      deps.add(match[1]);
    }
    graph.set(moduleName(file), [...deps]);
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

const cycles = findCycles(buildGraph());
const offending = cycles.filter((cycle) => !ALLOWED.some((allowed) => allowed.test(cycle)));

if (offending.length > 0) {
  console.error(`Found ${offending.length} disallowed import cycle(s) in ${SRC}:`);
  for (const cycle of offending) { console.error(`  ${cycle}`); }
  process.exit(1);
}
console.log(`No disallowed import cycles in ${SRC}. (${cycles.length - offending.length} allowed)`);
