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

import { vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { html } from "htm/preact";
import type { JsonPaletteType } from "../../index.d";
import { initAdaptivePaletteGlobals } from "../../core/InitGlobals";
import { insertWord } from "../../core/MessageEdit";
import { PaletteStore } from "../../core/PaletteStore";
import { MemoryStorage } from "../../core/MemoryStorage";
import { setStorage } from "../../core/StorageBackend";
import { adaptivePaletteGlobals, changeEncodingContents, wordBuildSignal } from "../../state/GlobalData";
import { renderCell } from "../../testUtils/CellTestUtils";
import { Palette } from "../../components/Palette";
import { INPUT_AREA_ID } from "../../cells/ContentEncoding";
import { mockedSpeakUnavailable } from "../../testUtils/SpeechUtilsMock";
import { CommandComposeWord, type ComposeActionType } from "./CommandComposeWord";
import { startBuilding, wordDialogSignal } from "./ComposeWordState";

vi.mock("../../utils/SpeechUtils");

describe("CommandComposeWord", (): void => {

  const renderAction = (action: string, label: string): void => {
    renderCell(CommandComposeWord, `compose-${action}`, {
      label, action: action as ComposeActionType, rowStart: 1, rowSpan: 1, columnStart: 1, columnSpan: 1
    });
  };
  const cat = { label: "cat", composition: 126, modifierInfo: [] };
  let setFolder: string | undefined;
  let currentPalette: JsonPaletteType | null;

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
    setFolder = PaletteStore.setFolder;
    currentPalette = adaptivePaletteGlobals.navigationStack.currentPalette;
  });

  beforeEach((): void => {
    wordBuildSignal.value = null;
    wordDialogSignal.value = null;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  afterEach((): void => {
    wordBuildSignal.value = null;
    delete PaletteStore.paletteMap["Saving"];
    PaletteStore.setFolder = setFolder;
    adaptivePaletteGlobals.navigationStack.currentPalette = currentPalette;
  });

  test("Compose new word starts a word", async (): Promise<void> => {
    renderAction("new", "Compose new word");
    fireEvent.click(await screen.findByRole("button", { name: "Compose new word" }));
    expect(wordBuildSignal.value).not.toBeNull();
  });

  test("Compose new word, taken away as the word starts, leaves the focus on the input area", async (): Promise<void> => {
    const options = { label: "Compose new word", action: "new", buildingWord: false, rowStart: 1, rowSpan: 1, columnStart: 1, columnSpan: 1 };
    const bar: JsonPaletteType = { name: "Bar", cells: { "compose-new": { type: "CommandComposeWord", options } } };
    render(html`<div id=${INPUT_AREA_ID} tabindex="0"></div><${Palette} json=${bar} />`);
    const button = await screen.findByRole("button", { name: "Compose new word" });
    button.focus();

    fireEvent.click(button);

    await waitFor(() => expect(screen.queryByRole("button", { name: "Compose new word" })).toBeNull());
    expect(document.activeElement?.id).toBe(INPUT_AREA_ID);
  });

  test("Space is available without the combine marker", async (): Promise<void> => {
    startBuilding();
    renderAction("space", "Space");
    const button = await screen.findByRole("button", { name: "Space" });
    expect(button).not.toHaveAttribute("aria-disabled");
  });

  test("an unavailable action says so instead of running", async (): Promise<void> => {
    startBuilding();
    renderAction("done", "Done");
    const button = await screen.findByRole("button", { name: "Done" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(mockedSpeakUnavailable).toHaveBeenCalledWith("Done");
    expect(wordDialogSignal.value).toBeNull();
  });

  test("Combine marker shows whether the marker is on", async (): Promise<void> => {
    startBuilding();
    renderAction("combine", "Combine marker");
    const button = await screen.findByRole("button", { name: "Combine marker" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);

    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
    expect(wordBuildSignal.value?.combine).toBe(true);
  });

  test("Split is unavailable on a single character", async (): Promise<void> => {
    startBuilding();
    insertWord(cat);
    renderAction("split", "Split");
    expect(await screen.findByRole("button", { name: "Split" })).toHaveAttribute("aria-disabled", "true");
  });

  test("Done is unavailable while the word is empty, and opens the dialog once it is not", async (): Promise<void> => {
    startBuilding();
    renderAction("done", "Done");
    const button = await screen.findByRole("button", { name: "Done" });
    expect(button).toHaveAttribute("aria-disabled", "true");

    insertWord(cat);
    await waitFor(() => expect(button).toHaveAttribute("aria-disabled", "false"));
    fireEvent.click(button);

    expect(wordDialogSignal.value?.offeredName).toBe("cat");
  });

  test("an unknown action draws nothing and logs an error", (): void => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderAction("fly", "Fly");
    expect(screen.queryByRole("button", { name: "Fly" })).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    renderAction("toString", "To string");
    expect(screen.queryByRole("button", { name: "To string" })).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });

  test("Save new word adds the word at the caret to the palette on screen", async (): Promise<void> => {
    setStorage(new MemoryStorage());
    const palette: JsonPaletteType = {
      name: "Saving",
      cells: {
        first: {
          type: "ActionCodeCell",
          options: { label: "first", composition: 126, rowStart: 1, rowSpan: 1, columnStart: 1, columnSpan: 1 }
        }
      }
    };
    PaletteStore.paletteMap["Saving"] = palette;
    PaletteStore.setFolder = "/sets/";
    adaptivePaletteGlobals.navigationStack.currentPalette = palette;
    changeEncodingContents.value = {
      payloads: [{ label: "female teacher", composition: [710, "/", 949, "/", 412], modifierInfo: [], isComposedWord: true }],
      caretPosition: 0
    };
    renderAction("save", "Save new word");
    const button = await screen.findByRole("button", { name: "Save new word" });

    fireEvent.click(button);

    expect(Object.values(palette.cells).map((one) => (one.options as { label: string }).label))
      .toEqual(["first", "female teacher"]);
    // Saved once, it cannot be saved there again.
    await waitFor(() => expect(button).toHaveAttribute("aria-disabled", "true"));
  });

  test("Save new word is unavailable on a word not built with Compose new word", async (): Promise<void> => {
    changeEncodingContents.value = { payloads: [cat], caretPosition: 0 };
    renderAction("save", "Save new word");
    expect(await screen.findByRole("button", { name: "Save new word" })).toHaveAttribute("aria-disabled", "true");
  });
});
