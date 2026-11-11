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
 * node scripts/clean_grid3.js <grid set folder> <output folder> <list file>
 *
 * Writes a copy of an unzipped Grid 3 grid set in which the grids the list file names are
 * emptied, so that the copy can be shared without their personal data. The list file names one
 * grid per line. See docs/devDoc/Grid3Mapping.md, "Removing personal grids".
 */

import fs from "node:fs";
import path from "node:path";
import { CELL, COMMAND_CELLS, REMOVED_MARKER, element, readCells, xmlText } from "./import_grid3.js";

// The captions of a removed grid's notice and Back cells, by language.
const CAPTIONS = {
  sv: { notice: "Borttaget av integritetsskäl", back: "Tillbaka" },
  en: { notice: "Removed for privacy", back: "Back" }
};

/**
 * Text as XML element content. A line break becomes `&#xA;`, as Grid 3 writes it.
 * @param {string} text
 * @returns {string}
 */
function escapeXml (text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r\n?|\n/g, "&#xA;");
}

/**
 * The `grid.xml` of a removed grid: a notice above a Back cell, and the marker `import_grid3.js`
 * looks for. Laid out as Grid 3 writes a grid: CRLF line endings and no final newline.
 * @param {string} guid - The removed grid's `GridGuid`.
 * @param {Object} captions - The notice and Back captions, from `CAPTIONS`.
 * @returns {string}
 */
function stubXml (guid, captions) {
  return `<Grid xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  ${REMOVED_MARKER}
  <GridGuid>${escapeXml(guid)}</GridGuid>
  <ColumnDefinitions>
    <ColumnDefinition />
  </ColumnDefinitions>
  <RowDefinitions>
    <RowDefinition />
    <RowDefinition />
  </RowDefinitions>
  <AutoContentCommands />
  <Cells>
    <Cell>
      <Content>
        <CaptionAndImage>
          <Caption>${escapeXml(captions.notice)}</Caption>
        </CaptionAndImage>
      </Content>
    </Cell>
    <Cell Y="1">
      <Content>
        <Commands>
          <Command ID="Jump.Back" />
        </Commands>
        <CaptionAndImage>
          <Caption>${escapeXml(captions.back)}</Caption>
          <Image>[GRID3X]jump_back.wmf</Image>
        </CaptionAndImage>
      </Content>
    </Cell>
  </Cells>
  <ScanBlockAudioDescriptions />
  <WordList>
    <Items />
  </WordList>
</Grid>`.replace(/\r?\n/g, "\r\n");
}

/**
 * An entry cell, which jumps to a removed grid, changed to show its label above the notice. Its
 * picture and insert go; its jump and its other commands stay.
 * @param {string} block - The cell's XML.
 * @param {Object} raw - The same cell, from `readCells()`.
 * @param {string} notice
 * @returns {string}
 */
function entryCellXml (block, raw, notice) {
  const label = raw.caption || raw.insertedText;
  const caption = label ? `${label}\n${notice}` : notice;
  const captionAndImage = `<CaptionAndImage><Caption>${escapeXml(caption)}</Caption></CaptionAndImage>`;
  const xml = block.replace(/\s*<Command ID="Action\.InsertText"(?:\s*\/>|>[\s\S]*?<\/Command>)/g, "");
  const existing = /<CaptionAndImage\s*\/>|<CaptionAndImage>[\s\S]*?<\/CaptionAndImage>/;
  // Functions as replacements, so that a `$` in a caption is not read as a pattern. A cell with
  // no caption gets one after its commands, where Grid 3 writes it.
  return existing.test(xml)
    ? xml.replace(existing, () => captionAndImage)
    : xml.replace("</Commands>", () => `</Commands>${captionAndImage}`);
}

/**
 * The grids reachable from `start` by following jumps.
 * @param {string} start
 * @param {Map<string, string[]>} jumps - The grids each grid jumps to, by grid name.
 * @returns {Set<string>}
 */
function reachable (start, jumps) {
  const reached = new Set([start]);
  // A Set's loop also visits what is added to it during the loop.
  for (const name of reached) {
    for (const next of jumps.get(name) ?? []) {
      reached.add(next);
    }
  }
  return reached;
}

// A command cell, such as Back or Clear, even with another command such as `Speech.ReadCell`. Its
// caption names what it does, not a person, and it is in most grids, so the leak check leaves it
// out. A cell that also inserts text or jumps to a grid is not one.
const commandCell = cell => cell.commands.some(command => command in COMMAND_CELLS) &&
  !cell.commands.includes("Action.InsertText") && !cell.commands.includes("Jump.To");

// Text as the leak check compares it: NFC, lower case, each run of white space one space.
const searchable = text => text.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Where the copy still has text from a removed grid, in any XML file but the removed grids' own.
 * @param {string} dir - The copy.
 * @param {string[]} removed - The removed grids' names, NFC.
 * @param {Map<string, string>} removedTexts - The removed grids' captions and inserted texts, keyed by
 *                                             `searchable()`.
 * @returns {string[]} - One `Leak check, <file>: "<text>"` line for each text found in a file, by file.
 *                       `<file>` is the path in the copy, with `/` separators and NFC.
 */
