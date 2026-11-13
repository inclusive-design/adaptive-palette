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
 * node scripts/import_grid3_layout.js <grid set folder> <mapping file> <set name>
 *
 * Converts an unzipped Grid 3 grid set into the palette set `public/palette-sets/<set name>/`,
 * replacing any earlier import. Each grid becomes a whole screen laid out as in Grid 3, with its own
 * message area and command buttons. `import_grid3_vocabulary.js` imports the vocabulary only. The
 * mapping file names the Bliss symbols each picture shows, such as
 * `{ "Grids/Person/0-1-0-text-0.jpg": "B513" }`. See docs/devDoc/Grid3Mapping.md.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The standard chart's command cells give their symbols to the imported command cells.
const STANDARD_PALETTES = path.join(root, "public", "palette-sets", "standardBlissChart", "palettes");

// The rule for a set name. A copy of `PALETTE_SET_NAME` in `src/client/core/PaletteStore.ts`, which
// the scripts can't import; `package_desktop.js` imports this one.
export const SET_NAME = /^[A-Za-z0-9_-]+$/;

const ENTITIES = { lt: "<", gt: ">", quot: "\"", apos: "'", amp: "&" };

/**
 * The text an XML value holds, with CDATA sections unwrapped and entities decoded: the five
 * named ones and numeric references such as `&#229;` or `&#xA;`.
 * @param {string} raw - The value between an element's tags.
 * @returns {string}
 */
export function xmlText (raw) {
  return raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>|&(lt|gt|quot|apos|amp);|&#(x[0-9a-fA-F]+|\d+);/g,
    (match, cdata, entity, code) => cdata ?? ENTITIES[entity] ??
      String.fromCodePoint(code.startsWith("x") ? parseInt(code.slice(1), 16) : Number(code)));
}

/**
 * The trimmed text of the first `<name>` element in `xml`.
 * @param {string} xml
 * @param {string} name - An element name with no attributes on its tag, such as "Caption".
 * @returns {string} - "" when there is no such element.
 */
export function element (xml, name) {
  const match = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? xmlText(match[1]).trim() : "";
}

// Grid 3 commands that map to one of our command cells.
export const COMMAND_CELLS = {
  "Jump.Back": "CommandGoBackCell",
  "Jump.Home": "CommandGoToRootCell",
  "Action.Speak": "ActionSpeakCell",
  "Action.DeleteWord": "CommandDelLastEncoding",
  "Action.Clear": "CommandClearEncoding"
};

// The file types browsers show, which `launcher/serve.cjs` serves.
const PICTURE_FILE = /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i;

// The id of the message area, which is also what the message commands name with `ariaControls`.
const MESSAGE_AREA_ID = "content-encoding-area";

// The command cells that speak or change the message, so they name it with `ariaControls`.
const MESSAGE_COMMANDS = new Set(["ActionSpeakCell", "CommandDelLastEncoding", "CommandClearEncoding"]);

// The comment `clean_grid3.js` writes in a grid it removed for privacy.
export const REMOVED_MARKER = "<!-- adaptive-palette: removed for privacy -->";

// A `<Cell>` in a `grid.xml`: its attributes, and its body unless it is self-closing.
export const CELL = /<Cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/Cell>)/g;

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
 * The text of Grid 3 rich text, as in `Action.InsertText` or a word list item: its `<r>` runs, with a space
 * between paragraphs, whitespace collapsed.
 * @param {string} xml - The rich text: `<p>`, `<s>` and `<r>` elements, maybe wrapped in `<d>`.
 * @returns {string}
 */
