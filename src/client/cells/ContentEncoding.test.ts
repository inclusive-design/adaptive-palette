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
import { vi } from "vitest";
import { html } from "htm/preact";
import { ContentEncoding, INPUT_AREA_ID, clamp, decrementCursor, incrementCursor, moveCursorToEnd, moveCursorToHome } from "./ContentEncoding";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { editMessage } from "../core/MessageEdit";
import { SymbolEncodingType } from "../index.d";
import { renderCell, testPicture } from "../testUtils/CellTestUtils";
import { adaptivePaletteGlobals, changeEncodingContents, wordBuildSignal } from "../state/GlobalData";
import { SPACE_PART } from "../utils/SymbolEncodingUtils";
import { en } from "../i18n/en";

test("The content encoding area is rendered correctly", async (): Promise<void> => {
  await initAdaptivePaletteGlobals();

  const cellId = "uuid-of-content-encoding-area";
  const cellOptions = {
    columnStart: 1,
    columnSpan: 5,
    rowStart: 2,
    rowSpan: 3
  };

  renderCell(ContentEncoding, cellId, cellOptions);

  // Test the content area is rendered properly
  const encodingAreaByLabel = await screen.findByLabelText("Input Area");
  expect(encodingAreaByLabel.id).toBe(cellId);
  // The grid position is on the wrapper that draws the edge markers.
  const scroller = encodingAreaByLabel.parentElement as HTMLElement;
  expect(scroller).toHaveClass("messageScroller");
  expect(scroller.style.getPropertyValue("grid-column")).toBe("1 / span 5");
  expect(scroller.style.getPropertyValue("grid-row")).toBe("2 / span 3");

  // The aria role is defined
  const encodingAreaByRole = await screen.findByRole("textbox");
  expect(encodingAreaByRole.getAttribute("aria-readonly")).toBe("true");
  expect(encodingAreaByRole).toBeVisible();
  expect(encodingAreaByRole).toBeValid();

  // Nothing is rendered in the content area
  expect(encodingAreaByLabel.childNodes.length).toBe(0);
});

describe("clamp()", (): void => {

  test("returns min when the value is below it", (): void => {
    expect(clamp(-1, 0, 1)).toBe(0);
  });

  test("returns max when the value is above it", (): void => {
    expect(clamp(2, 0, 1)).toBe(1);
  });

  test("returns the value unchanged when it is in range", (): void => {
    expect(clamp(1, 0, 2)).toBe(1);
  });
});

describe("marking a label the model produced", (): void => {

  const cellId = "uuid-of-content-encoding-area";
  const cellOptions = {
    columnStart: 1,
    columnSpan: 5,
    rowStart: 2,
    rowSpan: 3
  };
  const markedSymbol = {
    label: "walked",
    composition: [ 382, ";", 97 ],
    indicatorId: 97,
    userSelectedSymbolId: 382,
    isAiLabel: true
  };

  let initialMarkAiSuggestions: boolean;
  const initialContents = changeEncodingContents.value;

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
    initialMarkAiSuggestions = adaptivePaletteGlobals.config.markAiSuggestions;
  });

  beforeEach((): void => {
    adaptivePaletteGlobals.config.markAiSuggestions = true;
  });

  afterEach((): void => {
    adaptivePaletteGlobals.config.markAiSuggestions = initialMarkAiSuggestions;
    changeEncodingContents.value = initialContents;
  });

  test("a marked label gets the badge and the italic class", async (): Promise<void> => {
    changeEncodingContents.value = { payloads: [markedSymbol], caretPosition: 0 };

    renderCell(ContentEncoding, cellId, cellOptions);
    const inputArea = await screen.findByLabelText("Input Area");

    expect(inputArea.querySelector(".aiBadge")?.textContent).toBe(en.aiBadge);
    // The badge comes first, and the label itself is unchanged.
    expect(inputArea.querySelector(".aiLabel")?.textContent).toBe(`${en.aiBadge}walked`);
  });

  // Each caret branch renders its own `BlissSymbol`; a caret of -1 covers the two the test
  // above does not: the insertion branch for index 0, and the plain branch for index 1.
  test("every caret branch marks its label", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [markedSymbol, markedSymbol],
      caretPosition: -1
    };

    renderCell(ContentEncoding, cellId, cellOptions);
    const inputArea = await screen.findByLabelText("Input Area");

    expect(inputArea.querySelectorAll(".insertionCaret .aiBadge")).toHaveLength(1);
    expect(inputArea.querySelectorAll(".aiBadge")).toHaveLength(2);
    expect(inputArea.querySelectorAll(".aiLabel")).toHaveLength(2);
  });

  test("an unmarked label gets neither", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: "walk", composition: 382, userSelectedSymbolId: 382 }],
      caretPosition: 0
    };

    renderCell(ContentEncoding, cellId, cellOptions);
    const inputArea = await screen.findByLabelText("Input Area");

    expect(inputArea.querySelectorAll(".aiBadge")).toHaveLength(0);
    expect(inputArea.querySelectorAll(".aiLabel")).toHaveLength(0);
  });

  test("nothing is marked when the setting is off", async (): Promise<void> => {
    adaptivePaletteGlobals.config.markAiSuggestions = false;
    changeEncodingContents.value = { payloads: [markedSymbol], caretPosition: 0 };

    renderCell(ContentEncoding, cellId, cellOptions);
    const inputArea = await screen.findByLabelText("Input Area");

    expect(inputArea.querySelectorAll(".aiBadge")).toHaveLength(0);
    expect(inputArea.querySelectorAll(".aiLabel")).toHaveLength(0);
  });
});

