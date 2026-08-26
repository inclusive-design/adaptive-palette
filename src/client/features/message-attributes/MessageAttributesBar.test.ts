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

import { render, screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { html } from "htm/preact";
import { vi } from "vitest";

import { initAdaptivePaletteGlobals } from "../../core/InitGlobals";
import { mockedAnnounceIfEnabled } from "../../testUtils/SpeechUtilsMock";
import { selectedAttributesSignal, clearAttributes } from "./MessageAttributesState";
import { MessageAttributesBar } from "./MessageAttributesBar";

vi.mock("../../utils/SpeechUtils");

describe("MessageAttributesBar", (): void => {

  const bar = (): HTMLElement | null => document.querySelector(".messageAttributesBar");

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach((): void => {
    clearAttributes();
  });

  test("renders nothing when no attribute is set", (): void => {
    render(html`<${MessageAttributesBar} />`);

    expect(bar()).toBeNull();
  });

  test("renders one chip per attribute", async (): Promise<void> => {
    selectedAttributesSignal.value = [
      { category: "Intent", label: "question", composition: 553 },
      { category: "Priority", label: "urgent", composition: 4310 }
    ];

    render(html`<${MessageAttributesBar} />`);

    expect(bar()).toBeVisible();
    expect(await screen.findByRole("button", { name: "Remove Intent: question" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Remove Priority: urgent" })).toBeVisible();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  test("clicking a chip removes its attribute and leaves the others", async (): Promise<void> => {
    selectedAttributesSignal.value = [
      { category: "Intent", label: "question", composition: 553 },
      { category: "Priority", label: "urgent", composition: 4310 }
    ];

    render(html`<${MessageAttributesBar} />`);
    await userEvent.click(await screen.findByRole("button", { name: "Remove Intent: question" }));

    expect(selectedAttributesSignal.value)
      .toEqual([{ category: "Priority", label: "urgent", composition: 4310 }]);
    expect(screen.queryByRole("button", { name: "Remove Intent: question" })).toBeNull();
    expect(await screen.findByRole("button", { name: "Remove Priority: urgent" })).toBeVisible();
    expect(mockedAnnounceIfEnabled).toHaveBeenLastCalledWith("Intent: question, off");
  });

  test("removing the last attribute takes the bar away", async (): Promise<void> => {
    selectedAttributesSignal.value = [
      { category: "Priority", label: "urgent", composition: 4310 }
    ];

    render(html`<${MessageAttributesBar} />`);
    await userEvent.click(await screen.findByRole("button", { name: "Remove Priority: urgent" }));

    expect(bar()).toBeNull();
    expect(mockedAnnounceIfEnabled).toHaveBeenLastCalledWith("Priority: urgent, off");
    // No sibling survives, so focus falls back to the document -- see the `ponytail:` comment
    // in MessageAttributesBar.ts.
    expect(document.activeElement).toBe(document.body);
  });

  test("the bar appears when the first attribute is set", async (): Promise<void> => {
    // Guards the subscribe-before-early-return ordering: reading the signal happens before the
    // `attributes.length === 0` check returns, so setting the first attribute after an empty
    // render still re-renders the bar rather than leaving it permanently absent.
    render(html`<${MessageAttributesBar} />`);
    expect(bar()).toBeNull();

    selectedAttributesSignal.value = [{ category: "Feeling", label: "angry", composition: 1198 }];

    expect(await screen.findByRole("button", { name: "Remove Feeling: angry" })).toBeVisible();
  });

  test("removing the middle chip of three leaves the other two correct and independently clickable", async (): Promise<void> => {
    // Amendment C: each chip carries a `key` of its own category/label, so removing one out of
    // the middle does not leave a stale symbol or a stale click handler on the chips that
    // shift index. This guards that behaviour.
    selectedAttributesSignal.value = [
      { category: "Intent", label: "question", composition: 553 },
      { category: "Feeling", label: "angry", composition: 1198 },
      { category: "Priority", label: "urgent", composition: 4310 }
    ];

    render(html`<${MessageAttributesBar} />`);
    await userEvent.click(await screen.findByRole("button", { name: "Remove Feeling: angry" }));

    expect(selectedAttributesSignal.value).toEqual([
      { category: "Intent", label: "question", composition: 553 },
      { category: "Priority", label: "urgent", composition: 4310 }
    ]);
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(mockedAnnounceIfEnabled).toHaveBeenLastCalledWith("Feeling: angry, off");

    // The remaining chip that shifted index (Priority, now second) must still carry its own
    // symbol and its own click handler, not the removed chip's.
    const priorityChip = await screen.findByRole("button", { name: "Remove Priority: urgent" });
    await userEvent.click(priorityChip);
    expect(selectedAttributesSignal.value)
      .toEqual([{ category: "Intent", label: "question", composition: 553 }]);
    expect(await screen.findByRole("button", { name: "Remove Intent: question" })).toBeVisible();
    expect(mockedAnnounceIfEnabled).toHaveBeenLastCalledWith("Priority: urgent, off");
  });

  test("clicking a middle chip moves focus to the surviving next sibling", async (): Promise<void> => {
    // The mechanism Fix 1 depends on: a surviving sibling, captured before the toggle, is
    // still the same live DOM node afterwards because the chips are keyed. Without that,
    // focus would fall to document.body on every removal, not just the last-chip case
    // covered by "removing the last attribute takes the bar away".
    selectedAttributesSignal.value = [
      { category: "Intent", label: "question", composition: 553 },
      { category: "Feeling", label: "angry", composition: 1198 },
      { category: "Priority", label: "urgent", composition: 4310 }
    ];

    render(html`<${MessageAttributesBar} />`);
    await userEvent.click(await screen.findByRole("button", { name: "Remove Feeling: angry" }));

    expect(await screen.findByRole("button", { name: "Remove Priority: urgent" }))
      .toBe(document.activeElement);
  });
});
