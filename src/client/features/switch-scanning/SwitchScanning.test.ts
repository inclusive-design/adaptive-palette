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
import { userEvent } from "vitest/browser";
import { fireEvent, waitFor } from "@testing-library/preact";
import type { JsonPaletteType } from "../../index.d";
import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { collectRows, scannableControls, startSwitchScanning } from "./SwitchScanning";
import { outlinedRow, onExitStop, highlightedCell } from "../../testUtils/SwitchScanTestUtils";

// `userEvent` comes from `vitest/browser`, not `@testing-library/user-event`: its events are
// trusted, so the browser's default actions run, such as Space clicking the focused button.

/**
 * A page like the app's: a top bar and a palette area, with a 3-column grid.
 * Rows: [Settings, Chip], [a1, a2, a3], [b1, b2].
 */
function buildPage (): HTMLElement {
  const page = document.createElement("div");
  page.innerHTML = `
    <div id="topBar" style="display: flex; align-items: center">
      <button style="height: 2rem">Settings</button>
      <button style="height: 3rem">Chip</button>
    </div>
    <div id="mainPaletteDisplayArea">
      <div style="display: grid; grid-template-columns: repeat(3, 4rem)">
        <button>a1</button><button>a2</button><button>a3</button>
        <button>b1</button><button>b2</button>
        <button style="display: none">hidden</button>
        <button disabled>off</button>
        <input type="text" aria-label="Text">
        <div role="textbox" tabindex="0">input area</div>
      </div>
    </div>`;
  document.body.appendChild(page);
  return page;
}

const labels = (els: HTMLElement[]): string[] => els.map((el) => el.textContent ?? "");

const byId = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`No element #${id}`);
  }
  return el;
};

describe("collectRows", (): void => {
  let page: HTMLElement;

  beforeEach((): void => {
    page = buildPage();
  });

  afterEach((): void => {
    page.remove();
  });

  test("groups controls by row, top to bottom, left to right", (): void => {
    const roots = [byId("topBar"), byId("mainPaletteDisplayArea")];

    expect(collectRows(roots).map(labels)).toEqual([
      ["Settings", "Chip"], ["a1", "a2", "a3"], ["b1", "b2"]
    ]);
  });

  test("leaves out hidden, disabled, text-field and input-area controls", (): void => {
    const controls = labels(scannableControls(byId("mainPaletteDisplayArea")));

    expect(controls).toEqual(["a1", "a2", "a3", "b1", "b2"]);
  });

  test("keeps a control that is only aria-disabled", (): void => {
    const settings = byId("topBar").querySelector("button");
    if (!settings) {
      throw new Error("No Settings button");
    }
    settings.setAttribute("aria-disabled", "true");

    expect(labels(scannableControls(byId("topBar")))).toEqual(["Settings", "Chip"]);
  });

  test("leaves out a control inside a disabled fieldset", (): void => {
    const area = byId("mainPaletteDisplayArea");
    area.insertAdjacentHTML("beforeend", "<fieldset disabled><button>in fieldset</button></fieldset>");

    expect(labels(scannableControls(area))).toEqual(["a1", "a2", "a3", "b1", "b2"]);
  });
});

const KEYS = { enabled: true, moveKey: "Space", selectKey: "Enter" };
const move = async (): Promise<void> => {
  await userEvent.keyboard(" ");
};
const select = async (): Promise<void> => {
  await userEvent.keyboard("{Enter}");
};
const button = (label: string): HTMLElement => {
  const el = Array.from(document.querySelectorAll<HTMLElement>("button")).find((b) => b.textContent === label);
  if (!el) {
    throw new Error(`No button ${label}`);
  }
  return el;
};

