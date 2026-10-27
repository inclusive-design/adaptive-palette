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
 * Tests the Grid 3 import: mapping strings, grid XML, cell conversion, and a whole run on a
 * small grid set written to a temp folder.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convertCell, importGridset, parseComposition, readCells, slugify } from "./import_grid3.js";

test.each([
  ["B513/B548/B958", [513, "/", 548, "/", 958]],
  ["B711;B81", [711, ";", 81]],
  ["B1705;;B86", [1705, ";;", 86]],
  ["B513/B10//B392;B928", [513, "/", 10, "//", 392, ";", 928]],
  ["B158/B655;B86^", [158, "/", 655, ";", "B86^"]],
  ["B433;B10:6,0//XAnna/AK:2/XBerg", [433, ";", "B10:6,0", "//", "XAnna", "/", "AK:2", "/", "XBerg"]],
  ["B513", 513]
])("parseComposition(%s)", (spelling, composition) => {
  expect(parseComposition(spelling)).toEqual(composition);
});

test.each([
  ["Blå sida", "bla_sida"],
  ["Tom Sida (2)", "tom_sida_2"],
  ["välja kläder - Kopiera", "valja_klader_kopiera"],
  ["Start", "start"]
])("slugify(%s)", (name, slug) => {
  expect(slugify(name)).toBe(slug);
});

// The shapes Grid 3 writes: a Workspace cell with no position, a CDATA caption, an inserted
// phrase split over runs, a combined insert and jump, and an entity in a caption.
const GRID_XML = `<Grid>
  <Cells>
    <Cell ColumnSpan="10" ScanBlock="2">
      <Content>
        <ContentType>Workspace</ContentType>
        <ContentSubType>Chat</ContentSubType>
      </Content>
    </Cell>
    <Cell X="2" Y="1" ColumnSpan="2" RowSpan="2">
      <Content>
        <Commands>
          <Command ID="Action.InsertText">
            <Parameter Key="text"><p><s Image="0.jpg"><r>rita,</r><r><![CDATA[ ]]></r><r>måla</r></s><s><r><![CDATA[ ]]></r></s></p></Parameter>
          </Command>
          <Command ID="Jump.To">
            <Parameter Key="grid">Blå sida</Parameter>
          </Command>
        </Commands>
        <CaptionAndImage>
          <Caption><![CDATA[rita & måla]]></Caption>
          <Image>-0-text-0.jpg</Image>
        </CaptionAndImage>
        <Style>
          <BasedOnStyle>Vocab cell</BasedOnStyle>
          <BackColour>#CCFFF6FF</BackColour>
        </Style>
      </Content>
    </Cell>
    <Cell X="4" Y="9">
      <Content>
        <Commands>
          <Command ID="Jump.Home" />
        </Commands>
        <CaptionAndImage>
          <Caption>hem &amp; karta</Caption>
          <Image>[GRID2X]jump.home.wmf</Image>
        </CaptionAndImage>
      </Content>
    </Cell>
  </Cells>
</Grid>`;

test("readCells() reads each cell's position, commands, caption, picture, inserted text and style", () => {
  expect(readCells(GRID_XML)).toEqual([
    {
      x: 0, y: 0, columnSpan: 10, rowSpan: 1, contentType: "Workspace", commands: [], jumpTo: "",
      caption: "", image: "", insertedText: "", basedOnStyle: "", backColour: "", fontColour: ""
    },
    {
      x: 2, y: 1, columnSpan: 2, rowSpan: 2, contentType: "", commands: ["Action.InsertText", "Jump.To"],
      jumpTo: "Blå sida", caption: "rita & måla", image: "-0-text-0.jpg", insertedText: "rita, måla",
      basedOnStyle: "Vocab cell", backColour: "#CCFFF6FF", fontColour: ""
    },
    {
      x: 4, y: 9, columnSpan: 1, rowSpan: 1, contentType: "", commands: ["Jump.Home"], jumpTo: "",
      caption: "hem & karta", image: "[GRID2X]jump.home.wmf", insertedText: "", basedOnStyle: "",
      backColour: "", fontColour: ""
    }
  ]);
});

