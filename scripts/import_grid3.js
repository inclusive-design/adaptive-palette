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
 * node scripts/import_grid3.js <grid set folder> <mapping file> <set name>
 *
 * Converts an unzipped Grid 3 grid set into the palette set `public/palette-sets/<set name>/`,
 * replacing any earlier import. The mapping file names the Bliss symbols each picture shows,
 * such as `{ "Grids/Person/0-1-0-text-0.jpg": "B513" }`. See docs/devDoc/Grid3Mapping.md,
 * "Importing a grid set".
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The standard chart's command cells give their symbols to the imported command cells.
const STANDARD_PALETTES = path.join(root, "public", "palette-sets", "standardBlissChart", "palettes");

// The rule `paletteSetPath()` in `src/client/core/PaletteStore.ts` applies to a set name.
const SET_NAME = /^[A-Za-z0-9_-]+$/;

const ENTITIES = { lt: "<", gt: ">", quot: "\"", apos: "'", amp: "&" };

/**
 * The text an XML value holds, with CDATA sections unwrapped and the five XML entities decoded.
 * @param {string} raw - The value between an element's tags.
 * @returns {string}
 */
function xmlText (raw) {
  return raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>|&(lt|gt|quot|apos|amp);/g,
    (match, cdata, entity) => cdata ?? ENTITIES[entity]);
}

/**
 * The trimmed text of the first `<name>` element in `xml`.
 * @param {string} xml
 * @param {string} name - An element name with no attributes on its tag, such as "Caption".
 * @returns {string} - "" when there is no such element.
 */
function element (xml, name) {
  const match = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? xmlText(match[1]).trim() : "";
}

// Grid 3 commands that map to one of our command cells.
const COMMAND_CELLS = {
  "Jump.Back": "CommandGoBackCell",
  "Jump.Home": "CommandGoToRootCell",
  "Action.Speak": "ActionSpeakCell",
  "Action.DeleteWord": "CommandDelLastEncoding",
  "Action.Clear": "CommandClearEncoding"
};

// The command cells that speak or change the message, so they name it with `ariaControls`.
const MESSAGE_COMMANDS = new Set(["ActionSpeakCell", "CommandDelLastEncoding", "CommandClearEncoding"]);

/**
 * Turn a mapping string into a composition: `"B513/B548"` becomes `[513, "/", 548]`. A
 * `B<digits>` piece becomes its number. Separators and every other piece, such as `"B10:6,0"`
 * or `"XAnna"`, stay strings, which `compositionToBstr()` passes to the builder unchanged.
 * A single symbol becomes a bare number, as in the shipped palettes.
 * @param {string} spelling - A value from the mapping file.
 * @returns {number | (number | string)[]}
 */
export function parseComposition (spelling) {
  const parts = spelling.split(/(\/\/|\/|;;|;)/)
    .filter(part => part !== "")
    .map(part => /^B\d+$/.test(part) ? Number(part.slice(1)) : part);
  return parts.length === 1 && typeof parts[0] === "number" ? parts[0] : parts;
}

/**
 * A grid name as an ASCII snake_case file name: "Blå sida" becomes "bla_sida".
 * @param {string} name - The grid name.
 * @returns {string} - "" when the name has no ASCII letters or digits.
 */
export function slugify (name) {
  return name.normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * The cells of a `grid.xml`, with only the fields the import reads. Grid 3 writes this file by
 * machine and never nests `<Cell>`, so regular expressions are enough.
 * @param {string} xml - The contents of a `grid.xml`.
 * @returns {Object[]} - One `{ x, y, columnSpan, rowSpan, contentType, commands, jumpTo, caption,
 *                       image, insertedText, basedOnStyle, backColour }` per cell. `jumpTo` is NFC, to
 *                       match grid names. `backColour` is the cell's own colour, "" when it has none.
 */
export function readCells (xml) {
  return [...xml.matchAll(/<Cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/Cell>)/g)].map(([, attributeText, body = ""]) => {
    const attributes = Object.fromEntries(
      [...attributeText.matchAll(/(\w+)="([^"]*)"/g)].map(([, name, value]) => [name, Number(value)])
    );
    const insertText = body.match(/<Command ID="Action\.InsertText">([\s\S]*?)<\/Command>/)?.[1] ?? "";
    const jumpTo = body.match(/<Command ID="Jump\.To">[\s\S]*?<Parameter Key="grid">([\s\S]*?)<\/Parameter>/)?.[1] ?? "";
    return {
      x: attributes.X ?? 0,
      y: attributes.Y ?? 0,
      columnSpan: attributes.ColumnSpan ?? 1,
      rowSpan: attributes.RowSpan ?? 1,
      contentType: element(body, "ContentType"),
      commands: [...body.matchAll(/<Command ID="([^"]+)"/g)].map(([, id]) => id),
      jumpTo: xmlText(jumpTo).trim().normalize("NFC"),
      caption: element(body, "Caption"),
      image: element(body, "Image"),
      insertedText: [...insertText.matchAll(/<r>([\s\S]*?)<\/r>/g)]
        .map(([, run]) => xmlText(run))
        .join("")
        .replace(/\s+/g, " ")
        .trim(),
      basedOnStyle: element(body, "BasedOnStyle"),
      backColour: element(body, "BackColour")
    };
  });
}

