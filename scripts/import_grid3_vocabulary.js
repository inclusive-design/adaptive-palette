/*
 * Copyright The Adaptive Palette copyright holders
 * See the AUTHORS.md file at the top-level directory of this distribution and at
 * https://github.com/inclusive-design/adaptive-palette/raw/main/AUTHORS.md.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */
/*
 * Usage, from the repository root:
 * node scripts/import_grid3_vocabulary.js <grid set folder> <mapping file> <set name>
 *
 * Converts the vocabulary of an unzipped Grid 3 grid set into the palette set
 * `public/palette-sets/<set name>/`, replacing any earlier import. Each palette shows the standard
 * chart's header, with the grid's words below it where they were in Grid 3. The grid's message area
 * and command buttons are left out. See docs/devDoc/Grid3Mapping.md, "Importing the vocabulary only".
 */

import path from "node:path";
import {
  convertCell, copyPicture, fillGridSize, gridSize, readGridset, runImport, writeJson, writeSet
} from "./import_grid3_layout.js";

// The standard chart's palettes that the header and the command bar use, by name, as paths from the
// new set's palette_set.json. They are shared, not copied.
export const STANDARD_PALETTES = {
  "Standard Header": "../standardBlissChart/palettes/standard_header.json",
  "Input Area": "../standardBlissChart/palettes/input_area.json",
  "Command Bar": "../standardBlissChart/palettes/command_bar.json",
  "indicators": "../standardBlissChart/palettes/indicators.json",
  "modifiers": "../standardBlissChart/palettes/modifiers.json",
  "attributes": "../standardBlissChart/palettes/attributes.json"
};

const WORD_TYPES = new Set(["ActionCodeCell", "ActionBranchToPaletteCell", "ContentRemoved"]);

/**
 * What a converted cell is to the vocabulary import.
 * @param {Object|null} result - What `convertCell()` returned.
 * @returns {string} - "word", "rest" (a `ContentLabel`, which `convertCell()` makes only for a rest cell,
 *                     and so for a label), "empty" or "command".
 */
function cellKind (result) {
  if (!result) {
    return "empty";
  }
  const type = result.cell?.type;
  return type === "ContentLabel" ? "rest" : WORD_TYPES.has(type) ? "word" : "command";
}

/**
 * The grids that get a palette: those with a word or rest cell. A folder cell counts only when the
 * grid it opens gets a palette, so grids are added until there are none left to add.
 * @param {Map<string, Object[]>} converted - Each grid's cells as `{ raw, result }`, by grid name.
 * @returns {Set<string>}
 */
export function vocabularyGrids (converted) {
  const keep = new Set();
  let added = true;
  while (added) {
    added = false;
    for (const [name, cells] of converted) {
      const hasVocabulary = cells.some(({ result }) => {
        const kind = cellKind(result);
        return kind === "rest" || (kind === "word" &&
          (result.cell.type !== "ActionBranchToPaletteCell" || keep.has(result.cell.options.branchTo)));
      });
      if (hasVocabulary && !keep.has(name)) {
        keep.add(name);
        added = true;
      }
    }
  }
  return keep;
}

/**
 * Where each row or column goes. One is kept when a word or rest cell covers it, or when no cell but
 * empty ones covers it, which keeps the rows and columns a dwell user rests on. A word or rest cell
 * keeps every row and column it spans.
 * @param {Object[]} cells - The grid's cells as `{ raw, kind }`.
 * @param {number} size - The number of rows or columns.
 * @param {string} axis - "x" for columns, "y" for rows.
 * @returns {number[]} - Each row or column's new index, counting from 0, or -1 when it is removed.
 */
function keptLines (cells, size, axis) {
  const span = axis === "x" ? "columnSpan" : "rowSpan";
  let next = 0;
  return Array.from({ length: size }, (_, i) => {
    const here = cells.filter(({ raw }) => raw[axis] <= i && i < raw[axis] + raw[span]);
    const keep = here.some(({ kind }) => kind === "word" || kind === "rest") || here.every(({ kind }) => kind === "empty");
    return keep ? next++ : -1;
  });
}

/**
 * One grid's palette: the Standard Header in row 1, and its word and rest cells below it.
 * @param {Object} grid - A grid from `readGridset()`.
 * @param {Object[]} converted - Its cells as `{ raw, result }`.
 * @param {Set<string>} keep - The grids that get a palette.
 * @returns {Object} - `{ cells, copies, report }`: the palette's cells by id, the picture files to copy from the
 *                     grid's folder, and the report lines.
 */