test("readCells() decodes numeric character references", () => {
  const xml = "<Cell><Content><CaptionAndImage><Caption>M&#229;ndag&#xA;kv&#xE4;ll</Caption></CaptionAndImage></Content></Cell>";
  expect(readCells(xml)[0].caption).toBe("Måndag\nkväll");
});

test("readCells() handles a self-closing cell", () => {
  const cells = readCells("<Cell X=\"3\" Y=\"2\" /><Cell X=\"4\"><Content><CaptionAndImage><Caption>a</Caption></CaptionAndImage></Content></Cell>");
  expect(cells.map(c => [c.x, c.y, c.caption])).toEqual([[3, 2, ""], [4, 0, "a"]]);
});

test("readCells() matches a decomposed grid name in Jump.To to its composed form", () => {
  const xml = `<Cell><Content><Commands><Command ID="Jump.To"><Parameter Key="grid">${"Blå sida".normalize("NFD")}</Parameter></Command></Commands></Content></Cell>`;
  expect(readCells(xml)[0].jumpTo).toBe("Blå sida".normalize("NFC"));
});

describe("convertCell()", () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "grid3-cell-"));
    fs.writeFileSync(path.join(dir, "0-1-0-text-0.png"), "");
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  // A cell as readCells() gives it, at X 0, Y 1, spanning 2 × 2.
  const cell = fields => ({
    x: 0, y: 1, columnSpan: 2, rowSpan: 2, contentType: "", commands: [], jumpTo: "", caption: "", image: "",
    insertedText: "", basedOnStyle: "", backColour: "", fontColour: "", ...fields
  });
  const grid = () => ({
    name: "Blå sida",
    slug: "bla_sida",
    dir,
    hasWorkspace: true,
    mapping: { "Grids/Blå sida/0-1-0-text-0.jpg": "B513/B10", "[blissx]18274.wmf": "B711;B81" },
    gridNames: new Set(["Blå sida", "Start"]),
    icons: { CommandGoToRootCell: 392, ActionSpeakCell: 2325 },
    styles: new Map([
      ["Vocab cell", { backColour: "#FEFEF4FF", fontColour: "#000000FF" }],
      ["Actions category style", { backColour: "#ED9C9EFF", fontColour: "" }]
    ])
  });
  const layout = { rowStart: 2, rowSpan: 2, columnStart: 1, columnSpan: 2 };
  const insert = { commands: ["Action.InsertText"], caption: "person" };

  test("an empty slot is left out", () => {
    expect(convertCell(cell({}), grid())).toBe(null);
  });

  test("a blank cell with an insert of no text is left out", () => {
    expect(convertCell(cell({ commands: ["Action.InsertText"] }), grid())).toBe(null);
  });

  test("the Workspace becomes the message area", () => {
    expect(convertCell(cell({ contentType: "Workspace" }), grid())).toEqual({
      id: "content-encoding-area",
      cell: { type: "ContentEncoding", options: layout }
    });
  });

  test("an insert with a mapped picture shows the mapped symbols", () => {
    expect(convertCell(cell({ ...insert, image: "-0-text-0.jpg" }), grid())).toEqual({
      id: "cell-0-1",
      cell: { type: "ActionCodeCell", options: { label: "person", composition: [513, "/", 10], ...layout } }
    });
  });

  test("an insert that also jumps goes to the grid after inserting", () => {
    const combined = cell({ commands: ["Action.InsertText", "Jump.To"], jumpTo: "Start", caption: "göra" });
    expect(convertCell(combined, grid())).toEqual({
      id: "cell-0-1",
      cell: { type: "ActionCodeCell", options: { label: "göra", branchTo: "Start", ...layout } }
    });
  });

  test("an insert that jumps to a grid that does not exist only inserts, with a warning", () => {
    const combined = cell({ commands: ["Action.InsertText", "Jump.To"], jumpTo: "Borta", caption: "göra" });
    expect(convertCell(combined, grid())).toEqual({
      id: "cell-0-1",
      cell: { type: "ActionCodeCell", options: { label: "göra", ...layout } },
      warning: "Jump.To \"Borta\" names no grid"
    });
  });

  test("a word cell's own colour wins over its style's", () => {
    const own = cell({ ...insert, basedOnStyle: "Vocab cell", backColour: "#CCFFF6FF" });
    expect(convertCell(own, grid()).cell.options.backgroundColor).toBe("#CCFFF6FF");
  });

  test("a word cell with no colour of its own takes its style's", () => {
    const styled = cell({ ...insert, basedOnStyle: "Vocab cell" });
    expect(convertCell(styled, grid()).cell.options).toMatchObject({ backgroundColor: "#FEFEF4FF", textColor: "#000000FF" });
  });

  test("a word cell's own text colour wins over its style's", () => {
    const own = cell({ ...insert, basedOnStyle: "Vocab cell", fontColour: "#FFFFFFFF" });
    expect(convertCell(own, grid()).cell.options.textColor).toBe("#FFFFFFFF");
  });

  test("a folder cell takes its colour", () => {
    const jump = cell({ commands: ["Jump.To"], jumpTo: "Start", caption: "start", basedOnStyle: "Actions category style" });
    expect(convertCell(jump, grid()).cell.options.backgroundColor).toBe("#ED9C9EFF");
  });

  test("a style that is not in styles.xml gives no colour", () => {
    const unknown = cell({ ...insert, basedOnStyle: "Tom ruta (ingen stil)" });
    expect(convertCell(unknown, grid()).cell.options).not.toHaveProperty("backgroundColor");
  });

  test("a command cell takes no colour", () => {
    const home = cell({ commands: ["Jump.Home"], caption: "hem", basedOnStyle: "Vocab cell", backColour: "#E86E9BFF" });
    expect(convertCell(home, grid()).cell.options).not.toHaveProperty("backgroundColor");
  });

  test("an insert with no caption takes the inserted text as its label", () => {
    const uncaptioned = cell({ commands: ["Action.InsertText"], insertedText: "rita, måla" });
    expect(convertCell(uncaptioned, grid()).cell.options.label).toBe("rita, måla");
  });

  test("an unmapped embedded picture becomes a picture to copy", () => {
    expect(convertCell(cell({ ...insert, image: "-0-text-0.png" }), grid())).toEqual({
      id: "cell-0-1",
      cell: {
        type: "ActionCodeCell",
        options: { label: "person", picture: "../pictures/bla_sida/0-1-0-text-0.png", ...layout }
      },
      copy: "0-1-0-text-0.png"
    });
  });

  test("an embedded picture browsers cannot show leaves the label only, with a warning", () => {
    fs.writeFileSync(path.join(dir, "0-1-0-text-0.emf"), "");
    expect(convertCell(cell({ ...insert, image: "-0-text-0.emf" }), grid())).toEqual({
      id: "cell-0-1",
      cell: { type: "ActionCodeCell", options: { label: "person", ...layout } },
      warning: "picture 0-1-0-text-0.emf is not a type browsers show"
    });
  });

  test("a missing embedded picture leaves the label only, with a warning", () => {
    expect(convertCell(cell({ ...insert, image: ".bmp" }), grid())).toEqual({
      id: "cell-0-1",
      cell: { type: "ActionCodeCell", options: { label: "person", ...layout } },
      warning: "picture 0-1.bmp not found"
    });
  });

  test("a library picture is looked up in the mapping as it is written", () => {
    const blissx = convertCell(cell({ ...insert, image: "[blissx]18274.wmf" }), grid());
    expect(blissx.cell.options.composition).toEqual([711, ";", 81]);
  });

  test("an embedded picture name with a path separator is refused", () => {
    expect(convertCell(cell({ ...insert, image: "/../x.png" }), grid())).toEqual({
      id: "cell-0-1",
      cell: { type: "ActionCodeCell", options: { label: "person", ...layout } },
      warning: "picture name /../x.png not allowed"
    });
  });

  test("an unmapped library picture leaves the label only", () => {
    expect(convertCell(cell({ ...insert, image: "[widgit]widgit rebus\\h\\hello.emf" }), grid())).toEqual({
      id: "cell-0-1",
      cell: { type: "ActionCodeCell", options: { label: "person", ...layout } }
    });
  });

  test("a jump becomes a branch to the grid's palette", () => {
    const jump = cell({ commands: ["Jump.To", "Speech.ReadCell"], jumpTo: "Start", caption: "start" });
    expect(convertCell(jump, grid()).cell).toEqual({
      type: "ActionBranchToPaletteCell",
      options: { label: "start", branchTo: "Start", ...layout }
    });
  });

  test("a jump to a grid that does not exist is skipped", () => {
    const jump = cell({ commands: ["Jump.To"], jumpTo: "Borta", caption: "borta" });
    expect(convertCell(jump, grid())).toEqual({ skipped: "Jump.To \"Borta\" names no grid" });
  });

  test("Jump.Home becomes the home command with the standard chart's symbol", () => {
    const home = cell({ commands: ["Jump.Home"], caption: "färg/karta", image: "[GRID2X]jump.home.wmf" });
    expect(convertCell(home, grid())).toEqual({
      id: "cell-0-1",
      cell: { type: "CommandGoToRootCell", options: { label: "färg/karta", composition: 392, ...layout } }
    });
  });

  test("Action.Speak names the message area it speaks", () => {
    const speak = cell({ commands: ["Action.Speak"], caption: "tala" });
    expect(convertCell(speak, grid()).cell).toEqual({
      type: "ActionSpeakCell",
      options: { label: "tala", composition: 2325, ariaControls: "content-encoding-area", ...layout }
    });
  });

  test("a message command in a grid with no message area names none", () => {
    const speak = cell({ commands: ["Action.Speak"], caption: "tala" });
    expect(convertCell(speak, { ...grid(), hasWorkspace: false }).cell.options).not.toHaveProperty("ariaControls");
  });

  test.each([
    ["Jump.Back", "CommandGoBackCell", {}],
    ["Action.DeleteWord", "CommandDelLastEncoding", { ariaControls: "content-encoding-area" }],
    ["Action.Clear", "CommandClearEncoding", { ariaControls: "content-encoding-area" }]
  ])("%s becomes %s", (command, type, extra) => {
    const g = grid();
    g.icons[type] = 99;
    expect(convertCell(cell({ commands: [command], caption: "x" }), g).cell).toEqual({
      type,
      options: { label: "x", composition: 99, ...extra, ...layout }
    });
  });

  test("a command with no equivalent is skipped", () => {
    const keys = cell({ commands: ["ComputerControl.Alt", "ComputerControl.Keyboard"], caption: "alt h" });
    expect(convertCell(keys, grid())).toEqual({ skipped: "unsupported: ComputerControl.Alt + ComputerControl.Keyboard" });
  });

  test("a caption with no command is skipped", () => {
    expect(convertCell(cell({ caption: "frukost" }), grid())).toEqual({ skipped: "unsupported: no command" });
  });
});

