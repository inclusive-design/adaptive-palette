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
 * Tests the removal of personal grids, on a made-up grid set written to a temp folder.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanGridset } from "./clean_grid3.js";
import { REMOVED_MARKER, readCells } from "./import_grid3.js";

// "Vänner" is the grid to remove. Its folder name is decomposed, as macOS can unzip it, while the
// list and Jump.To name it composed. "Vänner jobb" is reached only through it, "Hobby" from the
// start grid, and "Kopia" from nowhere. "Ingenstans", which "Vänner" also jumps to, is no grid.
const VANNER = "Vänner".normalize("NFD");

const cell = (x, body) => `    <Cell X="${x}"><Content>${body}</Content></Cell>`;
const commands = (...list) => `<Commands>${list.join("")}</Commands>`;
const jumpTo = grid => `<Command ID="Jump.To"><Parameter Key="grid">${grid}</Parameter></Command>`;
const insert = (...runs) => "<Command ID=\"Action.InsertText\"><Parameter Key=\"text\"><p><s>" +
  runs.map(run => `<r>${run}</r>`).join("") + "</s></p></Parameter></Command>";
const caption = (text, image) =>
  `<CaptionAndImage><Caption>${text}</Caption>${image ? `<Image>${image}</Image>` : ""}</CaptionAndImage>`;
const back = "<Commands><Command ID=\"Jump.Back\" /><Command ID=\"Speech.ReadCell\" /></Commands><CaptionAndImage><Caption>Tillbaka</Caption></CaptionAndImage>";
// A grid.xml laid out as Grid 3 writes one: CRLF line endings and no final newline.
const gridXml = (guid, cells) => ["<Grid xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">",
  `  <GridGuid>${guid}</GridGuid>`, "  <Cells>", ...cells, "  </Cells>",
  "  <WordList>", "    <Items />", "  </WordList>", "</Grid>"].join("\r\n");

const GRIDS = {
  "Start": gridXml("guid-1", [
    cell(0, commands(insert("vänner"), jumpTo("Vänner")) + caption("Mina vänner", "-0-text-0.jpg") +
      "<Style><BasedOnStyle>Vocab cell</BasedOnStyle></Style>"),
    cell(1, commands(jumpTo("Hobby")) + caption("Hobby")),
    cell(2, commands(insert("Anna B", "erg")) + caption("Anna B")),
    cell(3, commands(insert("kompisar $&amp;"), jumpTo("Vänner"))),
    cell(4, commands(jumpTo("Vänner")) + caption("Saknas", ".png")),
    // An insert with a segment picture, file `5-0-0-text-0.jpg`.
    cell(5, commands("<Command ID=\"Action.InsertText\"><Parameter Key=\"text\"><p><s Image=\"0.jpg\"><r>pris</r></s></p>" +
      "</Parameter></Command>", jumpTo("Vänner")) + caption("Pris $&amp; co", "[WIDGIT]pris.wmf"))
  ]),
  [VANNER]: gridXml("guid-2", [
    cell(0, commands(insert("Anna", "<![CDATA[ ]]>", "Berg")) + caption("Anna", "-0-text-0.jpg")),
    cell(1, commands(jumpTo("Vänner jobb")) + caption("Jobb")),
    cell(2, back),
    cell(3, caption("Ord")),
    cell(4, caption("Hobby")),
    cell(5, commands(insert("Märta"), "<Command ID=\"Action.Speak\" />") + caption("Märta")),
    cell(6, commands(jumpTo("Ingenstans")))
  ]),
  "Vänner jobb": gridXml("guid-3", [cell(0, commands(insert("Bo")) + caption("Bo")), cell(1, caption("Märta"))]),
  "Hobby": gridXml("guid-4", [
    cell(0, commands(insert("måla")) + caption("måla")), cell(1, back), cell(2, caption("ANNA&#xA;  berg"))
  ]),
  "Kopia": gridXml("guid-5", [
    cell(0, commands(insert("kopia")) + caption("kopia")), cell(1, caption("<![CDATA[" + "MÄRTA".normalize("NFD") + "]]>"))
  ])
};

const FILE_MAP = [
  "<FileMap xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">",
  "  <Entries>",
  "    <Entry StaticFile=\"Grids\\Start\\grid.xml\">",
  "      <DynamicFiles>",
  "        <File>Grids\\Start\\0-0-0-text-0.jpg</File>",
  "        <File>Grids\\Start\\5-0.jpg</File>",
  "        <File>Grids\\Start\\5-0-0-text-0.jpg</File>",
  "      </DynamicFiles>",
  "    </Entry>",
  `    <Entry StaticFile="Grids\\${VANNER}\\grid.xml">`,
  "      <DynamicFiles>",
  `        <File>Grids\\${VANNER}\\0-0-0-text-0.jpg</File>`,
  "      </DynamicFiles>",
  "    </Entry>",
  "    <Entry StaticFile=\"Settings0\\settings.xml\">",
  "      <DynamicFiles>",
  "        <File>Settings0\\thumbnail.bmp</File>",
  "      </DynamicFiles>",
  "    </Entry>",
  "  </Entries>",
  "</FileMap>"
];

