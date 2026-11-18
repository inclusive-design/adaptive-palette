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
import { render, screen } from "@testing-library/preact";
import { fireEvent } from "@testing-library/dom";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { expectCellRendered } from "../testUtils/CellTestUtils";
import { mockedSpeakUnavailable } from "../testUtils/SpeechUtilsMock";
import { CommandButton } from "./CommandButton";

vi.mock("../utils/SpeechUtils");

describe("CommandButton", (): void => {
  const TEST_ID = "command-button";
  const options = {
    "label": "Back",
    "composition": 392,
    "rowStart": 1,
    "rowSpan": 1,
    "columnStart": 3,
    "columnSpan": 2
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("renders a command button at its grid position", async (): Promise<void> => {
    const onClick = vi.fn();
    render(html`<${CommandButton} id=${TEST_ID} options=${options} ariaControls="area" onClick=${onClick} />`);

    const button = await expectCellRendered(TEST_ID, options, "btn-command");
    expect(button).toHaveAttribute("aria-controls", "area");
    expect(button).not.toHaveAttribute("aria-disabled");
  });

  test("a click runs the handler", async (): Promise<void> => {
    const onClick = vi.fn();
    render(html`<${CommandButton} id=${TEST_ID} options=${options} unavailable=${false} onClick=${onClick} />`);

    const button = await screen.findByRole("button", { name: options.label });
    expect(button).toHaveAttribute("aria-disabled", "false");
    expect(button).not.toHaveAttribute("aria-controls");
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(mockedSpeakUnavailable).not.toHaveBeenCalled();
  });

  test("an unavailable button speaks that and skips the handler", async (): Promise<void> => {
    const onClick = vi.fn();
    render(html`<${CommandButton} id=${TEST_ID} options=${options} unavailable=${true} onClick=${onClick} />`);

    const button = await screen.findByRole("button", { name: options.label });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
    expect(mockedSpeakUnavailable).toHaveBeenCalledWith(options.label);
  });
});
