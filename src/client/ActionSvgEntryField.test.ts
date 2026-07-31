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

import { changeEncodingContents } from "./GlobalData";
import {
  ActionSvgEntryField, SUBMIT_VALUE, CLOSE_LABEL
} from "./ActionSvgEntryField";

// `B124` satisfies the `B\d+` token in the `bstrToComposition` validator and parses to
// `[124]`, so the success path is genuinely exercised.
const VALID_BUILDER_STRING = "B124";

describe("ActionSvgEntryField component", () => {

  afterEach(() => {
    cleanup();
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("Renders input fields and footer buttons successfully", () => {
    render(html`<${ActionSvgEntryField} onRequestClose=${() => {}} />`);

    const builderInput = screen.getByLabelText(/Builder string:/i);
    expect(builderInput).toBeInTheDocument();
    expect(builderInput).toHaveValue("");

    const labelInput = screen.getByLabelText(/^Label:/i);
    expect(labelInput).toBeInTheDocument();
    expect(labelInput).toHaveValue("");

    expect(screen.getByRole("button", { name: SUBMIT_VALUE })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CLOSE_LABEL })).toBeInTheDocument();
  });

  test("Displays error message when an invalid builder string is submitted", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSvgEntryField} onRequestClose=${() => {}} />`);

    const builderInput = screen.getByLabelText(/Builder string:/i);

    await user.type(builderInput, "invalid-string");
    await user.click(screen.getByRole("button", { name: SUBMIT_VALUE }));

    expect(await screen.findByText("Invalid builder string")).toBeInTheDocument();
    expect(builderInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  // The dialog survives an add so several builder strings can be entered in one visit.
  test("stays open, resets the form, and announces after a successful add", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSvgEntryField} onRequestClose=${() => {}} />`);

    const builderInput = screen.getByLabelText(/Builder string:/i);
    const labelInput = screen.getByLabelText(/^Label:/i);

    await user.type(builderInput, VALID_BUILDER_STRING);
    await user.type(labelInput, "dog");
    await user.click(screen.getByRole("button", { name: SUBMIT_VALUE }));

    expect(changeEncodingContents.value.payloads).toHaveLength(1);
    expect(changeEncodingContents.value.payloads[0].label).toEqual("dog");
    expect(builderInput).toHaveValue("");
    expect(labelInput).toHaveValue("");
    expect(await screen.findByRole("status")).toHaveTextContent(/dog added to message/);
    expect(builderInput).toHaveFocus();
  });

  // Staying open is only useful if successive adds accumulate.
  test("a second add appends rather than replacing", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSvgEntryField} onRequestClose=${() => {}} />`);

    const builderInput = screen.getByLabelText(/Builder string:/i);

    await user.type(builderInput, VALID_BUILDER_STRING);
    await user.click(screen.getByRole("button", { name: SUBMIT_VALUE }));
    await user.type(builderInput, VALID_BUILDER_STRING);
    await user.click(screen.getByRole("button", { name: SUBMIT_VALUE }));

    expect(changeEncodingContents.value.payloads).toHaveLength(2);
  });

  // The label is optional, so the announcement falls back to a generic noun.
  test("announces generically when no label was given", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSvgEntryField} onRequestClose=${() => {}} />`);

    await user.type(screen.getByLabelText(/Builder string:/i), VALID_BUILDER_STRING);
    await user.click(screen.getByRole("button", { name: SUBMIT_VALUE }));

    expect(await screen.findByRole("status")).toHaveTextContent(/Symbol added to message/);
  });

  test("Close asks the dialog to dismiss", async () => {
    const onRequestClose = vi.fn();
    const user = userEvent.setup();
    render(html`<${ActionSvgEntryField} onRequestClose=${onRequestClose} />`);

    await user.click(screen.getByRole("button", { name: CLOSE_LABEL }));
    expect(onRequestClose).toHaveBeenCalled();
  });
});
