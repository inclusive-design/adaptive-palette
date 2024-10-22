/*
 * Copyright 2024 Inclusive Design Research Centre, OCAD University
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
import { initAdaptivePaletteGlobals, adaptivePaletteGlobals } from "../../src/client/GlobalData";
import { Palette } from "../../src/client/Palette";
import { processPaletteLabels, fetchBlissGlossJson } from "./paletteJsonGenerator";
import "../../src/client/index.scss";

// Initialize any globals used elsewhere in the code.
await initAdaptivePaletteGlobals("paletteDisplay");
await fetchBlissGlossJson();
let currentPaletteName = "";

const MAX_MATCHES_OUTPUT = 7;

/**
 * Handle the "Generate palette" button clicks.
 * 1. Retrieve the lines of text -- the glosses == as an array of arrays.
 * 2. Create the palette JSON structure based on those glosses
 * 3. Display the palette
 * 4. Report all of the matches for each input
 * 5. Report any errors.
 */
function handleGenerateDisplayButton () {
  const glossesArray = makeGlossesArrays();
  if (glossesArray.length === 0) {
    paletteDisplay.innertText = "<p>Missing glosses ?</p>";
  }
  const lookupResults = processPaletteLabels(
    glossesArray, parseInt(rowStart.value), parseInt(colStart.value)
  );
  lookupResults.paletteJson.name = paletteName.value;
  currentPaletteName = paletteName.value;

  // Display the palette and report the errors.
  // (Note: that the `Palette` Preact component will add the palette to the
  // `PaletteStore`)
  render(html`<${Palette} json=${lookupResults.paletteJson} />`, paletteDisplay);
  reportMatches(lookupResults.matches);
  reportErrors(lookupResults.errors);
  document.getElementById("savePalette").removeAttribute("disabled");
}

/**
 * Grab all the texts from `glossInput` text area and convetr it into arrays,
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
    const paletteString = JSON.stringify(palette, null, 2);
    const paletteBlob = new Blob([paletteString], { type: "text/json" });
    const saveLink = document.createElement("a");
    saveLink.href = URL.createObjectURL(paletteBlob);
    saveLink.download = `${palette.name}.json`;
    saveLink.click();
    setTimeout(() => {
      URL.revokeObjectURL(saveLink.href);
      document.getElementById("saveMessage").innerText = `Saved to Download folder as "${palette.name}.json"`;
    }, 6000);
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
  allMatches.forEach((aLabel) => {
    const dl = document.createElement("dl");
    mainMatchesEl.append(dl);
    const dt = document.createElement("dt");
    dl.append(dt);
    const matchLabel = Object.keys(aLabel)[0];
    dt.innerText = matchLabel;

    const matchesForLabel = aLabel[matchLabel];
    for (let i = 0; i < MAX_MATCHES_OUTPUT && i < matchesForLabel.length; i++) {
      const match = matchesForLabel[i];
      let dd = document.createElement("dd");
      dl.append(dd);
      dd.innerText = match.bciAvId;
      dd = document.createElement("dd");
      dl.append(dd);
      dd.innerText = match.label;
    }
    if (matchesForLabel.length > MAX_MATCHES_OUTPUT) {
      const dd = document.createElement("dd");
      dl.append(dd);
      dd.innerText = `${matchesForLabel.length - MAX_MATCHES_OUTPUT} more matches ...`;
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
document.getElementById("clearPaletteDisplay").addEventListener("click", clearPaletteDisplay);
document.getElementById("savePalette").addEventListener("click", savePalette);
