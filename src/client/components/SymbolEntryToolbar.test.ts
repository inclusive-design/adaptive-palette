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
import { render, screen, cleanup, waitFor } from "@testing-library/preact";
import { userEvent } from "vitest/browser";
import { html } from "htm/preact";

import { adaptivePaletteGlobals, changeEncodingContents, settingsSavedCount } from "../state/GlobalData";
import { DISABLED_MODEL_QUERY } from "../core/Config";
import { isLocalHost } from "../core/OllamaApi";
import { SymbolEntryToolbar } from "./SymbolEntryToolbar";
import { en } from "../i18n/en";
import { languageSignal } from "../i18n/I18n";

// `userEvent` is the provider-backed instance from `vitest/browser`, not the one from
// `@testing-library/user-event`. These tests drive a native `<dialog>`, whose
// Escape-to-close is a UA default action that only runs for trusted events.

// Under the test runner the hostname is always `localhost`; the test for the hosted site
// says so.
vi.mock("../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../core/OllamaApi")>();
  return { ...actual, isLocalHost: vi.fn() };
});

const mockedIsLocalHost = vi.mocked(isLocalHost);
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

describe("SymbolEntryToolbar", () => {

  beforeEach(() => {
    mockedIsLocalHost.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    adaptivePaletteGlobals.config = originalConfig;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    languageSignal.value = "en";
  });

  test("draws again in the new language when the language changes", async () => {
    withVisibility(true, false);
    render(html`<${SymbolEntryToolbar} />`);

    languageSignal.value = "sv";

    expect(await screen.findAllByRole("button", { name: "Inställningar" })).not.toHaveLength(0);
  });

  test("draws again after the settings are saved", async () => {
    withVisibility(true, false);
    render(html`<${SymbolEntryToolbar} />`);
    const searchButtons = (): number => screen.queryAllByRole("button", { name: en.toolbarSearch }).length;
    expect(searchButtons()).toBeGreaterThan(0);

    withVisibility(false, false);
    settingsSavedCount.value++;

    await waitFor(() => expect(searchButtons()).toBe(0));
  });

  test("shows both triggers when both features are enabled", () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    expect(screen.getByRole("button", { name: en.toolbarSearch })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.toolbarSvg })).toBeInTheDocument();
  });

  test("shows only the search trigger when the builder string is disabled", () => {
    withVisibility(true, false);
    render(html`<${SymbolEntryToolbar} />`);

    expect(screen.getByRole("button", { name: en.toolbarSearch })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: en.toolbarSvg })).not.toBeInTheDocument();
  });

  test("shows only the builder-string trigger when search is disabled", () => {
    withVisibility(false, true);
    render(html`<${SymbolEntryToolbar} />`);

    expect(screen.queryByRole("button", { name: en.toolbarSearch })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.toolbarSvg })).toBeInTheDocument();
  });

  // The settings are how a user turns the other two back on, so this trigger has no
  // visibility flag of its own.
  test("shows the settings trigger even when both symbol-entry features are disabled", () => {
    withVisibility(false, false);
    render(html`<${SymbolEntryToolbar} />`);

    expect(screen.queryByRole("button", { name: en.toolbarSearch })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: en.toolbarSvg })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.toolbarSettings })).toBeInTheDocument();
  });

  test("clicking the settings trigger opens its dialog", async () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    await userEvent.click(screen.getByRole("button", { name: en.toolbarSettings }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: en.toolbarSettings })).toBeVisible();
    });
  });

  test("shows the About Me trigger", () => {
    withVisibility(false, false);
    render(html`<${SymbolEntryToolbar} />`);

    expect(screen.getByRole("button", { name: en.toolbarAboutMe })).toBeInTheDocument();
  });

  // About Me is only used to fill prompts, and the hosted site sends none.
  test("hides the About Me trigger on the hosted site", () => {
    mockedIsLocalHost.mockReturnValue(false);
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    expect(screen.queryByRole("button", { name: en.toolbarAboutMe })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.toolbarSettings })).toBeInTheDocument();
  });

  test("clicking the About Me trigger opens its dialog", async () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    await userEvent.click(screen.getByRole("button", { name: en.toolbarAboutMe }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: en.toolbarAboutMe })).toBeVisible();
    });
  });

  test("the search trigger declares that it opens a dialog", () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    expect(screen.getByRole("button", { name: en.toolbarSearch }))
      .toHaveAttribute("aria-haspopup", "dialog");
  });

  test("clicking the search trigger opens its dialog", async () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    await userEvent.click(screen.getByRole("button", { name: en.toolbarSearch }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: en.toolbarSearch })).toBeVisible();
    });
  });

  test("clicking the builder-string trigger opens its dialog", async () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    await userEvent.click(screen.getByRole("button", { name: en.toolbarSvg }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: en.toolbarSvg })).toBeVisible();
    });
  });

  test("opening the search dialog puts focus in the search field", async () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    await userEvent.click(screen.getByRole("button", { name: en.toolbarSearch }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: en.searchFindWord })).toHaveFocus();
    });
    expect(screen.getByRole("button", { name: en.dialogDismiss })).not.toHaveFocus();
  });

  // Native `<dialog>` restores focus to the opener; this guards that the wiring keeps it.
  test("closing returns focus to the trigger that opened the dialog", async () => {
    withVisibility(true, true);
    render(html`<${SymbolEntryToolbar} />`);

    const trigger = screen.getByRole("button", { name: en.toolbarSearch });
    await userEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: en.toolbarSearch })).toBeVisible();
    });

    await userEvent.keyboard("{Escape}");

    // `queryByRole` ignores hidden elements, so a closed dialog drops out of the query
    // even though the element itself is still in the DOM. Awaited because the dialog's
    // `close` event is queued as a browser task.
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: en.toolbarSearch })).not.toBeInTheDocument();
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
