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
import { isWordSaved, saveWord } from "../../core/SavedWords";
import { hasPendingLabel, whenLabelsSettled } from "../../utils/SymbolLabelUtils";
import { glossFor } from "../../utils/SvgUtils";
import { AUTO_COMMA_PART, COMMA_PART, SPACE_PART, insertWordAtCaret } from "../../utils/SymbolEncodingUtils";
import { languageSignal } from "../../i18n/I18n";
import {
  addAutoCommas, defaultName, findExistingWord, firstGloss, isSymbolWord, removeAutoCommas, splitPart, wordComposition
} from "./ComposeWordUtils";
import { canSuggestNames, requestNameSuggestions } from "./WordNamingUtils";

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
 * The model's names for the word in the dialog: `idle` when none are asked for (no model, or the word
 * is already in the vocabulary), `working` while they are, then `done`.
 */
export type NameSuggestionsType = { status: "idle" } | { status: "working" } | { status: "done", names: string[] };

export const nameSuggestionsSignal = signal<NameSuggestionsType>({ status: "idle" });

// Stops the request for names when the dialog closes before the answer comes.
let nameRequest: AbortController | null = null;

/**
 * Ask the model for names for the word in the dialog that just opened.
 * @param {WordDialogType} dialog - The dialog.
 * @returns {void}
 */
function askForNames (dialog: WordDialogType): void {
  const controller = new AbortController();
  nameRequest = controller;
  nameSuggestionsSignal.value = { status: "working" };
  // An answer that lands after its dialog closed is dropped, so it is not offered in the next one.
  const settle = (names: string[]): void => {
    if (wordDialogSignal.peek() === dialog) {
      nameSuggestionsSignal.value = { status: "done", names };
    }
  };
  requestNameSuggestions(dialog.partLabels, dialog.offeredName, controller.signal)
    .then(settle)
    .catch((error: unknown) => {
      if (!controller.signal.aborted) {
        console.error(`Could not suggest names: ${String(error)}`);
        settle([]);
      }
    });
}

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
  closeWordDialog();
  const { payloads, caretPosition } = build.message;
  editMessage(insertWordAtCaret(word, payloads, caretPosition), () => {
    wordBuildSignal.value = null;
  });
}

/**
 * Turn the combine marker on or off. On puts an auto comma between every two neighbouring words; off
 * removes every auto comma. The user's own commas and spaces stay.
 * @param {boolean} on - Whether the marker is to be on.
 * @returns {void}
 */
export function setCombine (on: boolean): void {
  const build = wordBuildSignal.peek();
  if (!build) {
    return;
  }
  const message = changeEncodingContents.peek();
  editMessage(on ? addAutoCommas(message) : removeAutoCommas(message), () => {
    wordBuildSignal.value = { ...build, combine: on };
  });
}

/**
 * Space: add a space after the caret.
 * @returns {void}
 */
export function insertSpace (): void {
  insertWord(SPACE_PART);
}

/**
 * Comma: add a comma after the caret.
 * @returns {void}
 */
export function insertComma (): void {
  insertWord(COMMA_PART);
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
 * Inside the combine markers, a comma goes between the characters.
 * @returns {void}
 */
export function splitAtCaret (): void {
  const { payloads, caretPosition } = changeEncodingContents.peek();
  const part = payloads[caretPosition];
  if (!part) {
    return;
  }
  const characters = splitPart(part, languageSignal.peek());
  const parts = wordBuildSignal.peek()?.combine
    ? characters.flatMap((character, i) => (i === 0 ? [character] : [AUTO_COMMA_PART, character]))
    : characters;
  editMessage({
    payloads: [...payloads.slice(0, caretPosition), ...parts, ...payloads.slice(caretPosition + 1)],
    caretPosition: caretPosition + parts.length - 1
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
 * happens while the word has no symbol in it. Waits first for any part's label still being
 * worked out.
 * @returns {void}
 */
export function requestFinish (): void {
  // The name is offered from the parts' labels, so wait for "hot" rather than "opposite of cold".
  if (hasPendingLabel(changeEncodingContents.peek().payloads)) {
    whenLabelsSettled(requestFinish);
    return;
  }
  const build = wordBuildSignal.peek();
  const parts = changeEncodingContents.peek().payloads;
  const composition = build ? wordComposition(parts, build.combine) : [];
  if (composition.length === 0) {
    return;
  }
  const entry = findExistingWord(composition);
  const dialog: WordDialogType = {
    composition,
    offeredName: defaultName(parts),
    partLabels: parts.filter(isSymbolWord).map((part) => part.label),
    ...(entry && {
      match: {
        id: entry.id,
        label: firstGloss(glossFor(entry, languageSignal.peek())),
        composition: entry.composition ?? entry.id
      }
    })
  };
  // A second Done queued while a label was pending lands here too: stop the first request.
  nameRequest?.abort();
  nameSuggestionsSignal.value = { status: "idle" };
  wordDialogSignal.value = dialog;
  // Ask the model for names once, as the dialog opens. Not for a word already in the vocabulary.
  if (!dialog.match && canSuggestNames()) {
    askForNames(dialog);
  }
}

/**
 * Close the dialog: Back to word, Escape, or after a name is chosen. Stops the request for names, so
 * going back and pressing Done again never queues another behind it.
 * @returns {void}
 */
export function closeWordDialog (): void {
  nameRequest?.abort();
  nameRequest = null;
  wordDialogSignal.value = null;
}

/**
 * Name the new word and put it in the message. An empty name is refused.
 * @param {string} name - The name.
 * @param {boolean} isAiLabel - Whether a model suggested the name.
 * @returns {void}
 */
export function chooseName (name: string, isAiLabel = false): void {
  const dialog = wordDialogSignal.peek();
  if (dialog && name.trim() !== "") {
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
 * Where Save new word would save the word at the caret, or `undefined` when it cannot: the word
 * was not built with Compose new word, the palette on screen is not in the set, or the word is
 * saved to it already. Reads `.value`, so a cell that calls it while drawing draws again when
 * any of these change.
 * @returns {Parameters<typeof saveWord> | undefined} - The arguments for `saveWord()`.
 */
function saveTarget (): Parameters<typeof saveWord> | undefined {
  const { payloads, caretPosition } = changeEncodingContents.value;
  const word = payloads[caretPosition];
  const palette = adaptivePaletteGlobals.navigationStack.currentPalette;
  // A palette is stored under its name in the set, which may differ from its `name`.
  const paletteName = Object.keys(PaletteStore.paletteMap).find((name) => PaletteStore.paletteMap[name] === palette);
  const paletteSet = PaletteStore.setFolder;
  if (!word?.isComposedWord || word.composition === undefined || !palette || !paletteName || !paletteSet ||
    isWordSaved(paletteName, paletteSet, word.label, word.composition)) {
    return undefined;
  }
  return [palette, paletteName, paletteSet, word.label, word.composition];
}

/**
 * Whether Save new word can save the word at the caret. Reads `.value`, as above.
 * @returns {boolean}
 */
export function canSaveAtCaret (): boolean {
  return saveTarget() !== undefined;
}

/**
 * Save new word: add the word at the caret to the end of the palette on screen.
 * @returns {void}
 */
export function saveWordAtCaret (): void {
  const target = saveTarget();
  if (target) {
    saveWord(...target);
  }
}
