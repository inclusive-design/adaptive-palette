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
import { render, screen, cleanup } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { html } from "htm/preact";

import { adaptivePaletteGlobals, changeEncodingContents, finishedMessageSignal } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { MESSAGE_LOG_KEY, readMessageLog } from "../core/MessageLog";
import { ActionSpeakCell } from "./ActionSpeakCell";
import { mockedSpeak } from "../testUtils/SpeechUtilsMock";

vi.mock("../utils/SpeechUtils");

describe("ActionSpeakCell", (): void => {

  const CELL_OPTIONS = {
    label: "Speak",
    composition: 2325,
    rowStart: 1,
    rowSpan: 1,
    columnStart: 15,
    columnSpan: 1,
    ariaControls: "content-encoding-area"
  };

  const renderCell = () => render(
    html`<${ActionSpeakCell} id="action-speak" options=${CELL_OPTIONS} />`
  );

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach((): void => {
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    adaptivePaletteGlobals.config.maxStoredRecords = 100;
    finishedMessageSignal.value = "";
    changeEncodingContents.value = {
      payloads: [
        { label: "I", composition: 1840, modifierInfo: [] },
        { label: "want", composition: 4765, modifierInfo: [] }
      ],
      caretPosition: 1
    };
  });

  afterEach((): void => {
    cleanup();
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("speaks the message and records it", async (): Promise<void> => {
    const user = userEvent.setup();
    renderCell();

    await user.click(screen.getByRole("button"));
    expect(mockedSpeak).toHaveBeenCalledWith("I want");

    const log = readMessageLog();
    expect(log).toHaveLength(1);
    expect(log[0].payloads.map((payload) => payload.label)).toEqual(["I", "want"]);
  });

  test("marks the spoken message as finished", async (): Promise<void> => {
    const user = userEvent.setup();
    renderCell();

    await user.click(screen.getByRole("button"));
    expect(finishedMessageSignal.value).toBe("I want");
  });

  test("leaves the message in place after speaking", async (): Promise<void> => {
    const user = userEvent.setup();
    renderCell();

    await user.click(screen.getByRole("button"));
    expect(changeEncodingContents.value.payloads).toHaveLength(2);
  });

  test("an empty message makes the cell unavailable, without recording anything", async (): Promise<void> => {
    const user = userEvent.setup();
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    renderCell();

    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-disabled")).toBe("true");

    await user.click(button);
    expect(window.localStorage.getItem(MESSAGE_LOG_KEY)).toBeNull();
  });
});