function richText (xml) {
  return xml.split("</p>")
    .map(paragraph => [...paragraph.matchAll(/<r>([\s\S]*?)<\/r>/g)].map(([, run]) => xmlText(run)).join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The cells of a `grid.xml`, with only the fields the import reads. Grid 3 writes this file by
 * machine and never nests `<Cell>`, so regular expressions are enough.
 * @param {string} xml - The contents of a `grid.xml`.
 * @returns {Object[]} - One `{ x, y, columnSpan, rowSpan, contentType, contentSubType, commands, jumpTo, caption,
 *                       image, insertedText, basedOnStyle, backColour, fontColour }` per cell. `jumpTo` is
 *                       NFC, to match grid names. `backColour` and `fontColour` are the cell's own colours,
 *                       "" when it has none.
 */
export function readCells (xml) {
  return [...xml.matchAll(CELL)].map(([, attributeText, body = ""]) => {
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
      contentSubType: element(body, "ContentSubType"),
      commands: [...body.matchAll(/<Command ID="([^"]+)"/g)].map(([, id]) => id),
      jumpTo: xmlText(jumpTo).trim().normalize("NFC"),
      caption: element(body, "Caption"),
      image: element(body, "Image"),
      insertedText: richText(insertText),
      basedOnStyle: element(body, "BasedOnStyle"),
      backColour: element(body, "BackColour"),
      fontColour: element(body, "FontColour")
    };
  });
}

/**
 * The items of a grid's word list, in order. Only the `<WordList>` after `</Cells>` is the grid's: one inside
 * a cell is the parameter of a `Prediction.ChangeWordList`, which is not imported.
 * @param {string} xml - The contents of a `grid.xml`.
 * @returns {Object[]} - One `{ text, image }` per item. `image` is "" when the item has no picture.
 */
export function readWordList (xml) {
  const list = xml.slice(Math.max(0, xml.lastIndexOf("</Cells>")))
    .match(/<WordList>([\s\S]*?)<\/WordList>/)?.[1] ?? "";
  return [...list.matchAll(/<WordListItem>([\s\S]*?)<\/WordListItem>/g)].map(([, item]) => ({
    text: richText(item.match(/<Text>([\s\S]*?)<\/Text>/)?.[1] ?? ""),
    image: element(item, "Image")
  }));
}

/**
 * Write a grid's word list items into its word list cells, so that each filled cell is an ordinary insert cell.
 * Grid 3 fills the cells in reading order: by Y, then X. Item i goes in the i-th, counting from 0. Cells past
 * the last item stay blank.
 * @param {Object[]} raws - The grid's cells from `readCells()`. The word list cells are changed in place, and
 *                          an embedded picture is named `pictureFile`, as Grid 3 names it: `wordlist-{i}{Image}`.
 * @param {Object[]} items - The grid's items from `readWordList()`.
 * @returns {number} - The number of word list cells.
 */
export function fillWordList (raws, items) {
  const slots = raws
    .filter(raw => raw.contentType === "AutoContent" && raw.contentSubType === "WordList")
    .sort((a, b) => a.y - b.y || a.x - b.x);
  slots.slice(0, items.length).forEach((slot, i) => {
    const { text, image } = items[i];
    Object.assign(slot, { insertedText: text, image, commands: ["Action.InsertText"] });
    if (image && !image.startsWith("[")) {
      slot.pictureFile = `wordlist-${i}${image}`;
    }
  });
  return slots.length;
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
  // A word list item's picture is named by its item, not by the cell's position. See `fillWordList()`.
  const file = raw.pictureFile ?? `${raw.x}-${raw.y}${raw.image}`;
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
  if (!PICTURE_FILE.test(file)) {
    return { warning: `picture ${file} is not a type browsers show` };
  }
  return { picture: `../pictures/${grid.slug}/${file}`, copy: file };
}

/**
 * Convert one cell read by `readCells()` to a palette cell.
 * @param {Object} raw - A cell from `readCells()`.
 * @param {Object} grid - `{ name, slug, dir, hasWorkspace, mapping, gridNames, stubs, icons, styles }`: the
 *                        grid's NFC name, its file slug and its folder; whether it has a message area;
 *                        the mapping, with NFC keys; every grid's name; the names of the grids removed for
 *                        privacy; the standard chart's command cell compositions, by cell type; and a Map of
 *                        each named style's `{ backColour, fontColour }`.
 * @returns {Object|null} - `null` for an empty slot, `{ skipped }` with the reason for a cell that
 *                          cannot be imported, or `{ id, cell, copy, warning }`. `copy` names a picture
 *                          file to copy, and `warning` is a problem to report.
 */
export function convertCell (raw, grid) {
  const layout = { rowStart: raw.y + 1, rowSpan: raw.rowSpan, columnStart: raw.x + 1, columnSpan: raw.columnSpan };
  if (raw.contentType === "Workspace") {
    return { id: MESSAGE_AREA_ID, cell: { type: "ContentEncoding", options: layout } };
  }
  const id = `cell-${raw.x}-${raw.y}`;
  const label = raw.caption || raw.insertedText;
  // The cell's own colours, or else its style's. A style Grid 3 has built in is not in styles.xml.
  const style = grid.styles.get(raw.basedOnStyle);
  const back = raw.backColour || style?.backColour;
  const font = raw.fontColour || style?.fontColour;
  const colours = { ...(back && { backgroundColor: back }), ...(font && { textColor: font }) };
  // A cell that led to a grid removed for privacy shows its label and the notice, which
  // `clean_grid3.js` wrote in its caption.
  if (grid.stubs.has(raw.jumpTo)) {
    return { id, cell: { type: "ContentRemoved", options: { label, ...colours, ...layout } } };
  }
  // Grid 3 leaves an insert with no text in some blank cells.
  const onlyEmptyInserts = !label && !raw.image && raw.commands.every(command => command === "Action.InsertText");
  if ((raw.commands.length === 0 && !raw.caption) || onlyEmptyInserts) {
    return null;
  }

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
    return {
      id,
      cell: { type, options: { label, ...shown, ...branchTo, ...colours, ...layout } },
      copy,
      warning: [warning, noGrid].filter(Boolean).join("; ") || undefined
    };
  }

  // A rest cell is where a dwell user leaves the pointer, so it does nothing when pressed. Its picture is
  // a Grid 3 icon, which is not in the export.
  if (raw.commands.some(command => command.startsWith("Settings.Rest"))) {
    return { id, cell: { type: "ContentLabel", options: { label, ...colours, ...layout } } };
  }

  const type = COMMAND_CELLS[raw.commands.find(command => command in COMMAND_CELLS)];
  if (!type) {
    return { skipped: `unsupported: ${raw.commands.join(" + ") || "no command"}` };
  }
  const ariaControls = MESSAGE_COMMANDS.has(type) && grid.hasWorkspace ? { ariaControls: MESSAGE_AREA_ID } : {};
  return { id, cell: { type, options: { label, composition: grid.icons[type], ...ariaControls, ...layout } } };
}