function vocabularyPalette (grid, converted, keep) {
  const report = [];
  const cells = converted.map(({ raw, result }) => {
    const kind = cellKind(result);
    // A folder cell whose grid has no palette leads nowhere, so it is left out like a command.
    const lost = result?.cell?.type === "ActionBranchToPaletteCell" && !keep.has(result.cell.options.branchTo);
    return { raw, result, kind: lost ? "lost" : kind };
  });
  const [definedColumns, definedRows] = gridSize(grid.xml);
  const rows = keptLines(cells, Math.max(definedRows, ...grid.raws.map(raw => raw.y + raw.rowSpan)), "y");
  // Columns are judged only over the kept rows, so a column whose only command is in a removed row is kept.
  const inKeptRows = cells.filter(({ raw }) => rows.slice(raw.y, raw.y + raw.rowSpan).some(i => i >= 0));
  const columns = keptLines(inKeptRows, Math.max(definedColumns, ...grid.raws.map(raw => raw.x + raw.columnSpan)), "x");
  const columnCount = columns.filter(i => i >= 0).length;
  const rowCount = rows.filter(i => i >= 0).length;

  const palette = {
    "standard-header": {
      type: "PaletteInclude",
      options: { palette: "Standard Header", rowStart: 1, rowSpan: 1, columnStart: 1, columnSpan: columnCount }
    }
  };
  const copies = [];
  for (const { raw, result, kind } of cells) {
    const where = `${grid.name} (${raw.x}, ${raw.y})`;
    if (kind === "lost") {
      report.push(`${where}: left out, "${result.cell.options.branchTo}" has no palette`);
      continue;
    }
    if (kind !== "word" && kind !== "rest") {
      continue;
    }
    // An insert that also jumps keeps the insert when the jump's grid has no palette.
    const { branchTo, ...rest } = result.cell.options;
    const jumpLost = branchTo !== undefined && !keep.has(branchTo);
    const options = jumpLost ? rest : result.cell.options;
    if (jumpLost) {
      report.push(`${where}: jump left out, "${branchTo}" has no palette`);
    }
    if (result.warning) {
      report.push(`${where}: ${result.warning}`);
    }
    if (result.copy) {
      copies.push(result.copy);
    }
    palette[result.id] = {
      type: result.cell.type,
      options: { ...options, columnStart: columns[raw.x] + 1, rowStart: rows[raw.y] + 2 }
    };
  }
  fillGridSize(palette, columnCount, rowCount + 1);

  const commands = cells.filter(({ kind }) => kind === "command").length;
  const removedRows = rows.length - rowCount;
  const removedColumns = columns.length - columnCount;
  if (commands || removedRows || removedColumns) {
    report.push(`${grid.name}: command cells left out: ${commands}, rows removed: ${removedRows}, ` +
      `columns removed: ${removedColumns}`);
  }
  return { cells: palette, copies, report };
}

/**
 * Write the palette set for a grid set's vocabulary into `setDir`.
 * @param {string} gridsetDir - The unzipped grid set.
 * @param {Object} mapping - The mapping file's contents: picture keys to mapping strings.
 * @param {string} setDir - The palette set folder to write.
 * @returns {string[]} - The report.
 * @throws when `readGridset()` does, when a grid has the name of a standard palette, or when the start grid
 *         has no vocabulary.
 */
export function importVocabulary (gridsetDir, mapping, setDir) {
  const { startPalette, language, grids, context } = readGridset(gridsetDir, mapping);
  const clash = grids.find(grid => Object.hasOwn(STANDARD_PALETTES, grid.name));
  if (clash) {
    throw new Error(`Grid "${clash.name}" has the name of a standard palette. Rename it in Grid 3.`);
  }
  // A label (a caption and no commands, such as a heading) is converted as a rest cell.
  const asRest = raw => raw.commands.length === 0 && raw.caption ? { ...raw, commands: ["Settings.RestPointer"] } : raw;
  const converted = new Map(grids.map(grid => [
    grid.name, grid.raws.map(raw => ({ raw, result: convertCell(asRest(raw), { ...grid, ...context }) }))
  ]));
  const keep = vocabularyGrids(converted);
  if (!keep.has(startPalette)) {
    throw new Error(`The start grid "${startPalette}" has no vocabulary.`);
  }

  const report = [];
  writeSet(setDir, outDir => {
    const palettes = { ...STANDARD_PALETTES };
    for (const grid of grids) {
      if (grid.wordListProblem) {
        report.push(grid.wordListProblem);
      }
      // The cells the layout import skips and reports.
      for (const { raw, result } of converted.get(grid.name)) {
        if (result?.skipped) {
          report.push(`${grid.name} (${raw.x}, ${raw.y}): skipped, ${result.skipped}`);
        }
      }
      if (!keep.has(grid.name)) {
        report.push(`${grid.name}: no vocabulary, so no palette`);
        continue;
      }
      const { cells, copies, report: lines } = vocabularyPalette(grid, converted.get(grid.name), keep);
      report.push(...lines);
      copies.forEach(file => copyPicture(outDir, grid, file));
      palettes[grid.name] = `palettes/${grid.slug}.json`;
      writeJson(path.join(outDir, palettes[grid.name]), { name: grid.name, language, cells });
    }
    writeJson(path.join(outDir, "palette_set.json"), { formatVersion: 1, startPalette, palettes });
  });
  return report;
}

if (import.meta.main) {
  runImport("import_grid3_vocabulary.js", importVocabulary);
}