/**
 * What a word cell shows: the symbols the mapping gives its picture, its embedded picture, or
 * nothing, so that it shows its label only.
 * @param {Object} raw - A cell from `readCells()`.
 * @param {Object} grid - See `convertCell()`.
 * @returns {Object} - `{ composition }`, `{ picture, copy }`, `{ warning }` or `{}`. `copy` is the
 *                     picture file to copy from the grid's folder.
 */
function symbolOrPicture (raw, grid) {
  if (!raw.image) {
    return {};
  }
  // A library picture, such as `[blissx]18274.wmf`, is not in the export. The mapping names it as
  // the grid does.
  const isLibrary = raw.image.startsWith("[");
  if (!isLibrary && /[/\\]/.test(raw.image)) {
    return { warning: `picture name ${raw.image} not allowed` };
  }
  const file = `${raw.x}-${raw.y}${raw.image}`;
  const spelling = grid.mapping[isLibrary ? raw.image : `Grids/${grid.name}/${file}`];
  if (spelling) {
    return { composition: parseComposition(spelling) };
  }
  if (isLibrary) {
    return {};
  }
  if (!fs.existsSync(path.join(grid.dir, file))) {
    return { warning: `picture ${file} not found` };
  }
  return { picture: `../pictures/${grid.slug}/${file}`, copy: file };
}

/**
 * Convert one cell read by `readCells()` to a palette cell.
 * @param {Object} raw - A cell from `readCells()`.
 * @param {Object} grid - `{ name, slug, dir, mapping, gridNames, icons, styles }`: the grid's NFC name,
 *                        its file slug and its folder; the mapping, with NFC keys; every grid's name;
 *                        the standard chart's command cell compositions, by cell type; and a Map of
 *                        each named style's background colour.
 * @returns {Object|null} - `null` for an empty slot, `{ skipped }` with the reason for a cell that
 *                          cannot be imported, or `{ id, cell, copy, warning }`. `copy` names a picture
 *                          file to copy, and `warning` is a problem to report.
 */
export function convertCell (raw, grid) {
  const layout = { rowStart: raw.y + 1, rowSpan: raw.rowSpan, columnStart: raw.x + 1, columnSpan: raw.columnSpan };
  if (raw.contentType === "Workspace") {
    return { id: "content-encoding-area", cell: { type: "ContentEncoding", options: layout } };
  }
  if (raw.commands.length === 0 && !raw.caption) {
    return null;
  }
  const id = `cell-${raw.x}-${raw.y}`;
  const label = raw.caption || raw.insertedText;

  // An insert wins over the cell's other commands, except a jump, which the word cell makes after it.
  const inserts = raw.commands.includes("Action.InsertText");
  const jumps = raw.commands.includes("Jump.To");
  if (inserts || jumps) {
    const noGrid = jumps && !grid.gridNames.has(raw.jumpTo) ? `Jump.To "${raw.jumpTo}" names no grid` : "";
    if (!inserts && noGrid) {
      return { skipped: noGrid };
    }
    const { copy, warning, ...shown } = symbolOrPicture(raw, grid);
    const type = inserts ? "ActionCodeCell" : "ActionBranchToPaletteCell";
    const branchTo = jumps && !noGrid ? { branchTo: raw.jumpTo } : {};
    // The cell's own colour, or else its style's. A style Grid 3 has built in is not in styles.xml.
    const colour = raw.backColour || grid.styles.get(raw.basedOnStyle);
    const backgroundColor = colour ? { backgroundColor: colour } : {};
    return {
      id,
      cell: { type, options: { label, ...shown, ...branchTo, ...backgroundColor, ...layout } },
      copy,
      warning: [warning, noGrid].filter(Boolean).join("; ") || undefined
    };
  }

  const type = COMMAND_CELLS[raw.commands.find(command => command in COMMAND_CELLS)];
  if (!type) {
    return { skipped: `unsupported: ${raw.commands.join(" + ") || "no command"}` };
  }
  const ariaControls = MESSAGE_COMMANDS.has(type) ? { ariaControls: "content-encoding-area" } : {};
  return { id, cell: { type, options: { label, composition: grid.icons[type], ...ariaControls, ...layout } } };
}