function leakCheck (dir, removed, removedTexts) {
  const files = fs.readdirSync(dir, { recursive: true })
    .map(file => [file.split(path.sep).join("/").normalize("NFC"), path.join(dir, file)])
    .filter(([shown]) => /\.xml$/i.test(shown) && !removed.some(name => shown.startsWith(`Grids/${name}/`)))
    .sort(([a], [b]) => a.localeCompare(b));
  const lines = [];
  for (const [shown, file] of files) {
    const xml = fs.readFileSync(file, "utf8");
    // Text only, so that a tag such as `<WordList>` gives no hit. Each tag becomes a space, while a
    // CDATA section stays whole for `xmlText()` to unwrap. Each cell's inserted text as well, since
    // Grid 3 splits an insert's words over runs.
    const content = xmlText(xml.replace(/(<!\[CDATA\[[\s\S]*?\]\]>)|<[^>]*>/g, (tag, cdata) => cdata ?? " "));
    const haystack = searchable([content, ...readCells(xml).map(cell => cell.insertedText)].join("\n"));
    for (const [key, text] of removedTexts) {
      if (haystack.includes(key)) {
        lines.push(`Leak check, ${shown}: "${text}"`);
      }
    }
  }
  return lines;
}

/**
 * Write a copy of a grid set with the listed grids removed. See the usage at the top.
 * @param {string} gridsetDir - The unzipped grid set. It is not changed.
 * @param {string} outDir - The folder to write the copy to. It must not exist.
 * @param {string} list - The list file's contents: one grid name per line.
 * @returns {string[]} - The report.
 * @throws before writing anything when the output folder exists or is inside the grid set, a
 *         `<output>.partial` folder from a stopped run exists, the list names no grids or a name that
 *         is not a grid, the list names the start grid, or the grid set holds a symbolic link. A later
 *         failure deletes the copy, then throws.
 */
