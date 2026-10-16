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

import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { html } from "htm/preact";
import { vi } from "vitest";

import { initAdaptivePaletteGlobals } from "../../core/InitGlobals";
import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { mockedAnnounceIfEnabled } from "../../testUtils/SpeechUtilsMock";
import { selectedAttributesSignal, clearAttributes } from "./MessageAttributesState";
import { MessageAttributesBar } from "./MessageAttributesBar";

vi.mock("../../utils/SpeechUtils");

describe("MessageAttributesBar", (): void => {

  const bar = (): HTMLElement | null => document.querySelector(".messageAttributesBar");

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  afterEach((): void => {
    adaptivePaletteGlobals.navigationStack.flushReset(null);
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
    // No sibling survives, so focus falls back to the document.
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

  // Six attributes, each in a category of its own, so each chip has its own key.
  const sixAttributes = Array.from({ length: 6 }, (unused, index) => ({
    category: `Category${index}`, label: `label${index}`, composition: 553
  }));

  // The bar in a box `width` wide. A chip is 4rem (64px here) with a 0.25rem gap, so 300px holds 4.
  const renderInWidth = (width: number) =>
    render(html`<div style="width: ${width}px"><${MessageAttributesBar} /></div>`);

  test("draws the chips that fit, then +N naming the rest", async (): Promise<void> => {
    selectedAttributesSignal.value = sixAttributes;
    renderInWidth(300);

    const more = await screen.findByRole("button", {
      name: "+3 more: Category3: label3, Category4: label4, Category5: label5"
    });
    expect(more.textContent?.trim()).toBe("+3");
    expect(screen.getAllByRole("button", { name: /^Remove / })).toHaveLength(3);
  });

  test("counts again when the bar's width changes", async (): Promise<void> => {
    selectedAttributesSignal.value = sixAttributes;
    const { container } = renderInWidth(300);
    await screen.findByRole("button", { name: /^\+3 more/ });

    (container.firstElementChild as HTMLElement).style.width = "600px";

    await waitFor(() => expect(screen.queryByRole("button", { name: /more:/ })).toBeNull());
    expect(screen.getAllByRole("button", { name: /^Remove / })).toHaveLength(6);
  });

  test("+N opens the attributes palette, as Msg Style does", async (): Promise<void> => {
    const { paletteStore, navigationStack } = adaptivePaletteGlobals;
    await paletteStore.loadPaletteSet("/palette-sets/standardBlissChart/palette_set.json");
    const start = { name: "Start", cells: {} };
    navigationStack.flushReset(start);
    selectedAttributesSignal.value = sixAttributes;
    renderInWidth(300);

    await userEvent.click(await screen.findByRole("button", { name: /^\+3 more/ }));

    await waitFor(() => expect(navigationStack.currentPalette?.name).toBe("attributes"));
    expect(navigationStack.peek()).toBe(start);
  });
});
