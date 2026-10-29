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
import type { LayoutInfoType, PictureOrSymbolInfoType } from "../../index.d";
import { BlissSymbol } from "../../components/BlissSymbol";
import { wordBuildSignal } from "../../state/GlobalData";
import { generateGridStyle } from "../../utils/GridUtils";
import { announceIfEnabled, speakUnavailable } from "../../utils/SpeechUtils";
import {
  canSaveAtCaret, canSplitAtCaret, cancelBuilding, hasSymbol, insertComma, insertSpace, requestFinish,
  saveWordAtCaret, setCombine, splitAtCaret, startBuilding
} from "./ComposeWordState";

export type ComposeActionType = "new" | "split" | "combine" | "space" | "comma" | "cancel" | "done" | "save";

type CommandComposeWordProps = {
  id: string,
  options: PictureOrSymbolInfoType & LayoutInfoType & { action: ComposeActionType }
};

// What each action does, and when it is unavailable. `unavailable` is called while drawing, so the
// button greys out and back as the word changes.
const ACTIONS: Record<ComposeActionType, { run: () => void, unavailable?: () => boolean }> = {
  new: { run: startBuilding },
  split: { run: splitAtCaret, unavailable: () => !canSplitAtCaret() },
  combine: { run: () => setCombine(!wordBuildSignal.peek()?.combine) },
  space: { run: insertSpace, unavailable: () => !wordBuildSignal.value?.combine },
  comma: { run: insertComma },
  cancel: { run: cancelBuilding },
  done: { run: requestFinish, unavailable: () => !hasSymbol() },
  save: { run: saveWordAtCaret, unavailable: () => !canSaveAtCaret() }
};

/**
 * A control for building a word: Compose new word, Split, Combine marker, Space, Comma, Cancel or Done,
 * or Save new word, named by its `action` option. The palette shows the building ones only while a word is built,
 * by their `buildingWord` flag. See `docs/ComposeWords.md`.
 * @param {CommandComposeWordProps} props - The cell id and its options.
 * @returns {VNode | null} - Nothing for an action this cell does not know.
 */
export function CommandComposeWord (props: CommandComposeWordProps): VNode | null {
  const { id, options } = props;
  const { label, labelLanguage, composition, action, columnStart, columnSpan, rowStart, rowSpan } = options;
  // `hasOwn`, so a name such as "toString" inherited from Object is not taken for an action.
  if (!Object.hasOwn(ACTIONS, action)) {
    console.error(`CommandComposeWord "${id}": unknown action "${action}".`);
    return null;
  }
  const entry = ACTIONS[action];
  // Marked unavailable rather than `disabled`, so the button keeps its place in the tab order
  // for switch and eye-gaze users.
  const unavailable = entry.unavailable?.() ?? false;

  const cellClicked = (): void => {
    if (unavailable) {
      speakUnavailable(label);
      return;
    }
    entry.run();
    announceIfEnabled(label, labelLanguage);
  };

  return html`
    <button
      id=${id}
      class="btn-command"
      style=${generateGridStyle(columnStart, columnSpan, rowStart, rowSpan)}
      aria-disabled=${entry.unavailable ? unavailable : undefined}
      aria-pressed=${action === "combine" ? !!wordBuildSignal.value?.combine : undefined}
      onClick=${cellClicked}>
      <${BlissSymbol} composition=${composition} label=${label} />
    </button>
  `;
}
