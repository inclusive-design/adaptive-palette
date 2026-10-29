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
/**
 * Building a word with Compose new word, and the dialog after Done.
 *
 * While a word is built, `changeEncodingContents` holds its parts, so the commands that edit the
 * message (Backward, Forward, Delete, the modifiers) edit the word, and every cell that adds a
 * word adds a part. The message waits in `wordBuildSignal` until Done or Cancel. Each change goes
 * through `editMessage()`, and the build state changes only once the edit is published.
 */
import { signal } from "@preact/signals";
import type { SymbolCompositionType, SymbolEncodingType } from "../../index.d";
import { adaptivePaletteGlobals, changeEncodingContents, wordBuildSignal } from "../../state/GlobalData";
import { editMessage, insertWord } from "../../core/MessageEdit";
import { PaletteStore } from "../../core/PaletteStore";
import { saveWord } from "../../core/SavedWords";
import { glossFor } from "../../utils/SvgUtils";
import { COMMA_ID, SPACE_PART, insertWordAtCaret, isWordPart } from "../../utils/SymbolEncodingUtils";
import { languageSignal } from "../../i18n/I18n";
import { defaultName, findExistingWord, firstGloss, splitPart, wordComposition } from "./ComposeWordUtils";

/**
 * What the dialog after Done shows. `match` is set when the word is already in the vocabulary.
 */
export type WordDialogType = {
  composition: (string | number)[],
  offeredName: string,
  // The words' labels, for a model to suggest names from.
  partLabels: string[],
  match?: { id: number, label: string, composition: SymbolCompositionType }
};

// The dialog after Done, or `null` while it is closed.
export const wordDialogSignal = signal<WordDialogType | null>(null);

/**
 * Start building a word at the caret. The message is set aside and the input area holds the
 * word's parts. Sentences on screen are asked about first, as for any edit.
 * @returns {void}
 */
export function startBuilding (): void {
  if (wordBuildSignal.peek()) {
    return;
  }
  const message = changeEncodingContents.peek();
  editMessage({ payloads: [], caretPosition: -1 }, () => {
    wordBuildSignal.value = { message, combine: false };
  });
}

/**
 * Cancel: drop the word and put the message back as it was.
 * @returns {void}
 */
export function cancelBuilding (): void {
  const build = wordBuildSignal.peek();
  if (build) {
    editMessage(build.message, () => {
      wordBuildSignal.value = null;
    });
  }
}

/**
 * Put the finished word into the message, after where the caret was when the word was started,
 * and stop building.
 * @param {SymbolEncodingType} word - The finished word.
 * @returns {void}
 */
function finishBuilding (word: SymbolEncodingType): void {
  const build = wordBuildSignal.peek();
  if (!build) {
    return;
  }
  wordDialogSignal.value = null;
  const { payloads, caretPosition } = build.message;
  editMessage(insertWordAtCaret(word, payloads, caretPosition), () => {
    wordBuildSignal.value = null;
  });
}

/**
 * Turn the combine marker on or off. The spaces stay either way: the user deletes them.
 * @param {boolean} on - Whether the marker is to be on.
 * @returns {void}
 */
export function setCombine (on: boolean): void {
  const build = wordBuildSignal.peek();
  if (build) {
    wordBuildSignal.value = { ...build, combine: on };
  }
}

/**
 * Space: add a space after the caret.
 * @returns {void}
 */
export function insertSpace (): void {
  insertWord(SPACE_PART);
}

/**
 * Comma: add a comma after the caret. It never brings a space with it.
 * @returns {void}
 */
export function insertComma (): void {
  insertWord({ label: ",", composition: COMMA_ID, modifierInfo: [] });
}

/**
 * Whether the part at the caret has more than one character. Reads `.value`, so a cell that
 * calls it while drawing draws again when the word changes.
 * @returns {boolean}
 */
export function canSplitAtCaret (): boolean {
  const { payloads, caretPosition } = changeEncodingContents.value;
  const part = payloads[caretPosition];
  return part !== undefined && splitPart(part, languageSignal.value).length > 1;
}

/**
 * Split: put the characters of the part at the caret in its place, with the caret on the last.
 * @returns {void}
 */
export function splitAtCaret (): void {
  const { payloads, caretPosition } = changeEncodingContents.peek();
  const part = payloads[caretPosition];
  if (!part) {
    return;
  }
  const characters = splitPart(part, languageSignal.peek());
  editMessage({
    payloads: [...payloads.slice(0, caretPosition), ...characters, ...payloads.slice(caretPosition + 1)],
    caretPosition: caretPosition + characters.length - 1
  });
}

/**
 * Whether the word has a symbol in it, so Done can finish it. Reads `.value`, as above.
 * @returns {boolean}
 */
export function hasSymbol (): boolean {
  return changeEncodingContents.value.payloads.some((part) => part.composition !== undefined);
}

/**
 * Done: open the dialog that names the word, or says it is already in the vocabulary. Nothing
 * happens while the word has no symbol in it.
 * @returns {void}
 */
export function requestFinish (): void {
  const build = wordBuildSignal.peek();
  const parts = changeEncodingContents.peek().payloads;
  const composition = build ? wordComposition(parts, build.combine) : [];
  if (composition.length === 0) {
    return;
  }
  const entry = findExistingWord(composition);
  wordDialogSignal.value = {
    composition,
    offeredName: defaultName(parts),
    partLabels: parts.filter(isWordPart).map((part) => part.label),
    ...(entry && {
      match: {
        id: entry.id,
        label: firstGloss(glossFor(entry, languageSignal.peek())),
        composition: entry.composition ?? entry.id
      }
    })
  };
}

/**
 * Back to word: close the dialog and keep building.
 * @returns {void}
 */
export function closeWordDialog (): void {
  wordDialogSignal.value = null;
}

/**
 * Name the new word and put it in the message.
 * @param {string} name - The name.
 * @param {boolean} isAiLabel - Whether a model suggested the name.
 * @returns {void}
 */
export function chooseName (name: string, isAiLabel = false): void {
  const dialog = wordDialogSignal.peek();
  if (dialog) {
    finishBuilding({
      label: name, composition: dialog.composition, modifierInfo: [], isComposedWord: true,
      ...(isAiLabel && { isAiLabel })
    });
  }
}

/**
 * Use the vocabulary word the built one turned out to be.
 * @returns {void}
 */
export function chooseMatch (): void {
  const match = wordDialogSignal.peek()?.match;
  if (match) {
    finishBuilding({
      label: match.label, composition: match.composition, userSelectedSymbolId: match.id, modifierInfo: []
    });
  }
}

/**
 * Whether the word at the caret was built with Compose new word, so it can be saved. Reads `.value`.
 * @returns {boolean}
 */
export function canSaveAtCaret (): boolean {
  const { payloads, caretPosition } = changeEncodingContents.value;
  return !!payloads[caretPosition]?.isComposedWord;
}

/**
 * Save new word: add the word at the caret to the end of the palette on screen.
 * @returns {void}
 */
export function saveWordAtCaret (): void {
  const { payloads, caretPosition } = changeEncodingContents.peek();
  const word = payloads[caretPosition];
  const palette = adaptivePaletteGlobals.navigationStack.currentPalette;
  // A palette is stored under its name in the set, which may differ from its `name`.
  const paletteName = Object.keys(PaletteStore.paletteMap).find((name) => PaletteStore.paletteMap[name] === palette);
  const paletteSet = PaletteStore.setFolder;
  if (word?.isComposedWord && word.composition !== undefined && palette && paletteName && paletteSet) {
    saveWord(palette, paletteName, paletteSet, word.label, word.composition);
  }
}