function writeJson (file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

/**
 * Write the palette set for a grid set into `setDir`, replacing whatever is there.
 * @param {string} gridsetDir - The unzipped grid set.
 * @param {Object} mapping - The mapping file's contents: picture keys to mapping strings.
 * @param {string} setDir - The palette set folder to write.
 * @returns {string[]} - The report: one line per skipped cell or missing picture.
 * @throws when two grids have the same file slug, or the start grid is missing.
 */
export function importGridset (gridsetDir, mapping, setDir) {
  const settings = fs.readFileSync(path.join(gridsetDir, "Settings0", "settings.xml"), "utf8");
  const startPalette = element(settings, "StartGrid").normalize("NFC");
  const language = element(settings, "Language") === "sv-SE" ? "sv" : "en";

  // macOS can unzip accented folder names decomposed, so grid names are NFC from here on.
  const gridsDir = path.join(gridsetDir, "Grids");
  const grids = fs.readdirSync(gridsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const name = entry.name.normalize("NFC");
      return { name, slug: slugify(name), dir: path.join(gridsDir, entry.name) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const slugs = new Set();
  for (const { name, slug } of grids) {
    if (!slug || slugs.has(slug)) {
      throw new Error(`Grid "${name}" needs a file name of its own, not "${slug}".`);
    }
    slugs.add(slug);
  }
  const gridNames = new Set(grids.map(grid => grid.name));
  if (!gridNames.has(startPalette)) {
    throw new Error(`The start grid "${startPalette}" is not in ${gridsDir}.`);
  }

  const nfcMapping = Object.fromEntries(Object.entries(mapping).map(([key, value]) => [key.normalize("NFC"), value]));
  const icons = {};
  for (const file of ["input_area.json", "command_bar.json"]) {
    const palette = JSON.parse(fs.readFileSync(path.join(STANDARD_PALETTES, file), "utf8"));
    for (const { type, options } of Object.values(palette.cells)) {
      icons[type] ??= options.composition;
    }
  }

  // Each named style's background colour, by style name.
  const stylesXml = fs.readFileSync(path.join(gridsetDir, "Settings0", "Styles", "styles.xml"), "utf8");
  const styles = new Map([...stylesXml.matchAll(/<Style Key="([^"]*)">([\s\S]*?)<\/Style>/g)]
    .map(([, name, body]) => [xmlText(name), element(body, "BackColour")]));

  fs.rmSync(setDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(setDir, "palettes"), { recursive: true });
  const report = [];
  const palettes = {};
  for (const grid of grids) {
    const cells = {};
    for (const raw of readCells(fs.readFileSync(path.join(grid.dir, "grid.xml"), "utf8"))) {
      const result = convertCell(raw, { ...grid, mapping: nfcMapping, gridNames, icons, styles });
      const where = `${grid.name} (${raw.x}, ${raw.y})`;
      if (!result) {
        continue;
      }
      if (result.skipped) {
        report.push(`${where}: skipped, ${result.skipped}`);
        continue;
      }
      if (result.warning) {
        report.push(`${where}: ${result.warning}`);
      }
      if (result.copy) {
        const pictures = path.join(setDir, "pictures", grid.slug);
        fs.mkdirSync(pictures, { recursive: true });
        fs.copyFileSync(path.join(grid.dir, result.copy), path.join(pictures, result.copy));
      }
      cells[result.id] = result.cell;
    }
    palettes[grid.name] = `palettes/${grid.slug}.json`;
    writeJson(path.join(setDir, palettes[grid.name]), { name: grid.name, language, cells });
  }
  writeJson(path.join(setDir, "palette_set.json"), { formatVersion: 1, startPalette, palettes });
  return report;
}

if (import.meta.main) {
  const [gridsetDir, mappingFile, setName] = process.argv.slice(2);
  if (!gridsetDir || !mappingFile || !SET_NAME.test(setName ?? "")) {
    console.error("Usage: node scripts/import_grid3.js <grid set folder> <mapping file> <set name>");
    console.error("The set name may hold only letters, digits, _ and -.");
    process.exit(1);
  }
  if (setName === "standardBlissChart") {
    console.error("standardBlissChart is the shipped set; choose another set name.");
    process.exit(1);
  }
  for (const missing of [gridsetDir, mappingFile].filter(file => !fs.existsSync(file))) {
    console.error(`Not found: ${missing}`);
    process.exit(1);
  }
  const mapping = JSON.parse(fs.readFileSync(mappingFile, "utf8"));
  const setDir = path.join(root, "public", "palette-sets", setName);
  const report = importGridset(gridsetDir, mapping, setDir);
  report.forEach(line => console.log(line));
  console.log(`Wrote ${path.relative(root, setDir)}, with ${report.length} problems listed above.`);
  console.log(`Open http://localhost:3000/?set=${setName}`);
}
