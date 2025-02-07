/*
 * Copyright 2024-2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { render } from "preact";
import { html } from "htm/preact";
import { Palette } from "../../src/client/Palette";
import { BlissSymbol } from "../../src/client/BlissSymbol";
import { processPaletteLabels, fetchBlissGlossJson } from "./paletteJsonGenerator";
import "../../src/client/index.scss";
import {
  initAdaptivePaletteGlobals, adaptivePaletteGlobals, cellTypeRegistry
} from "../../src/client/GlobalData";


// Initialize any globals used elsewhere in the code.
await initAdaptivePaletteGlobals("paletteDisplay");
await fetchBlissGlossJson();
let currentPaletteName = "";

const MAX_MATCHES_OUTPUT = 7;

/**
 * Populate the cell type <select> element using the `cellTypeRegistry` and
 * set up a handler to adjust the palette for changes in the cell type.
 */
function initCellTypesSelect () {
  const cellTypesSelect = document.getElementById("cellTypes");
  Object.keys(cellTypeRegistry).forEach ((cellType) => {
    // The "cell" type `ContentBmwEncoding` is for an array of symbols within
    // a content area, not for cells within a palette.  Avoid for now.
    if (cellType !== "ContentBmwEncoding") {
      cellTypesSelect.add(new Option(cellType));
    }
  });
  cellTypesSelect.addEventListener("change", async () => {
    const palette = await adaptivePaletteGlobals.paletteStore.getNamedPalette(currentPaletteName);
    updatePaletteCells(palette, cellTypesSelect.selectedOptions[0].value);
  });
}

/**
 * Render the inline Blissymbol examples
 */
function renderExamples() {
  // Slash example
  render(html`
    <${BlissSymbol}
      bciAvId=${[ 12378, "/", 25582 ]}
      label="slash - half space between symbols (raccoon)"
      isPresentation=false
      labelledBy="slashExampleLabel"
    />
    `, document.getElementById("slashExample"));

  // Semi-colon example
  render(html`
    <${BlissSymbol}
      bciAvId=${[ 12378, ";", 9011, "/", 25582 ]}
      label="semi-colon - superimpose plural indicator symbol (raccoons)"
      isPresentation=false
      labelledBy="semicolonExampleLabel"
    />
  `, document.getElementById("semicolonExample"));

  // Kerning example
  render(html`
    <${BlissSymbol}
      bciAvId=${[ 14164, "/", "K:-2", "/", 16164 ]}
      label="kerning - quarter space between symbols (pain)"
      isPresentation=false
      labelledBy="kerningExampleLabel"
    />
  `, document.getElementById("kerningExample"));

  // X example
  render(html`
    <${BlissSymbol}
      bciAvId=${[ "XH", "/", "Xo", "/", "Xl", "/", "Xl", "/", "Xi", "/", "Xs" ]}
      label="'X' for letters - (Hollis)"
      isPresentation=false
      labelledBy="XExampleLabel"
    />
  `, document.getElementById("XExample"));
}

/**
 * Given a new cell type, change all of the palette's cells to that type, and
 * re-render the palette.
 * @param {Palette} palette - the palette in question.
 * @param {String} cellType - the cell type to set all of the `palette`'s cells
 *                            to.
 */
function updatePaletteCells (palette, cellType) {
  if (palette && cellType) {
    Object.keys(palette.cells).forEach((id) => {
      palette.cells[id].type = cellType;
    });
    render(html`<${Palette} json=${palette} />`, paletteDisplay);
  }
};

/**
 * Handle the "Generate palette" button clicks.
 * 1. Retrieve the lines of text -- the glosses == as an array of arrays.
 * 2. Create the palette JSON structure based on those glosses
 * 3. Display the palette
 * 4. Report all of the matches for each input
 * 5. Report any errors.
 */
function handleGenerateDisplayButton () {
  // Remove any previously generated palette.
  adaptivePaletteGlobals.paletteStore.removePalette(currentPaletteName);

  const glossesArray = makeGlossesArrays();
  if (glossesArray.length === 0) {
    paletteDisplay.innerText = "<p>Missing glosses ?</p>";
  }
  const lookupResults = processPaletteLabels(
    glossesArray,
    paletteName.value,
    parseInt(rowStart.value),
    parseInt(colStart.value),
    document.getElementById("cellTypes").selectedOptions[0].value
  );
  currentPaletteName = lookupResults.paletteJson.name;

  // Display the palette and report the errors.
  // (Note: that the `Palette` Preact component will add the palette to the
  // `PaletteStore`)
  render(html`<${Palette} json=${lookupResults.paletteJson} />`, paletteDisplay);
  reportMatches(lookupResults.matches);
  reportErrors(lookupResults.errors);
  document.getElementById("savePalette").removeAttribute("disabled");
}

/**
 * Handle changes to the text field where the user inputs the name of the
 * palette.  This limits the chance of the user altering the name and the
 * the save operation uses an out-of-date name.
 */

async function handleNameChange () {
  const palette = await adaptivePaletteGlobals.paletteStore.getNamedPalette(currentPaletteName);
  updatePaletteName(palette, paletteName.value);
}

/**
 * Grab all the texts from `glossInput` text area and converts it into arrays,
 * one array per line.  Each line represents one row of the palette. Return
 * an array of these arrays.
 * @return {Array} - Array of arrays of glosses, where each inner array is one
 *                   row of the palette.
 */
