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

import { render, screen, cleanup, waitFor } from "@testing-library/preact";
import { userEvent } from "vitest/browser";
import { html } from "htm/preact";

import { adaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";
import { DISABLED_MODEL_QUERY } from "./Config";
import { DISMISS_LABEL } from "./ModalDialog";
import { SEARCH_FIELD_LABEL } from "./ActionSearchGloss";
import {
  SymbolEntryToolbar, SEARCH_TRIGGER_LABEL, SVG_TRIGGER_LABEL
} from "./SymbolEntryToolbar";

// `userEvent` is the provider-backed instance from `vitest/browser`, not the one from
// `@testing-library/user-event`. These tests drive a native `<dialog>`, whose
// Escape-to-close is a UA default action that only runs for trusted events.

const originalConfig = adaptivePaletteGlobals.config;

/**
 * Point the globals at a config with the given visibility flags.
 */
const withVisibility = (searchShown: boolean, svgShown: boolean): void => {
  adaptivePaletteGlobals.config = {
    ...originalConfig,
    symbolSearch: { show: searchShown },
    svgBuilderString: { show: svgShown },
    wordPrediction: { show: false, maxSuggestions: 4, ...DISABLED_MODEL_QUERY }
  };
};

describe("SymbolEntryToolbar component", () => {

  afterEach(() => {
    cleanup();
    adaptivePaletteGlobals.config = originalConfig;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("shows both triggers when both features are enabled", () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    expect(screen.getByRole("button", { name: SEARCH_TRIGGER_LABEL })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SVG_TRIGGER_LABEL })).toBeInTheDocument();
  });

  test("shows only the search trigger when the builder string is disabled", () => {
    withVisibility(true, false);
    render(html`<${SymbolEntryToolbar} />`);

    expect(screen.getByRole("button", { name: SEARCH_TRIGGER_LABEL })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: SVG_TRIGGER_LABEL })).not.toBeInTheDocument();
  });

  test("shows only the builder-string trigger when search is disabled", () => {
    withVisibility(false, true);
    render(html`<${SymbolEntryToolbar} />`);

    expect(screen.queryByRole("button", { name: SEARCH_TRIGGER_LABEL })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: SVG_TRIGGER_LABEL })).toBeInTheDocument();
  });

  // Rendering nothing keeps the row from leaving an empty gap above the input area.
  test("renders nothing when both features are disabled", () => {
    withVisibility(false, false);
    const { container } = render(html`<${SymbolEntryToolbar} />`);

    expect(container).toBeEmptyDOMElement();
  });

  test("the search trigger declares that it opens a dialog", () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    expect(screen.getByRole("button", { name: SEARCH_TRIGGER_LABEL }))
      .toHaveAttribute("aria-haspopup", "dialog");
  });

  test("clicking the search trigger opens its dialog", async () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    await userEvent.click(screen.getByRole("button", { name: SEARCH_TRIGGER_LABEL }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: SEARCH_TRIGGER_LABEL })).toBeVisible();
    });
  });

  test("clicking the builder-string trigger opens its dialog", async () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    await userEvent.click(screen.getByRole("button", { name: SVG_TRIGGER_LABEL }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: SVG_TRIGGER_LABEL })).toBeVisible();
    });
  });

  test("opening the search dialog puts focus in the search field", async () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    await userEvent.click(screen.getByRole("button", { name: SEARCH_TRIGGER_LABEL }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: SEARCH_FIELD_LABEL })).toHaveFocus();
    });
    expect(screen.getByRole("button", { name: DISMISS_LABEL })).not.toHaveFocus();
  });

  // Native `<dialog>` restores focus to the opener; this guards that the wiring keeps it.
  test("closing returns focus to the trigger that opened the dialog", async () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    const trigger = screen.getByRole("button", { name: SEARCH_TRIGGER_LABEL });
    await userEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: SEARCH_TRIGGER_LABEL })).toBeVisible();
    });

    await userEvent.keyboard("{Escape}");

    // `queryByRole` ignores hidden elements, so a closed dialog drops out of the query
    // even though the element itself is still in the DOM. Awaited because the dialog's
    // `close` event is queued as a browser task.
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: SEARCH_TRIGGER_LABEL })).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  // The body is mounted only while open, so a reopened dialog starts from a clean form.
  test("the dialog body is not mounted while the dialog is closed", () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