/**
 * A grid's size, from its column and row definitions.
 * @param {string} xml - The grid's `grid.xml`.
 * @returns {number[]} - `[columns, rows]`. 0 when the grid defines none.
 */
export function gridSize (xml) {
  return [xml.match(/<ColumnDefinition\b/g)?.length ?? 0, xml.match(/<RowDefinition\b/g)?.length ?? 0];
}

/**
 * Keep a palette the size of its grid. `Palette.ts` sizes a palette from its cells, so when no cell
 * reaches the last column or row, an empty `ContentLabel` is put in the bottom-right slot.
 * That slot is free, since a cell in it would reach both.
 * @param {Object} cells - The palette's cells, by id. Changed in place.
 * @param {number} columns - The palette's number of columns.
 * @param {number} rows - The palette's number of rows.
 */
export function fillGridSize (cells, columns, rows) {
  const options = Object.values(cells).map(cell => cell.options);
  const right = Math.max(0, ...options.map(o => o.columnStart + o.columnSpan - 1));
  const bottom = Math.max(0, ...options.map(o => o.rowStart + o.rowSpan - 1));
  if (columns > 0 && rows > 0 && (right < columns || bottom < rows)) {
    cells["grid-size"] = {
      type: "ContentLabel", options: { label: "", rowStart: rows, rowSpan: 1, columnStart: columns, columnSpan: 1 }
    };
  }
}