describe("a picture word", (): void => {

  const cellOptions = { columnStart: 1, columnSpan: 5, rowStart: 2, rowSpan: 3 };
  const bread = { label: "bread", picture: testPicture(), modifierInfo: [] };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  afterEach((): void => {
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  // A caret of -1 draws the insertion branch and the plain one; a caret of 1, the plain one and
  // the caret one.
  test.each([-1, 1])("is drawn as its picture above its label, with the caret at %i", async (caretPosition): Promise<void> => {
    changeEncodingContents.value = { payloads: [bread, bread], caretPosition };

    renderCell(ContentEncoding, "uuid-of-content-encoding-area", cellOptions);
    const inputArea = await screen.findByLabelText("Input Area");

    const pictures = inputArea.querySelectorAll("img");
    expect(pictures).toHaveLength(2);
    pictures.forEach((img) => expect(img.getAttribute("src")).toBe(testPicture()));
    expect(inputArea.querySelector("svg")).toBe(null);
    expect(inputArea.textContent).toBe("breadbread");
  });
});

describe("a word being built", (): void => {

  const cellOptions = { columnStart: 1, columnSpan: 5, rowStart: 1, rowSpan: 1 };
  const word = (label: string, composition: number) => ({ label, composition, modifierInfo: [] });
  // A symbol's label is the last element in it.
  const labelOf = (element: Element): string | null | undefined => element.lastElementChild?.textContent;

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  afterEach((): void => {
    wordBuildSignal.value = null;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("is drawn in a box where the caret was, with the message around it", async (): Promise<void> => {
    wordBuildSignal.value = { message: { payloads: [word("I", 1840), word("see", 2340)], caretPosition: 0 }, combine: true };
    changeEncodingContents.value = { payloads: [word("cat", 126), SPACE_PART, word("colour", 1161)], caretPosition: 2 };
    renderCell(ContentEncoding, "content-encoding-area", cellOptions);

    const area = await screen.findByRole("textbox");
    const box = area.querySelector(".newWord") as HTMLElement;
    expect([...area.children].map((child) => child === box ? "box" : labelOf(child))).toEqual(["I", "box", "see"]);
    expect(box.querySelectorAll(".combineMarker")).toHaveLength(2);
    expect(box.querySelector(".wordSpace")?.textContent).toBe(en.wordSpace);
    expect(area.querySelectorAll(".cursorCaret")).toHaveLength(1);
    expect(labelOf(box.querySelector(".cursorCaret") as Element)).toBe("colour");
  });

  test("an empty word shows the caret alone, and no markers while the marker is off", async (): Promise<void> => {
    wordBuildSignal.value = { message: { payloads: [], caretPosition: -1 }, combine: false };
    renderCell(ContentEncoding, "content-encoding-area", cellOptions);

    const box = (await screen.findByRole("textbox")).querySelector(".newWord") as HTMLElement;
    expect(box.querySelector(".insertionCaret")).not.toBeNull();
    expect(box.querySelector(".combineMarker")).toBeNull();
  });
});

describe("the edge markers", (): void => {

  // Static markup with the attribute set by hand. In the app, `useCaretInView()` sets it.
  test("show only at an edge marked hidden, as wide as the area's scroll padding", (): void => {
    const { container } = render(html`
      <div class="messageScroller"><div class="contentEncodingArea" data-hidden-start></div></div>
    `);
    const scroller = container.firstElementChild as HTMLElement;
    const area = scroller.firstElementChild as HTMLElement;

    const before = getComputedStyle(scroller, "::before");
    expect(before.display).toBe("flex");
    expect(before.width).toBe(getComputedStyle(area).scrollPaddingLeft);
    expect(getComputedStyle(scroller, "::after").display).toBe("none");
  });
});

describe("keeping the caret in view", (): void => {

  const options = { columnStart: 1, columnSpan: 1, rowStart: 1, rowSpan: 1 };
  // Words with a label and no symbol, so their widths do not depend on the symbol styles. About
  // 900px in all, so a 200px area shows three or four at a time.
  const words = Array.from({ length: 20 }, (_, index) => ({ label: `w${index}` }));
  let area: HTMLElement;

  // Draws the input area in a frame of the given width, with the message set first.
  async function renderMessage (payloads: SymbolEncodingType[], caretPosition: number, width = 200): Promise<void> {
    changeEncodingContents.value = { payloads, caretPosition };
    render(html`
      <div style=${`width: ${width}px`}>
        <${ContentEncoding} id=${INPUT_AREA_ID} options=${options} />
      </div>
    `);
    area = await screen.findByRole("textbox");
  }

  const symbol = (index: number): Element => area.children[index];

  const edges = (): boolean[] => [area.hasAttribute("data-hidden-start"), area.hasAttribute("data-hidden-end")];

  // Whether the element lies inside the area's visible box and clear of any marker shown. 1px of
  // slack for sub-pixel scrolling.
  function inView (element: Element): boolean {
    const scroller = area.parentElement as HTMLElement;
    const markerWidth = (side: string, attribute: string): number =>
      area.hasAttribute(attribute) ? parseFloat(getComputedStyle(scroller, side).width) : 0;
    const left = area.getBoundingClientRect().left + area.clientLeft;
    const rect = element.getBoundingClientRect();
    return rect.left >= left + markerWidth("::before", "data-hidden-start") - 1 &&
      rect.right <= left + area.clientWidth - markerWidth("::after", "data-hidden-end") + 1;
  }

  // Waits for the draw that puts the caret on symbol `caret`, then checks that it and the others
  // are in view. The hook scrolls in that same draw.
  async function expectCaretInView (caret: number, ...others: number[]): Promise<void> {
    await vi.waitFor(() => expect(symbol(caret)).toHaveClass("cursorCaret"));
    for (const index of [caret, ...others]) {
      expect(inView(symbol(index)), `w${index} in view`).toBe(true);
    }
  }

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  afterEach((): void => {
    wordBuildSignal.value = null;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("each symbol added at the end is in view, with the one before it", async (): Promise<void> => {
    await renderMessage([], -1);
    for (let index = 0; index < words.length; index++) {
      editMessage({ payloads: words.slice(0, index + 1), caretPosition: index });
      await expectCaretInView(index, Math.max(index - 1, 0));
    }
    expect(edges()).toEqual([true, false]);
    expect([window.scrollX, window.scrollY]).toEqual([0, 0]);
  });

  test("Home shows the start of the message, and End its end", async (): Promise<void> => {
    await renderMessage(words, 19);
    expect(area.scrollLeft).toBeGreaterThan(0);

    moveCursorToHome();
    await vi.waitFor(() => expect(symbol(0)).toHaveClass("insertionCaret"));
    expect(area.scrollLeft).toBe(0);
    expect(inView(symbol(0))).toBe(true);
    expect(edges()).toEqual([false, true]);
    expect([window.scrollX, window.scrollY]).toEqual([0, 0]);

    moveCursorToEnd();
    await expectCaretInView(19, 18);
    expect(edges()).toEqual([true, false]);
  });

  test("Backward and Forward show the caret and the symbol past it at both edges", async (): Promise<void> => {
    await renderMessage(words, 19);
    for (let position = 18; position >= 0; position--) {
      decrementCursor();
      await expectCaretInView(position, Math.max(position - 1, 0));
    }
    for (let position = 1; position <= 19; position++) {
      incrementCursor();
      await expectCaretInView(position, Math.min(position + 1, 19));
    }
  });

  test("inserting, widening and deleting a symbol in the middle keeps the caret in view", async (): Promise<void> => {
    await renderMessage(words, 9);

    const inserted = [...words.slice(0, 10), { label: "new" }, ...words.slice(10)];
    editMessage({ payloads: inserted, caretPosition: 10 });
    await expectCaretInView(10, 9, 11);

    // An indicator makes a symbol wider: here, a longer label.
    const widened = inserted.map((word, index) => index === 10 ? { label: "new+ind" } : word);
    editMessage({ payloads: widened, caretPosition: 10 });
    await vi.waitFor(() => expect(symbol(10)).toHaveTextContent("new+ind"));
    expect(inView(symbol(10))).toBe(true);

    editMessage({ payloads: words, caretPosition: 9 });
    await expectCaretInView(9, 8, 10);
  });

  // 400px, so the caret can move without leaving the view.
  test("a caret move that stays in view does not scroll", async (): Promise<void> => {
    await renderMessage(words, 19, 400);
    editMessage({ payloads: words, caretPosition: 10 });
    await expectCaretInView(10, 9, 11);
    const scrollLeft = area.scrollLeft;

    editMessage({ payloads: words, caretPosition: 12 });
    await expectCaretInView(12, 11, 13);
    expect(area.scrollLeft).toBe(scrollLeft);
  });

  test("a scroll by hand stays put, and the markers follow it", async (): Promise<void> => {
    await renderMessage(words, 19);
    expect(edges()).toEqual([true, false]);

    area.scrollLeft = 0;
    await vi.waitFor(() => expect(edges()).toEqual([false, true]));
    expect(area.scrollLeft).toBe(0);
  });

  // Without the combine marker, whose symbol's size depends on styles this test does not load.
  test("in a new word wider than the area, the caret stays in view", async (): Promise<void> => {
    wordBuildSignal.value = { message: { payloads: [], caretPosition: -1 }, combine: false };
    await renderMessage(words, 19);
    const caret = (): Element => area.querySelector(".cursorCaret, .insertionCaret") as Element;
    expect(inView(caret())).toBe(true);

    moveCursorToHome();
    await vi.waitFor(() => expect(caret()).toHaveClass("insertionCaret"));
    expect(inView(caret())).toBe(true);
  });

  test("a message that fits shows no markers", async (): Promise<void> => {
    await renderMessage(words.slice(0, 2), 1);
    expect(edges()).toEqual([false, false]);
  });

  test("a symbol wider than the area shows its caret bar, and stays put on a redraw", async (): Promise<void> => {
    const wide = words.map((word, index) => index === 10 ? { label: "a-very-long-label-wider-than-the-area" } : word);
    await renderMessage(wide, 10);
    await vi.waitFor(() => expect(symbol(10)).toHaveClass("cursorCaret"));
    // Wider than the area, so the caret and its neighbours cannot all show.
    expect(symbol(10).getBoundingClientRect().width).toBeGreaterThan(area.clientWidth);

    const scroller = area.parentElement as HTMLElement;
    const endMarker = parseFloat(getComputedStyle(scroller, "::after").width);
    const visibleEnd = area.getBoundingClientRect().left + area.clientLeft + area.clientWidth -
      (area.hasAttribute("data-hidden-end") ? endMarker : 0);
    expect(symbol(10).getBoundingClientRect().right).toBeLessThanOrEqual(visibleEnd + 1);

    const scrollLeft = area.scrollLeft;
    editMessage({ payloads: [...wide], caretPosition: 10 });
    await vi.waitFor(() => expect(symbol(10)).toHaveClass("cursorCaret"));
    expect(area.scrollLeft).toBe(scrollLeft);
  });

  test("a new word in a long message keeps its parts inside its box", async (): Promise<void> => {
    const message = { payloads: [{ label: "a" }, { label: "b" }], caretPosition: 0 };
    wordBuildSignal.value = { message, combine: false };
    await renderMessage(words, 19);
    const box = area.querySelector(".newWord") as HTMLElement;
    const lastPart = box.lastElementChild as HTMLElement;
    expect(lastPart.getBoundingClientRect().right).toBeLessThanOrEqual(box.getBoundingClientRect().right);
  });

  test("after the area narrows, the caret is in view again", async (): Promise<void> => {
    await renderMessage(words, 10);
    const frame = (area.parentElement as HTMLElement).parentElement as HTMLElement;

    frame.style.width = "120px";
    await vi.waitFor(() => expect(inView(symbol(10))).toBe(true));
  });

  // Any element's `load` reaches the listener. A real picture's would come at an unknown time.
  test("a picture finishing loading scrolls back to the caret", async (): Promise<void> => {
    await renderMessage(words, 19);
    area.scrollLeft = 0;
    await vi.waitFor(() => expect(edges()).toEqual([false, true]));

    symbol(0).dispatchEvent(new Event("load"));
    expect(inView(symbol(19))).toBe(true);
  });
});
