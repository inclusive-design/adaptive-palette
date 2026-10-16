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
import { changeEncodingContents } from "../state/GlobalData";
import { goToPalette } from "../core/PaletteNavigation";
import { BlissSymbol } from "../components/BlissSymbol";
import { announceIfEnabled, speakUnavailable } from "../utils/SpeechUtils";
import { caretComposition } from "../utils/SymbolEncodingUtils";
import type { Language } from "../i18n/I18n";
import "./ActionBranchToPaletteCell.scss";

type ActionBranchToPalettePropsType = {
  id: string,
  options: BlissSymbolCellType
};

/*
 * Event handler for an ActionBranchToPaletteCell button/cell that, when clicked,
 * makes the palette referenced by this cell the current one.
 */
const navigateToPalette = async (event: Event, language?: Language): Promise<void> => {
  const button = event.currentTarget as HTMLElement;
  announceIfEnabled(button.innerText, language);

  const branchToPaletteName = button.getAttribute("data-branchto");
  if (!branchToPaletteName) {
    console.error(`navigateToPalette(): Missing routing attribute (data-branchto) for ${button.id}`);
    return;
  }
  await goToPalette(branchToPaletteName);
};

/**
 * A cell that makes the palette it names the current one.
 * @param {ActionBranchToPalettePropsType} props - The cell id and its palette options.
 * @returns {VNode}
 */
export function ActionBranchToPaletteCell (props: ActionBranchToPalettePropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, branchTo, composition, picture, label, labelLanguage, needsCaretSymbol
  } = props.options;

  const gridStyles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  // Marked unavailable rather than `disabled` so the button keeps its place in the tab
  // order for switch and eye-gaze users.
  const unavailable = !!needsCaretSymbol && caretComposition(changeEncodingContents.value) === undefined;
  const cellClicked = (event: Event) => {
    if (unavailable) { speakUnavailable(label); return; }
    void navigateToPalette(event, labelLanguage);
  };
  const className = `actionBranchToPaletteCell foldedCorner${needsCaretSymbol ? " btn-command" : ""}`;

  return html`
    <button
      id="${props.id}" class="${className}" style="${gridStyles}"
      data-branchto="${branchTo}" onClick=${cellClicked} aria-disabled=${needsCaretSymbol ? unavailable : undefined}>
      <${BlissSymbol} composition=${composition} picture=${picture} label=${label} />
    </button>
  `;
}