export function writeJson (file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

/**
 * Copy a picture from a grid's folder into the set being written.
 * @param {string} outDir - The set being written.
 * @param {Object} grid - A grid from `readGridset()`.
 * @param {string} file - The picture's file name in the grid's folder.
 */
export function copyPicture (outDir, grid, file) {
  const pictures = path.join(outDir, "pictures", grid.slug);
  fs.mkdirSync(pictures, { recursive: true });
  fs.copyFileSync(path.join(grid.dir, file), path.join(pictures, file));
}

/**
 * Read an unzipped grid set and check it.
 * @param {string} gridsetDir - The unzipped grid set.
 * @param {Object} mapping - The mapping file's contents: picture keys to mapping strings.
 * @returns {Object} - `{ startPalette, language, grids, context }`. `grids` are the grids not removed for privacy,
 *                     sorted by name, each `{ name, slug, dir, xml, raws, hasWorkspace, wordListProblem }`: `raws` are
 *                     its cells from `readCells()` with its word list filled in, and `wordListProblem` is the report
 *                     line for word list items with no cell, or "". `context` is what `convertCell()` needs besides
 *                     the grid: `{ mapping, gridNames, stubs, icons, styles }`.
 * @throws when two grids have the same file slug, the start grid is missing, or a file cannot be read.
 */
export function readGridset (gridsetDir, mapping) {
  const settings = fs.readFileSync(path.join(gridsetDir, "Settings0", "settings.xml"), "utf8");
  const startPalette = element(settings, "StartGrid").normalize("NFC");
  const language = element(settings, "Language").startsWith("sv") ? "sv" : "en";

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

  // The grids `clean_grid3.js` removed for privacy. They get no palette.
  const xmls = new Map(grids.map(grid => [grid.name, fs.readFileSync(path.join(grid.dir, "grid.xml"), "utf8")]));
  const stubs = new Set(grids.filter(grid => xmls.get(grid.name).includes(REMOVED_MARKER)).map(grid => grid.name));

  const nfcMapping = Object.fromEntries(Object.entries(mapping).map(([key, value]) => [key.normalize("NFC"), value]));
  const icons = {};
  for (const file of ["input_area.json", "command_bar.json"]) {
    const palette = JSON.parse(fs.readFileSync(path.join(STANDARD_PALETTES, file), "utf8"));
    for (const { type, options } of Object.values(palette.cells)) {
      icons[type] ??= options.composition;
    }
  }

  // Each named style's colours, by style name. A grid set with no styles.xml has none.
  const stylesFile = path.join(gridsetDir, "Settings0", "Styles", "styles.xml");
  const stylesXml = fs.existsSync(stylesFile) ? fs.readFileSync(stylesFile, "utf8") : "";
  const styles = new Map([...stylesXml.matchAll(/<Style Key="([^"]*)">([\s\S]*?)<\/Style>/g)]
    .map(([, name, body]) => [
      xmlText(name), { backColour: element(body, "BackColour"), fontColour: element(body, "FontColour") }
    ]));

  const read = grids.filter(grid => !stubs.has(grid.name)).map(grid => {
    const xml = xmls.get(grid.name);
    const raws = readCells(xml);
    const items = readWordList(xml);
    const slots = fillWordList(raws, items);
    let wordListProblem = "";
    if (items.length > slots) {
      const left = items.length - slots;
      const which = left === 1 ? `item ${slots}` : `items ${slots}–${items.length - 1}`;
      const reason = slots === 0 ? "no word list cells" : "no free cell";
      wordListProblem = `${grid.name}: ${left} word list item${left === 1 ? "" : "s"} skipped (${which}), ${reason}`;
    }
    return { ...grid, xml, raws, hasWorkspace: raws.some(raw => raw.contentType === "Workspace"), wordListProblem };
  });
  return {
    startPalette, language, grids: read, context: { mapping: nfcMapping, gridNames, stubs, icons, styles }
  };
}

/**
 * Write a palette set into `setDir`, replacing whatever is there. It is written beside it first, so a
 * run that fails leaves the earlier set as it was.
 * @param {string} setDir - The palette set folder to write.
 * @param {function(string): void} write - Writes the set into the folder it is given, which has an
 *                                         empty `palettes/` folder.
 */
export function writeSet (setDir, write) {
  const outDir = `${setDir}.partial`;
  fs.rmSync(outDir, { recursive: true, force: true });
  try {
    fs.mkdirSync(path.join(outDir, "palettes"), { recursive: true });
    write(outDir);
    // The earlier set is moved aside, not deleted, so it can be put back if the rename fails,
    // as it can on Windows while another program has the folder open.
    const oldDir = `${setDir}.old`;
    fs.rmSync(oldDir, { recursive: true, force: true });
    if (fs.existsSync(setDir)) {
      fs.renameSync(setDir, oldDir);
    }
    try {
      fs.renameSync(outDir, setDir);
    } catch (error) {
      if (fs.existsSync(oldDir)) {
        fs.renameSync(oldDir, setDir);
      }
      throw error;
    }
    fs.rmSync(oldDir, { recursive: true, force: true });
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}

/**
 * Write the palette set for a grid set into `setDir`, each grid as a whole screen.
 * @param {string} gridsetDir - The unzipped grid set.
 * @param {Object} mapping - The mapping file's contents: picture keys to mapping strings.
 * @param {string} setDir - The palette set folder to write.
 * @returns {string[]} - The report: one line per skipped cell or missing picture, and one per grid whose word
 *                       list has items with no cell.
 * @throws when two grids have the same file slug, the start grid is missing, or a file cannot be read.
 */
export function importGridset (gridsetDir, mapping, setDir) {
  const { startPalette, language, grids, context } = readGridset(gridsetDir, mapping);
  const report = [];
  writeSet(setDir, outDir => {
    const palettes = {};
    for (const grid of grids) {
      if (grid.wordListProblem) {
        report.push(grid.wordListProblem);
      }
      const cells = {};
      for (const raw of grid.raws) {
        const result = convertCell(raw, { ...grid, ...context });
        const where = `${grid.name} (${raw.x}, ${raw.y})`;
        if (!result) {
          continue;
        }
        if (result.skipped) {
          report.push(`${where}: skipped, ${result.skipped}`);
          continue;
        }
        if (result.id in cells) {
          report.push(`${where}: skipped, a second Workspace; a palette has one message area`);
          continue;
        }
        if (result.warning) {
          report.push(`${where}: ${result.warning}`);
        }
        if (result.copy) {
          copyPicture(outDir, grid, result.copy);
        }
        cells[result.id] = result.cell;
      }
      fillGridSize(cells, ...gridSize(grid.xml));
      palettes[grid.name] = `palettes/${grid.slug}.json`;
      writeJson(path.join(outDir, palettes[grid.name]), { name: grid.name, language, cells });
    }
    writeJson(path.join(outDir, "palette_set.json"), { formatVersion: 1, startPalette, palettes });
  });
  return report;
}

/**
 * The command line both import scripts share: check the arguments, run the import, print the report.
 * @param {string} script - The script's file name, for the usage message.
 * @param {function(string, Object, string): string[]} importSet - Writes the set and returns the report.
 */
export function runImport (script, importSet) {
  const [gridsetDir, mappingFile, setName] = process.argv.slice(2);
  if (!gridsetDir || !mappingFile || !SET_NAME.test(setName ?? "")) {
    console.error(`Usage: node scripts/${script} <grid set folder> <mapping file> <set name>`);
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
  const report = importSet(gridsetDir, mapping, setDir);
  report.forEach(line => console.log(line));
  console.log(`Wrote ${path.relative(root, setDir)}, with ${report.length} problems listed above.`);
  console.log(`Open http://localhost:3000/?set=${setName}`);
}

if (import.meta.main) {
  runImport("import_grid3_layout.js", importGridset);
}
