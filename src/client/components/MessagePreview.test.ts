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

import { render, screen, cleanup } from "@testing-library/preact";
import { html } from "htm/preact";

import { changeEncodingContents } from "../state/GlobalData";
import { MessagePreview, MESSAGE_PREVIEW_LABEL } from "./MessagePreview";

describe("MessagePreview", () => {

  afterEach(() => {
    cleanup();
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("shows the symbols currently in the message", () => {
    changeEncodingContents.value = {
      payloads: [
        { label: "dog", composition: 12380 },
        { label: "water", composition: 15068 }
      ],
      caretPosition: 1
    };
    render(html`<${MessagePreview} />`);

    expect(screen.getByText("dog")).toBeInTheDocument();
    expect(screen.getByText("water")).toBeInTheDocument();
  });

  // Matched loosely because the accessible name comes from the visible label, which
  // carries a trailing colon.
  test("is labelled so assistive technology can identify it", () => {
    render(html`<${MessagePreview} />`);
    expect(screen.getByRole("group", { name: new RegExp(MESSAGE_PREVIEW_LABEL) })).toBeInTheDocument();
  });

  // The caret marks where the next added symbol lands, so it has to be visible here too.
  test("marks the symbol at the caret", () => {
    changeEncodingContents.value = {
      payloads: [
        { label: "dog", composition: 12380 },
        { label: "water", composition: 15068 }
      ],
      caretPosition: 1
    };
    const { container } = render(html`<${MessagePreview} />`);

    const caretCell = container.querySelector(".cursorCaret");
    expect(caretCell).toBeInTheDocument();
    expect(caretCell).toHaveTextContent("water");
  });

  // The assertion is async because a signal write outside `act()` schedules the
  // re-render on a microtask, so a synchronous query runs before the DOM updates.
  // `ActionIndicatorCell.test.ts` and `BlissSymbol.test.ts` await for the same reason.
  test("updates when the message signal changes", async () => {
    render(html`<${MessagePreview} />`);
    expect(screen.queryByText("dog")).not.toBeInTheDocument();

    changeEncodingContents.value = {
      payloads: [{ label: "dog", composition: 12380 }],
      caretPosition: 0
    };

    expect(await screen.findByText("dog")).toBeInTheDocument();
  });
});
