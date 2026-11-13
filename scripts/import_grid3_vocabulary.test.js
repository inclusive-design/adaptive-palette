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
 * Tests the vocabulary import on small grid sets written to a temp folder.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { STANDARD_PALETTES, importVocabulary, vocabularyGrids } from "./import_grid3_vocabulary.js";

// A Grid 3 cell. `commands` is a list of [command id, grid to jump to].
function cellXml (x, y, caption, commands, extra = "") {
  const commandXml = commands.map(([id, grid]) => grid
    ? `<Command ID="${id}"><Parameter Key="grid">${grid}</Parameter></Command>`
    : `<Command ID="${id}" />`).join("");
  return `<Cell X="${x}" Y="${y}" ${extra}><Content><Commands>${commandXml}</Commands>
    <CaptionAndImage><Caption>${caption}</Caption></CaptionAndImage></Content></Cell>`;
}

function gridXml (columns, rows, cells) {
  return `<Grid><ColumnDefinitions>${"<ColumnDefinition />".repeat(columns)}</ColumnDefinitions>
    <RowDefinitions>${"<RowDefinition />".repeat(rows)}</RowDefinitions><Cells>${cells.join("")}</Cells></Grid>`;
}

const START = [
  "<Cell ColumnSpan=\"5\"><Content><ContentType>Workspace</ContentType></Content></Cell>",
  cellXml(0, 1, "jag", [["Action.InsertText"]]),
  cellXml(1, 1, "mat", [["Jump.To", "Mat"]]),
  cellXml(2, 1, "tillbaka", [["Jump.Back"]]),
  cellXml(3, 1, "video", [["Jump.To", "Video"]]),
  cellXml(4, 1, "kopiera", [["Action.Copy"]]),
  `<Cell X="0" Y="3"><Content><Commands><Command ID="Settings.RestPointer" /></Commands>
    <CaptionAndImage><Caption>vila</Caption><Image>[GRID3X]rest.wmf</Image></CaptionAndImage>
    <Style><BackColour>#FFFFFFFF</BackColour></Style></Content></Cell>`,
  cellXml(2, 3, "du", [["Action.InsertText"]]),
  cellXml(0, 4, "hem", [["Jump.Home"]]),
  cellXml(4, 4, "radera", [["Action.Clear"]])
];

