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


import type { VNode } from "preact";
import { html } from "htm/preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import type { LayoutInfoType, PictureOrSymbolInfoType } from "../../index.d";
import { CommandButton } from "../../components/CommandButton";
import { wordBuildSignal } from "../../state/GlobalData";
import { inputAreaElement } from "../../utils/TextEntryUtils";
import { announceIfEnabled } from "../../utils/SpeechUtils";
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
  space: { run: insertSpace },
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
  const { label, labelLanguage, action } = options;
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Compose new word and Cancel swap the controls, taking away the button just pressed. Focus
  // goes to the input area, where the word is, rather than falling to the page. A layout effect,
  // so the cleanup runs while the button is still in the page.
  useLayoutEffect(() => () => {
    if (buttonRef.current && document.activeElement === buttonRef.current) {
      inputAreaElement()?.focus();
    }
  }, []);
  // `hasOwn`, so a name such as "toString" inherited from Object is not taken for an action.
  if (!Object.hasOwn(ACTIONS, action)) {
    console.error(`CommandComposeWord "${id}": unknown action "${action}".`);
    return null;
  }
  const entry = ACTIONS[action];
  // Left undefined for an action that is never unavailable, so the button has no `aria-disabled`.
  const unavailable = entry.unavailable?.();

  const cellClicked = (): void => {
    entry.run();
    announceIfEnabled(label, labelLanguage);
  };

  return html`
    <${CommandButton}
      ref=${buttonRef} id=${id} options=${options} unavailable=${unavailable}
      aria-pressed=${action === "combine" ? !!wordBuildSignal.value?.combine : undefined}
      onClick=${cellClicked} />
  `;
}
