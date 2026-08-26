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

import { VNode } from "preact";
import { html } from "htm/preact";
import { BlissSymbolCellType } from "../index.d";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { BlissSymbol } from "../components/BlissSymbol";
import { announceIfEnabled } from "../utils/SpeechUtils";
import "./ActionBranchToPaletteCell.scss";

type ActionBranchToPalettePropsType = {
  id: string,
  options: BlissSymbolCellType
};

/*
 * Event handler for an ActionBranchToPaletteCell button/cell that, when clicked,
 * makes the palette referenced by this cell the current one.
 */
const navigateToPalette = async (event: Event): Promise<void> => {
  const { paletteStore, navigationStack } = adaptivePaletteGlobals;
  const button = event.currentTarget as HTMLElement;
  announceIfEnabled(button.innerText);

  const branchToPaletteName = button.getAttribute("data-branchto");
  if (!branchToPaletteName) {
    console.error(`navigateToPalette(): Missing routing attribute (data-branchto) for ${button.id}`);
    return;
  }

  // Already looking at it. A persistent cell such as the command bar's "Msg Style" stays
  // tappable once its palette is current, and pushing that palette onto itself would leave
  // the first `Back` press doing nothing.
  if (navigationStack.currentPalette?.name === branchToPaletteName) {
    return;
  }

  const paletteDefinition = await paletteStore.getNamedPalette(branchToPaletteName, true);
  if (!paletteDefinition) {
    console.error(`navigateToPalette(): Unable to locate palette definition for ${branchToPaletteName}`);
    return;
  }

  // Push the palette the user is looking at, not the one this button happens to sit in:
  // for cells in the main display area these are the same palette.
  navigationStack.push(navigationStack.currentPalette);
  navigationStack.currentPalette = paletteDefinition;
};

/**
 * A cell that makes the palette it names the current one.
 * @param {ActionBranchToPalettePropsType} props - The cell id and its palette options.
 * @returns {VNode}
 */
export function ActionBranchToPaletteCell (props: ActionBranchToPalettePropsType): VNode {
  const { columnStart, columnSpan, rowStart, rowSpan, branchTo, composition, label } = props.options;

  const gridStyles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  return html`
    <button
      id="${props.id}" class="actionBranchToPaletteCell foldedCorner" style="${gridStyles}"
      data-branchto="${branchTo}" onClick=${navigateToPalette}>
      <${BlissSymbol} composition=${composition} label=${label} />
    </button>
  `;
}
