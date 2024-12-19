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
import { fetchBlissSymbolsJson, findAndRecordCompositions } from "./createAndRecordCompositions";

const savedFileName = "bliss_symbol_explanationsNEW.json";

// Initialize any globals used elsewhere in the code.
await fetchBlissSymbolsJson();

let results = null;
async function handleCreateAndRecord () {
  results = await findAndRecordCompositions();
  document.getElementById("counts").innerText = results.counts;
  document.getElementById("undefined").innerHTML = results.undef.message;
  document.getElementById("composition_equals_bciavid").innerHTML = results.noComposition.message;
}

/**
 * Save the palette to disk.
 * Based on: https://stackoverflow.com/questions/67804382/force-showing-the-save-as-dialog-box-when-downloading-a-file#answer-67806663
 */
async function handleSavePalette () {
  const blissSymbolsString = JSON.stringify(results.newBlissSymbols, null, 2);
  const blob = new Blob([blissSymbolsString], { type: "text/json" });
  const saveLink = document.createElement("a");
  saveLink.href = URL.createObjectURL(blob);
  saveLink.download = savedFileName;
  saveLink.click();
  setTimeout(() => {
    URL.revokeObjectURL(saveLink.href);
    document.getElementById("saveMessage").innerText = `Saved to downloads folder as ${savedFileName}`;
  }, 6000);
}

// Listeners
document.getElementById("createAndRecord").addEventListener("click", handleCreateAndRecord);
document.getElementById("saveCompositions").addEventListener("click", handleSavePalette);