describe("importVocabulary()", () => {
  let tmp;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "grid3-vocabulary-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));

  function writeGridset (grids) {
    const gridset = path.join(tmp, "gridset");
    fs.mkdirSync(path.join(gridset, "Settings0"), { recursive: true });
    fs.writeFileSync(path.join(gridset, "Settings0", "settings.xml"),
      "<GridSetSettings><StartGrid>Start</StartGrid><Language>sv-SE</Language></GridSetSettings>");
    for (const [name, xml] of Object.entries(grids)) {
      fs.mkdirSync(path.join(gridset, "Grids", name), { recursive: true });
      fs.writeFileSync(path.join(gridset, "Grids", name, "grid.xml"), xml);
    }
    return gridset;
  }

  const GRIDS = {
    Start: gridXml(5, 5, START),
    Mat: gridXml(2, 2, [cellXml(0, 0, "bröd", [["Action.InsertText"]]), cellXml(1, 1, "tillbaka", [["Jump.Back"]])]),
    Video: gridXml(2, 1, [cellXml(0, 0, "alt", [["ComputerControl.Keyboard"]]), cellXml(1, 0, "tillbaka", [["Jump.Back"]])])
  };
  const at = (columnStart, rowStart) => ({ columnStart, columnSpan: 1, rowStart, rowSpan: 1 });
  const header = columnSpan => ({
    type: "PaletteInclude", options: { palette: "Standard Header", rowStart: 1, rowSpan: 1, columnStart: 1, columnSpan }
  });

  test("keeps the words in their places under the Standard Header", () => {
    const setDir = path.join(tmp, "set");
    importVocabulary(writeGridset(GRIDS), {}, setDir);

    expect(readJson(path.join(setDir, "palettes", "start.json"))).toEqual({
      name: "Start",
      language: "sv",
      cells: {
        "standard-header": header(3),
        "cell-0-1": { type: "ActionCodeCell", options: { label: "jag", ...at(1, 2) } },
        "cell-1-1": { type: "ActionBranchToPaletteCell", options: { label: "mat", branchTo: "Mat", ...at(2, 2) } },
        "cell-0-3": { type: "ContentLabel", options: { label: "vila", backgroundColor: "#FFFFFFFF", ...at(1, 4) } },
        "cell-2-3": { type: "ActionCodeCell", options: { label: "du", ...at(3, 4) } }
      }
    });
    expect(readJson(path.join(setDir, "palettes", "mat.json")).cells).toEqual({
      "standard-header": header(2),
      "cell-0-0": { type: "ActionCodeCell", options: { label: "bröd", ...at(1, 2) } }
    });
  });

  test("lists the standard palettes the header needs, and no palette for a grid with no vocabulary", () => {
    const setDir = path.join(tmp, "set");
    importVocabulary(writeGridset(GRIDS), {}, setDir);

    expect(readJson(path.join(setDir, "palette_set.json"))).toEqual({
      formatVersion: 1,
      startPalette: "Start",
      palettes: { ...STANDARD_PALETTES, Mat: "palettes/mat.json", Start: "palettes/start.json" }
    });
    expect(fs.existsSync(path.join(setDir, "palettes", "video.json"))).toBe(false);
  });

  test("each standard palette it lists is in the standard chart", () => {
    const sets = path.join(import.meta.dirname, "..", "public", "palette-sets", "set");
    for (const file of Object.values(STANDARD_PALETTES)) {
      expect(fs.existsSync(path.join(sets, file)), file).toBe(true);
    }
  });

  test("reports what it left out", () => {
    const report = importVocabulary(writeGridset(GRIDS), {}, path.join(tmp, "set"));

    expect(report).toEqual([
      "Mat: command cells left out: 1, rows removed: 1, columns removed: 0",
      "Start (4, 1): skipped, unsupported: Action.Copy",
      "Start (3, 1): left out, \"Video\" has no palette",
      "Start: command cells left out: 5, rows removed: 2, columns removed: 2",
      "Video (0, 0): skipped, unsupported: ComputerControl.Keyboard",
      "Video: no vocabulary, so no palette"
    ]);
  });

  // The Start palette's cells when Start is the given grid.
  function startCells (start, grids = GRIDS) {
    const setDir = path.join(tmp, "set");
    const report = importVocabulary(writeGridset({ ...grids, Start: start }), {}, setDir);
    return { cells: readJson(path.join(setDir, "palettes", "start.json")).cells, report };
  }
  const insert = (x, y, text, extra) => cellXml(x, y, text, [["Action.InsertText"]], extra);

  test("an empty cell stays an empty slot, and a row of empty cells is kept", () => {
    const { cells } = startCells(gridXml(2, 3, [
      insert(0, 0, "jag"), cellXml(1, 0, "", []), cellXml(0, 1, "", []), cellXml(1, 1, "", []), insert(1, 2, "du")
    ]));
    expect(cells).toEqual({
      "standard-header": header(2),
      "cell-0-0": { type: "ActionCodeCell", options: { label: "jag", ...at(1, 2) } },
      "cell-1-2": { type: "ActionCodeCell", options: { label: "du", ...at(2, 4) } }
    });
  });

  test("a command cell in a kept row and column becomes an empty slot", () => {
    const { cells } = startCells(gridXml(2, 2, [insert(0, 0, "jag"), cellXml(1, 0, "tala", [["Action.Speak"]]), insert(1, 1, "du")]));
    expect(cells["cell-1-0"]).toBeUndefined();
    expect(cells["cell-1-1"].options).toMatchObject(at(2, 3));
  });

  test("a word keeps its span while a command-only row and column are removed", () => {
    const { cells, report } = startCells(gridXml(4, 3, [
      insert(0, 0, "stor", "RowSpan=\"2\""), cellXml(1, 0, "tala", [["Action.Speak"]]), insert(2, 0, "lång", "ColumnSpan=\"2\""),
      cellXml(1, 1, "tillbaka", [["Jump.Back"]]), insert(2, 1, "du"),
      cellXml(0, 2, "hem", [["Jump.Home"]]), cellXml(1, 2, "radera", [["Action.Clear"]]), cellXml(2, 2, "tillbaka", [["Jump.Back"]])
    ]));
    expect(cells).toEqual({
      "standard-header": header(3),
      "cell-0-0": { type: "ActionCodeCell", options: { label: "stor", ...at(1, 2), rowSpan: 2 } },
      "cell-2-0": { type: "ActionCodeCell", options: { label: "lång", ...at(2, 2), columnSpan: 2 } },
      "cell-2-1": { type: "ActionCodeCell", options: { label: "du", ...at(2, 3) } }
    });
    expect(report).toContain("Start: command cells left out: 5, rows removed: 1, columns removed: 1");
  });

  test("a caption with no commands becomes a ContentLabel with its colours, and keeps its row", () => {
    const { cells } = startCells(gridXml(2, 2, [
      `<Cell X="0" Y="0"><Content><CaptionAndImage><Caption>MAT</Caption></CaptionAndImage>
        <Style><BackColour>#FF0000FF</BackColour><FontColour>#FFFFFFFF</FontColour></Style></Content></Cell>`,
      cellXml(1, 0, "tala", [["Action.Speak"]]), insert(0, 1, "jag"), cellXml(1, 1, "hem", [["Jump.Home"]])
    ]));
    expect(cells["cell-0-0"]).toEqual({
      type: "ContentLabel", options: { label: "MAT", backgroundColor: "#FF0000FF", textColor: "#FFFFFFFF", ...at(1, 2) }
    });
    expect(cells["cell-0-1"].options).toMatchObject(at(1, 3));
  });

  test("judges columns only over the rows that are kept", () => {
    const { cells, report } = startCells(gridXml(3, 3, [
      insert(0, 0, "jag"), insert(2, 0, "du"), insert(0, 1, "vi"), insert(2, 1, "ni"), cellXml(1, 2, "hem", [["Jump.Home"]])
    ]));
    expect(cells).toEqual({
      "standard-header": header(3),
      "cell-0-0": { type: "ActionCodeCell", options: { label: "jag", ...at(1, 2) } },
      "cell-2-0": { type: "ActionCodeCell", options: { label: "du", ...at(3, 2) } },
      "cell-0-1": { type: "ActionCodeCell", options: { label: "vi", ...at(1, 3) } },
      "cell-2-1": { type: "ActionCodeCell", options: { label: "ni", ...at(3, 3) } }
    });
    expect(report).toContain("Start: command cells left out: 1, rows removed: 1, columns removed: 0");
  });

  test("keeps the grid's size when no cell reaches the last column or row", () => {
    const { cells } = startCells(gridXml(3, 3, [insert(0, 0, "jag")]));
    expect(cells["grid-size"]).toEqual({ type: "ContentLabel", options: { label: "", ...at(3, 4) } });
  });

  test("converts a word list cell", () => {
    const slot = "<Cell><Content><ContentType>AutoContent</ContentType><ContentSubType>WordList</ContentSubType></Content></Cell>";
    const start = gridXml(1, 1, [slot]).replace("</Grid>",
      "<WordList><Items><WordListItem><Text><p><s><r>ja</r></s></p></Text></WordListItem></Items></WordList></Grid>");
    expect(startCells(start).cells["cell-0-0"]).toEqual({ type: "ActionCodeCell", options: { label: "ja", ...at(1, 2) } });
  });

  test("an insert that jumps to a grid with no palette only inserts", () => {
    const grids = { ...GRIDS, Start: gridXml(5, 5, [...START, cellXml(1, 3, "ring", [["Action.InsertText"], ["Jump.To", "Video"]])]) };
    const setDir = path.join(tmp, "set");
    const report = importVocabulary(writeGridset(grids), {}, setDir);

    expect(readJson(path.join(setDir, "palettes", "start.json")).cells["cell-1-3"]).toEqual({
      type: "ActionCodeCell", options: { label: "ring", ...at(2, 4) }
    });
    expect(report).toContain("Start (1, 3): jump left out, \"Video\" has no palette");
  });

  test("lists a jump to a grid that does not exist", () => {
    const grids = { ...GRIDS, Start: gridXml(5, 5, [...START, cellXml(1, 3, "borta", [["Jump.To", "Nope"]])]) };
    const report = importVocabulary(writeGridset(grids), {}, path.join(tmp, "set"));

    expect(report).toContain("Start (1, 3): skipped, Jump.To \"Nope\" names no grid");
  });

  test("a grid named as a standard palette stops the import before anything is written", () => {
    const setDir = path.join(tmp, "set");
    const gridset = writeGridset({ ...GRIDS, "Command Bar": GRIDS.Mat });

    expect(() => importVocabulary(gridset, {}, setDir)).toThrow("Command Bar");
    expect(fs.existsSync(setDir)).toBe(false);
  });

  test("a start grid with no vocabulary stops the import", () => {
    const gridset = writeGridset({ ...GRIDS, Start: GRIDS.Video });
    expect(() => importVocabulary(gridset, {}, path.join(tmp, "set"))).toThrow("no vocabulary");
  });
});

describe("vocabularyGrids()", () => {
  const word = { result: { cell: { type: "ActionCodeCell", options: {} } } };
  const jump = to => ({ result: { cell: { type: "ActionBranchToPaletteCell", options: { branchTo: to } } } });
  const command = { result: { cell: { type: "CommandGoBackCell", options: {} } } };

  test("drops a grid whose only words lead to grids that are dropped", () => {
    const converted = new Map([
      ["Start", [word, jump("A")]],
      ["A", [jump("B")]],
      ["B", [command]]
    ]);
    expect(vocabularyGrids(converted)).toEqual(new Set(["Start"]));
  });

  test("drops grids that only jump to each other", () => {
    const converted = new Map([["Start", [word]], ["A", [jump("B")]], ["B", [jump("A")]]]);
    expect(vocabularyGrids(converted)).toEqual(new Set(["Start"]));
  });

  test("keeps a grid with a rest cell", () => {
    const rest = { result: { cell: { type: "ContentLabel", options: {} } } };
    expect(vocabularyGrids(new Map([["Vila", [rest, command]]]))).toEqual(new Set(["Vila"]));
  });
});
