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

import { initAdaptivePaletteGlobals } from "../../src/client/GlobalData";
import { getSvgElement } from "../../src/client/SvgUtils";

// Initialize any globals used elsewhere in the code.
await initAdaptivePaletteGlobals("mainPaletteDisplayArea");

const encodingInputElement = document.getElementById("bciAvIdType");
const displayElement = document.getElementById("display");
const undefinedSpanEl = document.createElement("span");
undefinedSpanEl.innerText = "One or more BCI-AV-IDs are not valid";

/**
 * Given the encoding string for a Bliss character or word, get the SVG markup
 * for it, and then add it to the preview area.  Note that the encoding string
 * is either a single BCi-AV identifier or a space separated sequence of BCi-AV
 * identifier and "/" or ";"
 */
function getAndDisplayBliss () {
  const inputString = encodingInputElement.value;
  let blissSvgEl;

  displayElement.innerText = "";    // clear the display area
  if (inputString.trim() === "") {
    displayElement.innerText = "Please input an encoding";
  }
  else {
    const encodingArray = inputString
      .replace(/["']/g,"")    // remove all quotation marks
      .replace(/\s\s+/g, " ") // reduce all whitespace to a single space
      .split(" ");            // create an array of strings
    // Loop to remove any trailing commas from a string in the array, and to
    // convert all the number strings into integers, e.g., "5" => 5.
    // Regarding `parseInt()/isNaN()`: any item that is a number or number-like
    // is not `NaN`, but punctuation is.  For example, the string "5" and the
    // number 5 both parse to a numeric value, but "/" is parsed to `NaN`.
    encodingArray.forEach( (item, index, array) => {
      item = item.replace(/,+$/, "");   // remove any trailing commas
      const value = parseInt(item);
      if (isNaN(value)) {
        array[index] = item;
      }
      else {
        array[index] = value;
      }
    });
    console.debug(encodingArray);
    blissSvgEl = getSvgElement(encodingArray) || undefinedSpanEl;

    // If the `displayElement` has a child from a previous run, replace it with
    // the latest result, otherwise add a new child.
    const childToReplace = displayElement.children[0];
    if (childToReplace) {
      displayElement.replaceChild(blissSvgEl, childToReplace);
    }
    else {
      displayElement.appendChild(blissSvgEl);
    }
  }
}

document.getElementById("preview").addEventListener("click", getAndDisplayBliss);
