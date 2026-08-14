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

import { changeEncodingContents } from "../state/GlobalData";
import {
  ActionSearchGloss, SEARCH_FIELD_LABEL, SUBMIT_LABEL, CLEAR_LABEL,
  LABEL_FIELD_LABEL, ADD_LABEL, CLOSE_LABEL, NO_SELECTION_STATUS, MAX_RESULTS
} from "./ActionSearchGloss";
import { mockedAnnounceIfEnabled, mockedSpeak } from "../testUtils/SpeechUtilsMock";

vi.mock("../utils/SpeechUtils");

/**
 * Render the dialog body and run a search for `term`, returning the search input.
 * "fish" is used throughout because it reliably matches several symbols in the
 * shipped Bliss vocabulary.
 * Several tests index results positionally, so the term must match at least two symbols.
 */
const searchFor = async (user: ReturnType<typeof userEvent.setup>, term: string) => {
  const searchInput = screen.getByRole("textbox", { name: SEARCH_FIELD_LABEL });
  await user.type(searchInput, term);
  await user.click(screen.getByRole("button", { name: SUBMIT_LABEL }));
  return searchInput;
};

describe("ActionSearchGloss", () => {

  afterEach(() => {
    cleanup();
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("renders the search form and footer controls", () => {
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    expect(screen.getByRole("textbox", { name: SEARCH_FIELD_LABEL })).toHaveValue("");
    expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CLEAR_LABEL })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ADD_LABEL })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CLOSE_LABEL })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: LABEL_FIELD_LABEL })).toBeInTheDocument();
  });

  test("Add to message is unavailable until something is selected", () => {
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);
    expect(screen.getByRole("button", { name: ADD_LABEL })).toHaveAttribute("aria-disabled", "true");
  });

  test("announces how many symbols were found", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    await searchFor(user, "fish");
    expect(await screen.findByRole("status")).toHaveTextContent(/symbols found for "fish"/);
  }, 20000);

  test("announces when nothing matched", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    await searchFor(user, "zzzznotaword");
    expect(await screen.findByRole("status")).toHaveTextContent(/No symbols found for "zzzznotaword"/);
  }, 20000);

  // A term with a regular expression metacharacter used to throw inside the handler,
  // leaving the previous results on screen and the status region silent.
  test("a search term with regular expression characters is reported, not dropped", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    await searchFor(user, "zzzznotaword (");
    expect(await screen.findByRole("status")).toHaveTextContent(/No symbols found for "zzzznotaword \("/);
    expect(screen.queryAllByRole("button", { pressed: false })).toHaveLength(0);
  }, 20000);

  // Every result is a tab stop inside the dialog's focus trap.
  test("a large result set is capped and the truncation announced", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    // "to" matches several hundred glosses in the shipped vocabulary.
    await searchFor(user, "to");
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(MAX_RESULTS);
    expect(await screen.findByRole("status")).toHaveTextContent(
      new RegExp(`Showing the first ${MAX_RESULTS}`)
    );
  }, 20000);

  test("selecting a result marks it and fills the label field", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    await searchFor(user, "fish");
    const firstResult = screen.getAllByRole("button", { pressed: false })[0];
    const resultText = firstResult.textContent ?? "";
    await user.click(firstResult);

    expect(firstResult).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: ADD_LABEL })).toHaveAttribute("aria-disabled", "false");

    const labelField = screen.getByRole<HTMLInputElement>("textbox", { name: LABEL_FIELD_LABEL });
    expect(resultText).toContain(labelField.value);
  }, 20000);

  test("selecting a second result overwrites the label draft", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    await searchFor(user, "fish");
    const results = screen.getAllByRole("button", { pressed: false });
    const labelField = screen.getByRole<HTMLInputElement>("textbox", { name: LABEL_FIELD_LABEL });

    await user.click(results[0]);
    const firstDraft = labelField.value;
    await user.click(results[1]);

    expect(labelField.value).not.toEqual(firstDraft);
    expect(results[0]).toHaveAttribute("aria-pressed", "false");
    expect(results[1]).toHaveAttribute("aria-pressed", "true");
  }, 20000);

  test("Add to message inserts the symbol and announces it once", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    await searchFor(user, "fish");
    await user.click(screen.getAllByRole("button", { pressed: false })[0]);

    const labelField = screen.getByRole<HTMLInputElement>("textbox", { name: LABEL_FIELD_LABEL });
    const expectedLabel = labelField.value;

    await user.click(screen.getByRole("button", { name: ADD_LABEL }));

    expect(changeEncodingContents.value.payloads).toHaveLength(1);
    expect(changeEncodingContents.value.payloads[0].label).toEqual(expectedLabel);
    // The payload carries the identity and rendering data too, not just the label.
    expect(changeEncodingContents.value.payloads[0].userSelectedSymbolId).toEqual(expect.any(Number));
    expect(changeEncodingContents.value.payloads[0].composition).toBeDefined();
    expect(await screen.findByRole("status")).toHaveTextContent(`${expectedLabel} added to message`);
    // The status region is the only channel: device speech would talk over the screen
    // reader announcing the same add.
    expect(mockedSpeak).not.toHaveBeenCalled();
    expect(mockedAnnounceIfEnabled).not.toHaveBeenCalled();
  }, 20000);

  test("an edited label is what gets inserted", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    await searchFor(user, "fish");
    await user.click(screen.getAllByRole("button", { pressed: false })[0]);

    const labelField = screen.getByRole("textbox", { name: LABEL_FIELD_LABEL });
    await user.clear(labelField);
    await user.type(labelField, "my fish");
    await user.click(screen.getByRole("button", { name: ADD_LABEL }));

    expect(changeEncodingContents.value.payloads[0].label).toEqual("my fish");
  }, 20000);

  // Surrounding spaces would flow straight into the telegraphic message sent to the model.
  test("a searched label is trimmed before it is inserted", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    await searchFor(user, "fish");
    await user.click(screen.getAllByRole("button", { pressed: false })[0]);

    const labelField = screen.getByRole("textbox", { name: LABEL_FIELD_LABEL });
    await user.clear(labelField);
    await user.type(labelField, "  my fish  ");
    await user.click(screen.getByRole("button", { name: ADD_LABEL }));

    expect(changeEncodingContents.value.payloads[0].label).toEqual("my fish");
  }, 20000);

  // The label field can be emptied on purpose, and "... added to message" with no subject
  // reads to a screen reader as a sentence missing its noun.
  test("announces the generic message when the label was cleared", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    await searchFor(user, "fish");
    await user.click(screen.getAllByRole("button", { pressed: false })[0]);

    await user.clear(screen.getByRole("textbox", { name: LABEL_FIELD_LABEL }));
    await user.click(screen.getByRole("button", { name: ADD_LABEL }));

    expect(changeEncodingContents.value.payloads[0].label).toEqual("");
    expect(await screen.findByRole("status")).toHaveTextContent(/^Symbol added to message$/);
  }, 20000);

  // The dialog deliberately survives an add so several symbols can be added in one visit.
  test("after an add the dialog stays usable and the selection resets", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    const searchInput = await searchFor(user, "fish");
    const resultCount = screen.getAllByRole("button", { pressed: false }).length;
    await user.click(screen.getAllByRole("button", { pressed: false })[0]);
    await user.click(screen.getByRole("button", { name: ADD_LABEL }));

    // Results survive, because adding two symbols from one search is a normal sequence.
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(resultCount);
    // Selection cleared, so a slow switch release cannot add the same symbol twice.
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect(screen.getByRole("button", { name: ADD_LABEL })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole<HTMLInputElement>("textbox", { name: LABEL_FIELD_LABEL })).toHaveValue("");
    // Focus must not rest on a control that just became unavailable.
    expect(searchInput).toHaveFocus();
    expect(await screen.findByRole("status")).toHaveTextContent(/added to message/);
  }, 20000);

  test("a second search result appends rather than replacing", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    await searchFor(user, "fish");
    await user.click(screen.getAllByRole("button", { pressed: false })[0]);
    await user.click(screen.getByRole("button", { name: ADD_LABEL }));
    await user.click(screen.getAllByRole("button", { pressed: false })[1]);
    await user.click(screen.getByRole("button", { name: ADD_LABEL }));

    expect(changeEncodingContents.value.payloads).toHaveLength(2);
  }, 20000);

  test("Add to message says why while unavailable", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    await user.click(screen.getByRole("button", { name: ADD_LABEL }));

    expect(changeEncodingContents.value.payloads).toHaveLength(0);
    expect(mockedSpeak).not.toHaveBeenCalled();
    expect(mockedAnnounceIfEnabled).not.toHaveBeenCalled();
    // The button keeps focus via `aria-disabled`, so pressing it must not be silent.
    expect(await screen.findByRole("status")).toHaveTextContent(NO_SELECTION_STATUS);
  });

  test("Clear resets the search, results, and selection", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${() => {}} />`);

    const searchInput = await searchFor(user, "fish");
    await user.click(screen.getAllByRole("button", { pressed: false })[0]);
    await user.click(screen.getByRole("button", { name: CLEAR_LABEL }));

    expect(searchInput).toHaveValue("");
    expect(screen.queryAllByRole("button", { pressed: false })).toHaveLength(0);
    expect(screen.getByRole("button", { name: ADD_LABEL })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("textbox", { name: LABEL_FIELD_LABEL })).toHaveValue("");
  }, 20000);

  test("Close asks the dialog to dismiss", async () => {
    const onRequestClose = vi.fn();
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} onRequestClose=${onRequestClose} />`);

    await user.click(screen.getByRole("button", { name: CLOSE_LABEL }));
    expect(onRequestClose).toHaveBeenCalled();
  });
});