function writeGridset (dir) {
  const files = {
    "FileMap.xml": FILE_MAP.join("\r\n"),
    "Settings0/settings.xml": "<GridSetSettings><StartGrid>Start</StartGrid><Language>sv-SE</Language>" +
      "<Description>Annas ord</Description></GridSetSettings>",
    ...Object.fromEntries(Object.entries(GRIDS).map(([name, xml]) => [`Grids/${name}/grid.xml`, xml])),
    "Grids/Start/0-0-0-text-0.jpg": "start photo",
    "Grids/Start/5-0.jpg": "kept photo",
    "Grids/Start/5-0-0-text-0.jpg": "insert photo",
    [`Grids/${VANNER}/0-0-0-text-0.jpg`]: "friend photo"
  };
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
}

describe("cleanGridset()", () => {
  let tmp, gridset, out, list;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "grid3-clean-"));
    gridset = path.join(tmp, "gridset");
    out = path.join(tmp, "clean");
    list = "Vänner\n";
    writeGridset(gridset);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
  // Every file and folder under `dir`, with each file's contents.
  const snapshot = dir => fs.readdirSync(dir, { recursive: true }).sort().map(file => {
    const full = path.join(dir, file);
    return [file, fs.statSync(full).isFile() ? fs.readFileSync(full, "utf8") : "folder"];
  });

  test.each([
    ["the output folder exists", () => fs.mkdirSync(out), "exists"],
    ["the output folder is inside the grid set", () => { out = path.join(gridset, "clean"); }, "inside the grid set"],
    ["the list names no grids", () => { list = "\n  \n"; }, "names no grids"],
    ["a listed name is not a grid", () => { list = "Vänner\nVäner\n"; }, "Väner"],
    ["the list names the start grid", () => { list = "Vänner\nStart\n"; }, "is the start grid"],
    ["the grid set holds a link", () => {
      fs.symlinkSync(path.join(gridset, "Grids", "Start", "5-0.jpg"), path.join(gridset, "Grids", "Hobby", "5-0.jpg"));
    }, "symbolic link"],
    ["a stopped run left a partial copy", () => fs.mkdirSync(`${out}.partial`), "stopped run"],
    ["the partial copy would be the grid set", () => {
      fs.renameSync(gridset, path.join(tmp, "set.partial"));
      gridset = path.join(tmp, "set.partial");
      out = path.join(tmp, "set");
    }, "which is or holds the grid set"],
    ["the partial copy would hold the grid set", () => {
      fs.mkdirSync(path.join(tmp, "out.partial"));
      fs.renameSync(gridset, path.join(tmp, "out.partial", "set"));
      gridset = path.join(tmp, "out.partial", "set");
      out = path.join(tmp, "out");
    }, "which is or holds the grid set"]
  ])("stops, writing nothing, when %s", (_, setUp, message) => {
    setUp();
    const before = snapshot(gridset);
    expect(() => cleanGridset(gridset, out, list)).toThrow(message);
    expect(snapshot(gridset)).toEqual(before);
    expect(fs.existsSync(out) ? fs.readdirSync(out) : []).toEqual([]);
  });

  test("leaves the grid set as it was", () => {
    const before = snapshot(gridset);
    cleanGridset(gridset, out, list);
    expect(snapshot(gridset)).toEqual(before);
    expect(fs.existsSync(`${out}.partial`)).toBe(false);
  });

  test("copies a grid set given as a link, and leaves it as it was", () => {
    const link = path.join(tmp, "link");
    fs.symlinkSync(gridset, link);
    const before = snapshot(gridset);
    cleanGridset(link, out, list);
    expect(fs.lstatSync(out).isSymbolicLink()).toBe(false);
    expect(snapshot(gridset)).toEqual(before);
  });

  test("empties a listed grid but for a notice, a Back cell and the marker, and keeps its GridGuid", () => {
    cleanGridset(gridset, out, list);
    const dir = path.join(out, "Grids", VANNER);
    expect(fs.readdirSync(dir)).toEqual(["grid.xml"]);
    const xml = read(dir, "grid.xml");
    expect(xml).toContain(REMOVED_MARKER);
    expect(xml).toContain("<GridGuid>guid-2</GridGuid>");
    expect(xml).not.toContain("Anna");
    expect(xml).not.toMatch(/[^\r]\n/);
    expect(readCells(xml).map(c => [c.x, c.y, c.commands, c.caption, c.image])).toEqual([
      [0, 0, [], "Borttaget av integritetsskäl", ""],
      [0, 1, ["Jump.Back"], "Tillbaka", "[GRID3X]jump_back.wmf"]
    ]);
  });

  test("writes the notice in English when the grid set is not Swedish", () => {
    const settings = path.join(gridset, "Settings0", "settings.xml");
    fs.writeFileSync(settings, read(settings).replace("sv-SE", "en-GB"));
    cleanGridset(gridset, out, list);
    expect(readCells(read(out, "Grids", VANNER, "grid.xml")).map(c => c.caption)).toEqual(["Removed for privacy", "Back"]);
  });

  test("an entry cell shows its label above the notice, keeps its jump and style, and loses its picture and insert", () => {
    cleanGridset(gridset, out, list);
    const start = path.join(out, "Grids", "Start");
    const [entry, , , uncaptioned, , library] = readCells(read(start, "grid.xml"));
    expect(entry).toMatchObject({
      commands: ["Jump.To"], jumpTo: "Vänner", caption: "Mina vänner\nBorttaget av integritetsskäl", image: "",
      insertedText: "", basedOnStyle: "Vocab cell"
    });
    expect(fs.existsSync(path.join(start, "0-0-0-text-0.jpg"))).toBe(false);
    // The picture of an insert that went.
    expect(fs.existsSync(path.join(start, "5-0-0-text-0.jpg"))).toBe(false);
    expect(fs.existsSync(path.join(start, "5-0.jpg"))).toBe(true);
    // With no caption, the label is the inserted text.
    expect(uncaptioned).toMatchObject({ commands: ["Jump.To"], caption: "kompisar $&\nBorttaget av integritetsskäl" });
    // A library picture goes too. The `$&` in its caption is kept as written.
    expect(library).toMatchObject({ caption: "Pris $& co\nBorttaget av integritetsskäl", image: "" });
  });

  test("changes nothing else in a kept grid.xml", () => {
    cleanGridset(gridset, out, list);
    // Each entry cell becomes the same placeholder, before and after.
    const others = xml => xml.replace(/<Cell\b[\s\S]*?<\/Cell>/g,
      block => block.includes(">Vänner</Parameter>") ? "<entry/>" : block);
    expect(others(read(out, "Grids", "Start", "grid.xml"))).toBe(others(GRIDS.Start));
    for (const name of ["Hobby", "Kopia", "Vänner jobb"]) {
      expect(read(out, "Grids", name, "grid.xml")).toBe(GRIDS[name]);
    }
  });

  test("reports the grids removed, the entry cells changed, and an entry cell picture it could not find", () => {
    const report = cleanGridset(gridset, out, list);
    expect(report[0]).toBe("Grids removed: 1. Entry cells changed: 4.");
    expect(report).toContain("Start (4, 0): picture 4-0.png not found");
    // A library picture has no file to look for.
    expect(report.filter(line => line.includes("(5, 0)"))).toEqual([]);
  });

  test("FileMap.xml lists no deleted file and is otherwise as it was", () => {
    cleanGridset(gridset, out, list);
    expect(read(out, "FileMap.xml")).toBe(FILE_MAP.filter(line => !line.includes("-0-0-text-0.jpg")).join("\r\n"));
  });

  test("a run that fails part way deletes the copy, which could pass for a clean one", () => {
    fs.rmSync(path.join(gridset, "FileMap.xml"));
    expect(() => cleanGridset(gridset, out, list)).toThrow("ENOENT");
    expect(fs.existsSync(out)).toBe(false);
    expect(fs.existsSync(`${out}.partial`)).toBe(false);
  });

  test("keeps a subgrid of a removed grid, and reports that it can no longer be reached", () => {
    const report = cleanGridset(gridset, out, list);
    expect(read(out, "Grids", "Vänner jobb", "grid.xml")).toBe(GRIDS["Vänner jobb"]);
    // "Kopia" could not be reached before either, so it is not reported. Nor is "Ingenstans", which is
    // no grid.
    expect(report.filter(line => line.includes("reached"))).toEqual([
      "Vänner jobb: can no longer be reached from the start grid"
    ]);
  });

  test("the leak check lists each text from a removed grid that is still in the copy", () => {
    const report = cleanGridset(gridset, out, list);
    // 1. Hobby: "ANNA&#xA;  berg" differs in case and white space.
    // 2. Kopia: "MÄRTA" differs in case, is decomposed, and is in a CDATA section.
    // 3. Start: "Anna Berg" is only in an insert split over runs, "Anna B" and "erg", so only the
    //    inserted text finds it.
    // 4. Vänner jobb: its path starts with the removed grid's name, but it is kept. "Märta" comes from
    //    a removed cell that both inserts and speaks, which is not a command cell.
    // 5. settings.xml: "Anna" and "Ord" are in the description "Annas ord". "Ord" is in every
    //    `<WordList>` tag too, which is not text.
    // 6. No line for "Jobb", which is nowhere else, "Hobby", a grid name, or "Tillbaka", the caption of
    //    a Back cell that also reads itself aloud.
    expect(report.filter(line => line.startsWith("Leak check"))).toEqual([
      "Leak check, Grids/Hobby/grid.xml: \"Anna\"",
      "Leak check, Grids/Hobby/grid.xml: \"Anna Berg\"",
      "Leak check, Grids/Kopia/grid.xml: \"Märta\"",
      "Leak check, Grids/Start/grid.xml: \"Anna\"",
      "Leak check, Grids/Start/grid.xml: \"Anna Berg\"",
      "Leak check, Grids/Vänner jobb/grid.xml: \"Märta\"",
      "Leak check, Settings0/settings.xml: \"Anna\"",
      "Leak check, Settings0/settings.xml: \"Ord\""
    ]);
  });
});