export function cleanGridset (gridsetDir, outDir, list) {
  const listed = new Set(list.split(/\r?\n/).map(line => line.trim().normalize("NFC")).filter(Boolean));
  const settings = fs.readFileSync(path.join(gridsetDir, "Settings0", "settings.xml"), "utf8");
  const startGrid = element(settings, "StartGrid").normalize("NFC");
  const captions = CAPTIONS[element(settings, "Language").startsWith("sv") ? "sv" : "en"];

  // Each grid's NFC name, its folder's name on disk, which macOS can unzip decomposed, and its grid.xml.
  const gridsDir = path.join(gridsetDir, "Grids");
  const grids = fs.readdirSync(gridsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => ({
      name: entry.name.normalize("NFC"),
      folder: entry.name,
      xml: fs.readFileSync(path.join(gridsDir, entry.name, "grid.xml"), "utf8")
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // The copy is made under this name and renamed when done, so that a run stopped part way leaves
  // nothing that could pass for a clean copy.
  const partial = `${path.resolve(outDir)}.partial`;

  if (fs.existsSync(outDir)) {
    throw new Error(`${outDir} exists. Name a folder that doesn't.`);
  }
  if (path.resolve(outDir).startsWith(path.resolve(gridsetDir) + path.sep)) {
    throw new Error(`${outDir} is inside the grid set. Name a folder outside it.`);
  }
  if (fs.existsSync(partial)) {
    // Never tell the user to delete the grid set, or a folder that holds it.
    const set = fs.realpathSync.native(gridsetDir);
    const part = fs.realpathSync.native(partial);
    throw new Error(set === part || set.startsWith(part + path.sep)
      ? `${outDir} can't be used: the copy is first written to ${partial}, which is or holds the grid set. ` +
        "Name another output folder."
      : `${partial} exists. A stopped run left it, and it may hold personal data. Delete it.`);
  }
  if (listed.size === 0) {
    throw new Error("The list names no grids.");
  }
  const unknown = [...listed].filter(name => !grids.some(grid => grid.name === name));
  if (unknown.length > 0) {
    throw new Error(`Not a grid in ${gridsDir}: ${unknown.join(", ")}`);
  }
  if (listed.has(startGrid)) {
    throw new Error(`"${startGrid}" is the start grid, which can't be removed.`);
  }
  // The copy would hold the same link, and a change made through it would reach the grid set.
  if (fs.readdirSync(gridsetDir, { recursive: true, withFileTypes: true }).some(entry => entry.isSymbolicLink())) {
    throw new Error(`${gridsetDir} holds a symbolic link. Remove it, since the copy would share it.`);
  }

  // Read from the grid set before it is copied: what each grid jumps to, and what the removed grids
  // say, to look for in the copy. Grid names stay, so they are not looked for.
  const jumps = new Map(grids.map(grid => [grid.name, readCells(grid.xml).map(cell => cell.jumpTo).filter(Boolean)]));
  const gridNames = new Set(grids.map(grid => searchable(grid.name)));
  const removedTexts = new Map(grids.filter(grid => listed.has(grid.name))
    .flatMap(grid => readCells(grid.xml).filter(cell => !commandCell(cell)).flatMap(cell => [cell.caption, cell.insertedText]))
    .map(text => [searchable(text), text])
    .filter(([key]) => key && !gridNames.has(key)));

  try {
    // Inside the `try`, so that a copy that fails part way is deleted too. `dereference`: when the
    // grid set is given as a link, copy the folder it leads to, not the link.
    fs.cpSync(gridsetDir, partial, { recursive: true, dereference: true });
    const problems = [];
    // The FileMap.xml paths of the files deleted from the copy, NFC: `Grids\<grid>\<file>`.
    const deleted = new Set();
    let entryCells = 0;
    for (const grid of grids) {
      const dir = path.join(partial, "Grids", grid.folder);
      if (listed.has(grid.name)) {
        for (const file of fs.readdirSync(dir)) {
          deleted.add(`Grids\\${grid.name}\\${file.normalize("NFC")}`);
          fs.rmSync(path.join(dir, file), { recursive: true });
        }
        fs.writeFileSync(path.join(dir, "grid.xml"), stubXml(element(grid.xml, "GridGuid"), captions), "utf8");
        continue;
      }
      const xml = grid.xml.replace(CELL, block => {
        const [raw] = readCells(block);
        if (!listed.has(raw.jumpTo)) {
          return block;
        }
        entryCells++;
        // A library picture, such as `[GRID3X]jump_back.wmf`, is not in the export.
        if (raw.image && !raw.image.startsWith("[")) {
          const file = `${raw.x}-${raw.y}${raw.image}`;
          const where = `${grid.name} (${raw.x}, ${raw.y})`;
          if (/[/\\]/.test(raw.image)) {
            problems.push(`${where}: picture name ${raw.image} not allowed, so it was not deleted`);
          } else {
            deleted.add(`Grids\\${grid.name}\\${file.normalize("NFC")}`);
            if (fs.existsSync(path.join(dir, file))) {
              fs.rmSync(path.join(dir, file));
            } else {
              problems.push(`${where}: picture ${file} not found`);
            }
          }
        }
        // The cell's other pictures, such as its insert's, which no cell uses once the insert goes.
        // `X-Y-` matches neither another cell's files nor the cell's own `X-Y.jpg`.
        for (const file of fs.readdirSync(dir).filter(file => file.normalize("NFC").startsWith(`${raw.x}-${raw.y}-`))) {
          deleted.add(`Grids\\${grid.name}\\${file.normalize("NFC")}`);
          fs.rmSync(path.join(dir, file));
        }
        return entryCellXml(block, raw, captions.notice);
      });
      if (xml !== grid.xml) {
        fs.writeFileSync(path.join(dir, "grid.xml"), xml, "utf8");
      }
    }

    // The `<File>` line of each deleted file goes. The rest of FileMap.xml stays as it was, CRLF included.
    const fileMapFile = path.join(partial, "FileMap.xml");
    const fileMap = fs.readFileSync(fileMapFile, "utf8");
    fs.writeFileSync(fileMapFile, fileMap.replace(/(?:\r?\n[ \t]*)?<File>([^<]*)<\/File>/g,
      (line, file) => deleted.has(xmlText(file).normalize("NFC")) ? "" : line), "utf8");

    const reachedAfter = reachable(startGrid, new Map([...jumps].filter(([name]) => !listed.has(name))));
    const unreachable = [...reachable(startGrid, jumps)]
      // `jumps` has every grid. A jump to a name that is no grid is a broken link, not a grid.
      .filter(name => jumps.has(name) && !reachedAfter.has(name) && !listed.has(name))
      .map(name => `${name}: can no longer be reached from the start grid`);
    const report = [
      `Grids removed: ${listed.size}. Entry cells changed: ${entryCells}.`,
      ...problems,
      ...unreachable,
      ...leakCheck(partial, [...listed], removedTexts)
    ];
    fs.renameSync(partial, path.resolve(outDir));
    return report;
  } catch (error) {
    // A half-written copy could be taken for a clean one.
    fs.rmSync(partial, { recursive: true, force: true });
    throw error;
  }
}

if (import.meta.main) {
  const [gridsetDir, outDir, listFile] = process.argv.slice(2);
  if (!gridsetDir || !outDir || !listFile) {
    console.error("Usage: node scripts/clean_grid3.js <grid set folder> <output folder> <list file>");
    process.exit(1);
  }
  for (const missing of [gridsetDir, listFile].filter(file => !fs.existsSync(file))) {
    console.error(`Not found: ${missing}`);
    process.exit(1);
  }
  try {
    const report = cleanGridset(gridsetDir, outDir, fs.readFileSync(listFile, "utf8"));
    report.forEach(line => console.log(line));
    console.log(`Wrote ${outDir}. Before sharing it, review every line above and the kept grids. Check the ` +
      "pictures, including Settings0/thumbnail.bmp, and the description in Settings0/settings.xml by hand.");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