describe("startSwitchScanning", (): void => {
  let page: HTMLElement;
  let stop: () => void;

  beforeEach((): void => {
    page = buildPage();
    stop = startSwitchScanning(KEYS);
  });

  afterEach((): void => {
    stop();
    page.remove();
  });

  test("starts with the first row outlined", (): void => {
    expect(labels(outlinedRow())).toEqual(["Settings", "Chip"]);
    expect(highlightedCell()).toBeNull();
  });

  test("move steps through the rows and wraps", async (): Promise<void> => {
    await move();
    expect(labels(outlinedRow())).toEqual(["a1", "a2", "a3"]);
    await move();
    await move();
    expect(labels(outlinedRow())).toEqual(["Settings", "Chip"]);
  });

  test("entering a row lands on its exit stop first", async (): Promise<void> => {
    await move();
    await select();
    expect(onExitStop()).toBe(true);
    expect(labels(outlinedRow())).toEqual(["a1", "a2", "a3"]);
    expect(highlightedCell()).toBeNull();
  });

  test("the exit stop goes back to row level on the same row", async (): Promise<void> => {
    await move();
    await select();
    await select();
    expect(onExitStop()).toBe(false);
    expect(labels(outlinedRow())).toEqual(["a1", "a2", "a3"]);
  });

  test("move steps through the cells and wraps to the exit stop", async (): Promise<void> => {
    await move();
    await select();
    await move();
    expect(highlightedCell()).toBe(button("a1"));
    await move();
    await move();
    expect(highlightedCell()).toBe(button("a3"));
    await move();
    expect(highlightedCell()).toBeNull();
    expect(onExitStop()).toBe(true);
  });

  test("select clicks the cell and returns to the same row", async (): Promise<void> => {
    const clicked = vi.fn();
    button("a2").addEventListener("click", clicked);
    await move();
    await select();
    await move();
    await move();
    await select();
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(highlightedCell()).toBeNull();
    expect(labels(outlinedRow())).toEqual(["a1", "a2", "a3"]);
  });

  test("keeps the same row when a row appears above it", async (): Promise<void> => {
    button("b1").addEventListener("click", () => {
      const extra = document.createElement("button");
      extra.textContent = "new";
      byId("mainPaletteDisplayArea").prepend(extra);
    });
    await move();
    await move();
    await select();
    await move();
    await select();
    await waitFor(() => expect(labels(outlinedRow())).toEqual(["b1", "b2"]));
  });

  test("follows a row that new text above it pushes down", async (): Promise<void> => {
    // Like the word prediction status line: its element stays, only its text changes.
    const status = document.createElement("p");
    status.style.cssText = "margin: 0; line-height: 3rem";
    const text = document.createTextNode("");
    status.append(text);
    byId("mainPaletteDisplayArea").prepend(status);
    await move();
    await waitFor(() => expect(labels(outlinedRow())).toEqual(["a1", "a2", "a3"]));
    text.data = "Querying";
    await waitFor(() => expect(labels(outlinedRow())).toEqual(["a1", "a2", "a3"]));
  });

  test("moves on to the next row when the used row disappears", async (): Promise<void> => {
    button("a1").addEventListener("click", () => {
      ["a1", "a2", "a3"].forEach((label) => button(label).remove());
    });
    await move();
    await select();
    await move();
    await select();
    await waitFor(() => expect(labels(outlinedRow())).toEqual(["b1", "b2"]));
  });

  test("scan keys do not activate the focused button", async (): Promise<void> => {
    const clicked = vi.fn();
    button("b1").addEventListener("click", clicked);
    button("b1").focus();
    await move();
    await select();
    expect(clicked).not.toHaveBeenCalled();
    expect(button("b1")).toHaveFocus();
  });

  test("scan keys type into a text field and do not scan", async (): Promise<void> => {
    const field = page.querySelector<HTMLInputElement>("input[type='text']");
    if (!field) {
      throw new Error("No text field");
    }
    field.focus();
    await userEvent.keyboard(" ");
    expect(field.value).toBe(" ");
    expect(labels(outlinedRow())).toEqual(["Settings", "Chip"]);
  });

  test("a field clicked or tabbed into after a scan selection keeps focus", async (): Promise<void> => {
    const field = page.querySelector<HTMLInputElement>("input[type='text']");
    if (!field) {
      throw new Error("No text field");
    }
    await move();
    await select();
    await move();
    await select();
    await userEvent.click(field);
    expect(field).toHaveFocus();

    field.blur();
    await move();
    await select();
    await move();
    await select();
    button("b2").focus();
    await userEvent.keyboard("{Tab}");
    expect(field).toHaveFocus();
  });

  test("moves to the first row of a new palette's own cells", async (): Promise<void> => {
    byId("mainPaletteDisplayArea").insertAdjacentHTML("beforeend", `
      <div data-palettename="p2">
        <div class="paletteInclude"><button>h1</button></div>
        <button>c1</button>
      </div>`);
    const navigationStack = adaptivePaletteGlobals.navigationStack;
    const previous = navigationStack.currentPalette;
    try {
      await move();
      expect(labels(outlinedRow())).toEqual(["a1", "a2", "a3"]);
      navigationStack.currentPalette = { name: "p2" } as JsonPaletteType;
      await waitFor(() => expect(labels(outlinedRow())).toEqual(["c1"]));
    } finally {
      navigationStack.currentPalette = previous;
    }
  });

  test("the first move in a newly opened dialog is not lost", (): void => {
    const dialog = document.createElement("dialog");
    dialog.innerHTML = "<button>First</button><button>Second</button>";
    page.appendChild(dialog);
    dialog.showModal();
    // Before the dialog is painted.
    fireEvent.keyDown(window, { code: "Space" });
    expect(highlightedCell()?.textContent).toBe("Second");
  });

  test("a held key's repeats are ignored", (): void => {
    fireEvent.keyDown(window, { code: "Space", repeat: true });
    expect(labels(outlinedRow())).toEqual(["Settings", "Chip"]);
  });

  test("scans an open dialog's controls one by one, skipping text fields", async (): Promise<void> => {
    const dialog = document.createElement("dialog");
    dialog.innerHTML = `
      <input type="text" aria-label="Name">
      <label><input type="checkbox"> Option</label>
      <button>Close</button>`;
    page.appendChild(dialog);
    const checkbox = dialog.querySelector<HTMLInputElement>("input[type='checkbox']");
    if (!checkbox) {
      throw new Error("No checkbox");
    }
    dialog.showModal();

    await waitFor(() => expect(highlightedCell()).toBe(checkbox));
    expect(outlinedRow()).toEqual([]);
    await select();
    expect(checkbox.checked).toBe(true);
    await move();
    expect(highlightedCell()?.textContent).toBe("Close");
    await move();
    expect(highlightedCell()).toBe(checkbox);
  });

  test("a text field focused after a dialog opens takes scan keys as typing", async (): Promise<void> => {
    const dialog = document.createElement("dialog");
    dialog.innerHTML = `
      <input type="text" aria-label="Name">
      <button>Save</button>
      <button>Close</button>`;
    page.appendChild(dialog);
    const field = dialog.querySelector<HTMLInputElement>("input[type='text']");
    if (!field) {
      throw new Error("No text field");
    }
    dialog.showModal();
    await waitFor(() => expect(dialog).toHaveFocus());
    await waitFor(() => expect(highlightedCell()?.textContent).toBe("Save"));

    field.focus();
    await move();
    expect(field.value).toBe(" ");
    expect(field).toHaveFocus();
    expect(highlightedCell()?.textContent).toBe("Save");
  });

  test("a dialog control that focuses a text field leaves scanning going", async (): Promise<void> => {
    const dialog = document.createElement("dialog");
    dialog.innerHTML = `
      <input type="text" aria-label="Name">
      <button>Clear</button>
      <button>Close</button>`;
    page.appendChild(dialog);
    const field = dialog.querySelector<HTMLInputElement>("input[type='text']");
    if (!field) {
      throw new Error("No text field");
    }
    button("Clear").addEventListener("click", () => field.focus());
    dialog.showModal();
    await waitFor(() => expect(highlightedCell()?.textContent).toBe("Clear"));

    await select();
    expect(field).not.toHaveFocus();
    await move();
    expect(field.value).toBe("");
    expect(highlightedCell()?.textContent).toBe("Close");
  });

  test("a cell that focuses a text field leaves scanning going", async (): Promise<void> => {
    const field = page.querySelector<HTMLInputElement>("input[type='text']");
    if (!field) {
      throw new Error("No text field");
    }
    button("a1").addEventListener("click", () => field.focus());
    await move();
    await select();
    await move();
    await select();
    expect(field).not.toHaveFocus();
    await move();
    expect(field.value).toBe("");
    expect(labels(outlinedRow())).toEqual(["b1", "b2"]);
  });

  test("resumes on the row that opened a dialog once it closes", async (): Promise<void> => {
    const dialog = document.createElement("dialog");
    dialog.innerHTML = "<button>Close</button>";
    page.appendChild(dialog);
    button("a1").addEventListener("click", () => dialog.showModal());
    button("Close").addEventListener("click", () => dialog.close());

    await move();
    await select();
    await move();
    await select();
    await waitFor(() => expect(highlightedCell()?.textContent).toBe("Close"));
    await select();
    await waitFor(() => expect(labels(outlinedRow())).toEqual(["a1", "a2", "a3"]));
    expect(highlightedCell()).toBeNull();
  });

  test("returns to its place in a dialog when a dialog opened from it closes", async (): Promise<void> => {
    const outer = document.createElement("dialog");
    outer.innerHTML = "<button>Close</button><button>Erase</button>";
    const inner = document.createElement("dialog");
    inner.innerHTML = "<button>Cancel</button>";
    page.append(outer, inner);
    button("Erase").addEventListener("click", () => inner.showModal());
    button("Cancel").addEventListener("click", () => inner.close());
    outer.showModal();
    await waitFor(() => expect(highlightedCell()?.textContent).toBe("Close"));

    await move();
    await select();
    await waitFor(() => expect(highlightedCell()?.textContent).toBe("Cancel"));
    await select();
    await waitFor(() => expect(highlightedCell()?.textContent).toBe("Erase"));
  });

  test("a dialog opened again starts at its first control", async (): Promise<void> => {
    const dialog = document.createElement("dialog");
    dialog.innerHTML = "<button>First</button><button>Close</button>";
    page.appendChild(dialog);
    button("Close").addEventListener("click", () => dialog.close());
    dialog.showModal();
    await waitFor(() => expect(highlightedCell()?.textContent).toBe("First"));
    await move();
    await select();
    await waitFor(() => expect(highlightedCell()).toBeNull());

    dialog.showModal();
    await waitFor(() => expect(highlightedCell()?.textContent).toBe("First"));
  });

  test("scrolls the page to a row below the window", async (): Promise<void> => {
    byId("mainPaletteDisplayArea").insertAdjacentHTML("beforeend",
      "<div style='height: 200vh'></div><button>far</button>");
    await move();
    await move();
    await move();
    expect(labels(outlinedRow())).toEqual(["far"]);
    const box = byId("switchScanOverlay").getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(0);
    // WebKit scrolls by whole pixels, so allow the part of a pixel left over.
    expect(box.bottom).toBeLessThan(window.innerHeight + 1);
  });

  test("scrolls a dialog's list to the highlighted control", async (): Promise<void> => {
    const dialog = document.createElement("dialog");
    dialog.innerHTML = `
      <div style="height: 6rem; overflow-y: auto">
        <button style="display: block; height: 3rem">One</button>
        <button style="display: block; height: 3rem">Filler</button>
        <button style="display: block; height: 3rem">Two</button>
      </div>`;
    page.appendChild(dialog);
    dialog.showModal();
    await waitFor(() => expect(highlightedCell()?.textContent).toBe("One"));

    await move();
    await move();
    expect(highlightedCell()?.textContent).toBe("Two");
    const list = button("Two").parentElement as HTMLElement;
    const box = button("Two").getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(list.getBoundingClientRect().top);
    expect(box.bottom).toBeLessThanOrEqual(list.getBoundingClientRect().bottom);
  });

  test("uses the configured keys", async (): Promise<void> => {
    stop();
    stop = startSwitchScanning({ enabled: true, moveKey: "KeyA", selectKey: "KeyB" });
    await userEvent.keyboard("a");
    expect(labels(outlinedRow())).toEqual(["a1", "a2", "a3"]);
    await move();
    expect(labels(outlinedRow())).toEqual(["a1", "a2", "a3"]);
  });

  test("once stopped, Space activates the focused button again", async (): Promise<void> => {
    stop();
    const clicked = vi.fn();
    button("b1").addEventListener("click", clicked);
    button("b1").focus();
    await move();
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(document.getElementById("switchScanOverlay")).toBeNull();
  });
});