function makeGlossesArrays () {
  const glossRowsText = document.getElementById("glossInput").value;
  if (glossRowsText.trim() === "") {
    console.error("No glosses provided");
    return [];
  }
  const glossRows = glossRowsText.split("\n");
  const arrayofRows = [];
  glossRows.forEach((row) => {
    // Make an array of strings from each row, removing any blank items. Then
    // remove any begining or trailing white space.
    const rowArray = row.split(" ").filter((item) => item.length !== 0);
    rowArray.forEach((item, i, arr) => arr[i] = item.trim());
    arrayofRows.push(rowArray);
  });
  return arrayofRows;
}

/**
 * Clear:
 * - the palette rendering aree,
 * - the palette store,
 * - reset the palette name,
 * - clear the save message, and
 * - clear the matches and error reports.
 */
function clearPaletteDisplay () {
  render(html``, paletteDisplay);
  adaptivePaletteGlobals.paletteStore.removePalette(currentPaletteName);
  currentPaletteName = "";
  document.getElementById("saveMessage").innerText = "";
  document.getElementById("savePalette").setAttribute("disabled", "disabled");
  document.getElementById("mainMatchesDisplay").innerText = "";
  document.getElementById("errorList").innerText = "";
}

/**
 * Save the palette to disk.
 * Based on: https://stackoverflow.com/questions/67804382/force-showing-the-save-as-dialog-box-when-downloading-a-file#answer-67806663
 */
async function savePalette () {
  const palette = await adaptivePaletteGlobals.paletteStore.getNamedPalette(currentPaletteName);
  if (palette) {
    // Double check that the name did not change.
    updatePaletteName(palette, paletteName.value);
    const paletteString = JSON.stringify(palette, null, 2);
    const paletteBlob = new Blob([paletteString], { type: "text/json" });
    const saveLink = document.createElement("a");
    saveLink.href = URL.createObjectURL(paletteBlob);
    saveLink.download = `${palette.name}.json`;
    saveLink.click();
    setTimeout(() => {
      URL.revokeObjectURL(saveLink.href);
      document.getElementById("saveMessage").innerText = `Saved to downloads folder as "${palette.name}.json"`;
    }, 6000);
  }
}

/**
 * Central function for updating strings and objects if the current palette's
 * name is out of sync with respect to the text input field where the user
 * types in a name.  If no palette is provided, or the names match, this is a
 * no-op.
 * @param {Palette} palette - the palette in question.
 * @param {String} nameFromUI - the name in the text field input.
 */
function updatePaletteName (palette, nameFromUI) {
  if (palette?.name !== nameFromUI) {
    adaptivePaletteGlobals.paletteStore.removePalette(palette.name);
    palette.name = nameFromUI;
    currentPaletteName = nameFromUI;
    adaptivePaletteGlobals.paletteStore.addPalette(palette);
  }
}

/**
 * Report all matches so that user can see where the chosen symbol came from
 * and possibly change it.
 * @param {Array} allMatches - array of matches each having the match's BCI AV
 *                             ID and its full gloss, based on the partial gloss
 *                             used to find the match:
 *                             {label: {bciAvId: {string}, label: {string}}
 */
function reportMatches(allMatches) {
  // Empty out any previous report
  const mainMatchesEl = document.getElementById("mainMatchesDisplay");
  mainMatchesEl.innerText = "";
  allMatches.forEach((aMatch) => {
    const dl = document.createElement("dl");
    mainMatchesEl.append(dl);
    const dt = document.createElement("dt");
    dl.append(dt);
    const matchString = Object.keys(aMatch)[0];
    dt.innerText = matchString;

    const matchesForString = aMatch[matchString];
    for (let i = 0; i < MAX_MATCHES_OUTPUT && i < matchesForString.length; i++) {
      const match = matchesForString[i];
      const dd = document.createElement("dd");
      dl.append(dd);
      let compositionString = "";
      if (match.composition) {
        compositionString = `, '${match.composition.join("")}'`;
      }
      if (match.fullComposition) {
        compositionString += ` (${match.fullComposition.join("")});`;
      }
      dd.innerText = `${match.bciAvId}: ${match.label}${compositionString}`;
    }
    if (matchesForString.length > MAX_MATCHES_OUTPUT) {
      const dd = document.createElement("dd");
      dl.append(dd);
      dd.innerText = `${matchesForString.length - MAX_MATCHES_OUTPUT} more matches ...`;
    }
  });
}

/**
 * Report any errors that occurred as a bulletted list
 * @param {Array} errors - array of error meesaages ({String})
 */
function reportErrors(errors) {
  const noErrorEl = document.getElementById("noErrors");
  const errorListEl = document.getElementById("errorList");  // a <ul> element
  if (!errors || errors.length === 0) {
    errorListEl.innerText = "";
    noErrorEl.style.display = "block";
  }
  else {
    noErrorEl.style.display = "none";
    errorListEl.innerText = ""; // Delete any previous error report
    errors.forEach((error) => {
      const listItem = document.createElement("li");
      listItem.innerText = `${error}`;
      errorListEl.append(listItem);
    });
  }
}

// HTML UI Elements
const paletteName = document.getElementById("paletteName");
const rowStart = document.getElementById("rowStart");
const colStart = document.getElementById("colStart");
const generatePalette = document.getElementById("generatePalette");
const paletteDisplay = document.getElementById("paletteDisplay");

// Listeners
generatePalette.addEventListener("click", handleGenerateDisplayButton);
paletteName.addEventListener("change", handleNameChange);
document.getElementById("clearPaletteDisplay").addEventListener("click", clearPaletteDisplay);
document.getElementById("savePalette").addEventListener("click", savePalette);

initCellTypesSelect();
renderExamples();