describe("importGridset()", () => {
  let tmp;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "grid3-set-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));

  // A grid set with two grids. "Blå sida" is written decomposed, as macOS can unzip it, while
  // Jump.To and the mapping name it composed.
  function writeGridset (gridNames = ["Start", "Blå sida".normalize("NFD")]) {
    const gridset = path.join(tmp, "gridset");
    fs.mkdirSync(path.join(gridset, "Settings0"), { recursive: true });
    fs.writeFileSync(path.join(gridset, "Settings0", "settings.xml"),
      "<GridSetSettings><StartGrid>Start</StartGrid><Language>sv-SE</Language></GridSetSettings>");
    fs.mkdirSync(path.join(gridset, "Settings0", "Styles"));
    fs.writeFileSync(path.join(gridset, "Settings0", "Styles", "styles.xml"),
      "<StyleData><Styles><Style Key=\"Vocab cell\"><BackColour>#FEFEF4FF</BackColour></Style></Styles></StyleData>");
    for (const name of gridNames) {
      fs.mkdirSync(path.join(gridset, "Grids", name), { recursive: true });
    }
    fs.writeFileSync(path.join(gridset, "Grids", "Start", "grid.xml"), `<Grid><Cells>
      <Cell><Content><Commands><Command ID="Jump.To"><Parameter Key="grid">Blå sida</Parameter></Command></Commands>
        <CaptionAndImage><Caption>blå</Caption></CaptionAndImage></Content></Cell>
      <Cell X="1"><Content><Commands><Command ID="Action.Copy" /></Commands>
        <CaptionAndImage><Caption>kopiera</Caption></CaptionAndImage></Content></Cell>
    </Cells></Grid>`);
    const blue = path.join(gridset, "Grids", gridNames[1]);
    fs.writeFileSync(path.join(blue, "grid.xml"), `<Grid><Cells>
      <Cell><Content><Commands><Command ID="Action.InsertText" /></Commands>
        <CaptionAndImage><Caption>person</Caption><Image>.jpg</Image></CaptionAndImage>
        <Style><BasedOnStyle>Vocab cell</BasedOnStyle></Style></Content></Cell>
      <Cell X="1"><Content><Commands><Command ID="Action.InsertText" /></Commands>
        <CaptionAndImage><Caption>Anna</Caption><Image>.jpg</Image></CaptionAndImage></Content></Cell>
    </Cells></Grid>`);
    fs.writeFileSync(path.join(blue, "0-0.jpg"), "mapped");
    fs.writeFileSync(path.join(blue, "1-0.jpg"), "photo");
    return gridset;
  }
  const mapping = { "Grids/Blå sida/0-0.jpg": "B513" };

  test("writes the palette set, its palettes and the pictures they use", () => {
    const setDir = path.join(tmp, "set");
    const report = importGridset(writeGridset(), mapping, setDir);

    expect(report).toEqual(["Start (1, 0): skipped, unsupported: Action.Copy"]);
    expect(readJson(path.join(setDir, "palette_set.json"))).toEqual({
      formatVersion: 1,
      startPalette: "Start",
      palettes: { "Blå sida": "palettes/bla_sida.json", "Start": "palettes/start.json" }
    });
    expect(readJson(path.join(setDir, "palettes", "start.json"))).toEqual({
      name: "Start",
      language: "sv",
      cells: {
        "cell-0-0": {
          type: "ActionBranchToPaletteCell",
          options: { label: "blå", branchTo: "Blå sida", rowStart: 1, rowSpan: 1, columnStart: 1, columnSpan: 1 }
        }
      }
    });
    expect(readJson(path.join(setDir, "palettes", "bla_sida.json"))).toEqual({
      name: "Blå sida",
      language: "sv",
      cells: {
        "cell-0-0": {
          type: "ActionCodeCell",
          options: {
            label: "person", composition: 513, backgroundColor: "#FEFEF4FF", rowStart: 1, rowSpan: 1, columnStart: 1,
            columnSpan: 1
          }
        },
        "cell-1-0": {
          type: "ActionCodeCell",
          options: {
            label: "Anna", picture: "../pictures/bla_sida/1-0.jpg", rowStart: 1, rowSpan: 1, columnStart: 2,
            columnSpan: 1
          }
        }
      }
    });
    expect(fs.readFileSync(path.join(setDir, "pictures", "bla_sida", "1-0.jpg"), "utf8")).toBe("photo");
    expect(fs.existsSync(path.join(setDir, "pictures", "bla_sida", "0-0.jpg"))).toBe(false);
  });

  test("a second run replaces the first", () => {
    const setDir = path.join(tmp, "set");
    const gridset = writeGridset();
    importGridset(gridset, mapping, setDir);
    fs.writeFileSync(path.join(setDir, "palettes", "stale.json"), "{}");

    importGridset(gridset, mapping, setDir);
    expect(fs.existsSync(path.join(setDir, "palettes", "stale.json"))).toBe(false);
    expect(fs.existsSync(path.join(setDir, "palettes", "start.json"))).toBe(true);
  });

  test("an empty ContentLabel keeps a palette the size of its grid", () => {
    const setDir = path.join(tmp, "set");
    const gridset = writeGridset();
    const definitions = "<ColumnDefinitions><ColumnDefinition /><ColumnDefinition /><ColumnDefinition /></ColumnDefinitions>" +
      "<RowDefinitions><RowDefinition /><RowDefinition /></RowDefinitions>";
    const startXml = path.join(gridset, "Grids", "Start", "grid.xml");
    fs.writeFileSync(startXml, fs.readFileSync(startXml, "utf8").replace("<Grid>", `<Grid>${definitions}`));

    importGridset(gridset, mapping, setDir);
    expect(readJson(path.join(setDir, "palettes", "start.json")).cells["grid-size"]).toEqual({
      type: "ContentLabel", options: { label: "", rowStart: 2, rowSpan: 1, columnStart: 3, columnSpan: 1 }
    });
    expect(readJson(path.join(setDir, "palettes", "bla_sida.json")).cells).not.toHaveProperty("grid-size");
  });

  test("a second Workspace in a grid is skipped", () => {
    const setDir = path.join(tmp, "set");
    const gridset = writeGridset();
    const workspace = y => `<Cell Y="${y}"><Content><ContentType>Workspace</ContentType></Content></Cell>`;
    const startXml = path.join(gridset, "Grids", "Start", "grid.xml");
    fs.writeFileSync(startXml, `<Grid><Cells>${workspace(1)}${workspace(2)}</Cells></Grid>`);

    const report = importGridset(gridset, mapping, setDir);
    expect(report).toEqual(["Start (0, 2): skipped, a second Workspace; a palette has one message area"]);
    expect(readJson(path.join(setDir, "palettes", "start.json")).cells["content-encoding-area"].options.rowStart).toBe(2);
  });

  test("a grid set with no styles.xml imports with no style colours", () => {
    const setDir = path.join(tmp, "set");
    const gridset = writeGridset();
    fs.rmSync(path.join(gridset, "Settings0", "Styles"), { recursive: true });

    importGridset(gridset, mapping, setDir);
    expect(readJson(path.join(setDir, "palettes", "bla_sida.json")).cells["cell-0-0"].options)
      .not.toHaveProperty("backgroundColor");
  });

  test("a run that fails leaves the earlier import as it was", () => {
    const setDir = path.join(tmp, "set");
    const gridset = writeGridset();
    importGridset(gridset, mapping, setDir);
    fs.rmSync(path.join(gridset, "Grids", "Start", "grid.xml"));

    expect(() => importGridset(gridset, mapping, setDir)).toThrow("ENOENT");
    expect(fs.existsSync(path.join(setDir, "palette_set.json"))).toBe(true);
    expect(fs.existsSync(`${setDir}.partial`)).toBe(false);
  });

  test("a failed rename into place puts the earlier import back", () => {
    const setDir = path.join(tmp, "set");
    const gridset = writeGridset();
    importGridset(gridset, mapping, setDir);
    const renameSync = fs.renameSync;
    const spy = vi.spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (from.endsWith(".partial")) {
        throw new Error("EBUSY");
      }
      renameSync(from, to);
    });
    try {
      expect(() => importGridset(gridset, mapping, setDir)).toThrow("EBUSY");
    } finally {
      spy.mockRestore();
    }
    expect(fs.existsSync(path.join(setDir, "palette_set.json"))).toBe(true);
    expect(fs.existsSync(`${setDir}.old`)).toBe(false);
    expect(fs.existsSync(`${setDir}.partial`)).toBe(false);
  });

  test("two grids with the same file name stop the import before anything is written", () => {
    const setDir = path.join(tmp, "set");
    const gridset = writeGridset(["Start", "Tom Sida", "Tom-Sida"]);
    expect(() => importGridset(gridset, mapping, setDir)).toThrow("tom_sida");
    expect(fs.existsSync(setDir)).toBe(false);
  });
});
