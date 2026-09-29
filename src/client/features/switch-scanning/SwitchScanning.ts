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

/**
 * Two-switch row–column scanning: one key moves a highlight through the rows of controls on the
 * page, the other selects. See docs/AccessMethods.md.
 *
 * Rows are read from the page as drawn, on every press and after every change to it, so they
 * always match what the user sees: a new palette, word predictions that arrive later, a row
 * that empties.
 */
import { effect } from "@preact/signals";
import type { SwitchScanningConfigType } from "../../index.d";
import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { elementAllowsTextEntry } from "../../utils/TextEntryUtils";
import "./SwitchScanning.scss";

export const CELL_CLASS = "switchScanCell";
export const OVERLAY_ID = "switchScanOverlay";

const CONTROL_SELECTOR = "button, [tabindex='0'], input[type='checkbox'], input[type='radio']";

/**
 * The controls in `root` a scan stops on, in document order: visible, not disabled (including
 * inside a disabled fieldset), and not the input area, whose caret the command bar moves.
 * `aria-disabled` controls stay, as they stay in the Tab order.
 * @param {Element} root - Where to look.
 * @returns {HTMLElement[]}
 */
export function scannableControls (root: Element): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)).filter((el) =>
    !el.matches(":disabled") &&
    el.getAttribute("role") !== "textbox" &&
    el.getClientRects().length > 0
  );
}

/**
 * The controls in `roots`, grouped into rows as they appear on screen, top to bottom, each row
 * left to right. A control joins a row when it spans the middle of the row's first control, so
 * a taller chip beside a button still shares its row.
 *
 * ponytail: a cell spanning two grid rows joins the upper row only. The shipped palettes are
 * regular grids; read rows from the palette JSON if that changes.
 * @param {Element[]} roots - The regions to scan.
 * @returns {HTMLElement[][]}
 */
export function collectRows (roots: Element[]): HTMLElement[][] {
  const items = roots.flatMap((root) => scannableControls(root))
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .sort((a, b) => a.rect.top - b.rect.top);
  const rows: { middle: number, items: typeof items }[] = [];
  for (const item of items) {
    const last = rows[rows.length - 1];
    if (last && item.rect.top <= last.middle && last.middle <= item.rect.bottom) {
      last.items.push(item);
    } else {
      rows.push({ middle: (item.rect.top + item.rect.bottom) / 2, items: [item] });
    }
  }
  return rows.map((row) => row.items.sort((a, b) => a.rect.left - b.rect.left).map((item) => item.el));
}

// The regions scanned when no dialog is open: the top bar and the palette below it.
const PAGE_REGION_IDS = ["topBar", "mainPaletteDisplayArea"];

/**
 * The open modal dialog on top, or null. `showModal()` makes everything else inert, so it is
 * the only thing the user can act on.
 * ponytail: the last open dialog in document order; track the top layer if dialogs ever nest
 * out of document order.
 * @returns {HTMLDialogElement | null}
 */
function topDialog (): HTMLDialogElement | null {
  const open = document.querySelectorAll<HTMLDialogElement>("dialog[open]");
  return open.length > 0 ? open[open.length - 1] : null;
}

/**
 * Whether `el` is one of the current palette's own cells, not one in an included palette such
 * as the shared header.
 * @param {HTMLElement} el - A control.
 * @returns {boolean}
 */
export function isOwnPaletteCell (el: HTMLElement): boolean {
  const name = adaptivePaletteGlobals.navigationStack.currentPalette?.name;
  return !!name && !el.closest(".paletteInclude") &&
    !!el.closest(`[data-palettename="${CSS.escape(name)}"]`);
}

/**
 * Start scanning with `config`'s keys. Only called when scanning is enabled, so with it off
 * nothing here listens and keyboard access is untouched.
 * @param {SwitchScanningConfigType} config - The keys.
 * @returns {() => void} - Stops scanning and removes the highlight.
 */
export function startSwitchScanning (config: SwitchScanningConfigType): () => void {
  // Where the scan is. At row level `cellIndex` is unused; inside a row -1 is the exit stop.
  let level: "rows" | "cells" = "rows";
  let rowIndex = 0;
  let cellIndex = -1;
  // The first cell of the current row. It finds the row again after rows above it appear or
  // go, which indexes alone cannot.
  let anchor: HTMLElement | null = null;
  // Set when the palette changes: the next paint moves to the new palette's first row.
  let toPaletteStart = false;
  let dialog: HTMLDialogElement | null = null;
  let dialogIndex = 0;

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
  document.body.appendChild(overlay);

  const pageRows = (): HTMLElement[][] => collectRows(
    PAGE_REGION_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
  );

  /**
   * Bring the position in line with the rows now on the page, and return the current row.
   * @param {HTMLElement[][]} rows - The page's rows; not empty.
   * @returns {HTMLElement[]}
   */
  function currentRow (rows: HTMLElement[][]): HTMLElement[] {
    const paletteStart = toPaletteStart ? rows.findIndex((row) => row.some(isOwnPaletteCell)) : -1;
    // `toPaletteStart` stays set until the new palette's cells are drawn.
    if (paletteStart >= 0) {
      toPaletteStart = false;
      level = "rows";
      rowIndex = paletteStart;
    } else {
      const found = anchor ? rows.findIndex((row) => row.includes(anchor as HTMLElement)) : -1;
      if (found >= 0) {
        rowIndex = found;
      } else {
        rowIndex = rowIndex % rows.length;
        level = "rows";
      }
    }
    anchor = rows[rowIndex][0];
    if (cellIndex >= rows[rowIndex].length) {
      cellIndex = -1;
    }
    return rows[rowIndex];
  }

  /**
   * The dialog's stops, resetting the position when a different dialog is on top.
   * @param {HTMLDialogElement} current - The dialog on top.
   * @returns {HTMLElement[]}
   */
  function dialogControls (current: HTMLDialogElement): HTMLElement[] {
    if (current !== dialog) {
      dialog = current;
      dialogIndex = 0;
    }
    return scannableControls(current);
  }

  /**
   * Draw the highlight where the scan is. Changes attributes only, so the observer below does
   * not see it.
   */
  function paint (): void {
    document.querySelectorAll(`.${CELL_CLASS}`).forEach((el) => el.classList.remove(CELL_CLASS));
    overlay.hidden = true;
    overlay.removeAttribute("data-exit");

    const current = topDialog();
    if (current) {
      const controls = dialogControls(current);
      if (controls.length > 0) {
        dialogIndex %= controls.length;
        controls[dialogIndex].classList.add(CELL_CLASS);
      }
      return;
    }
    dialog = null;

    const rows = pageRows();
    if (rows.length === 0) {
      return;
    }
    const row = currentRow(rows);
    if (level === "cells" && cellIndex >= 0) {
      row[cellIndex].classList.add(CELL_CLASS);
      return;
    }
    // The row outline: the union of the row's cells, in page coordinates.
    const rects = row.map((el) => el.getBoundingClientRect());
    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const pad = 4;
    Object.assign(overlay.style, {
      left: `${left + window.scrollX - pad}px`,
      top: `${top + window.scrollY - pad}px`,
      width: `${right - left + 2 * pad}px`,
      height: `${bottom - top + 2 * pad}px`
    });
    overlay.toggleAttribute("data-exit", level === "cells");
    overlay.hidden = false;
  }

  /**
   * Step to the next row, cell or dialog control.
   */
  function move (): void {
    const current = topDialog();
    if (current) {
      // Reset the index first when this dialog is new, so the step is not lost to the reset.
      dialogControls(current);
      dialogIndex += 1;
      return;
    }
    const rows = pageRows();
    if (rows.length === 0) {
      return;
    }
    const row = currentRow(rows);
    if (level === "rows") {
      rowIndex = (rowIndex + 1) % rows.length;
      anchor = rows[rowIndex][0];
    } else {
      cellIndex = cellIndex + 1 < row.length ? cellIndex + 1 : -1;
    }
  }

  /**
   * Act on where the scan is: enter a row, leave it, or click a cell or dialog control.
   */
  function select (): void {
    const current = topDialog();
    if (current) {
      const controls = dialogControls(current);
      if (controls.length > 0) {
        selecting = true;
        controls[dialogIndex % controls.length].click();
      }
      return;
    }
    const rows = pageRows();
    if (rows.length === 0) {
      return;
    }
    const row = currentRow(rows);
    if (level === "rows") {
      level = "cells";
      cellIndex = -1;
      return;
    }
    // Leave the row before clicking: the click may open a dialog or change the palette.
    level = "rows";
    const target = cellIndex >= 0 ? row[cellIndex] : null;
    cellIndex = -1;
    if (target) {
      selecting = true;
      target.click();
    }
  }

  /**
   * Run a scan key, unless focus is in a text field or the key is held down.
   * @param {KeyboardEvent} event - The key press.
   */
  function onKeyDown (event: KeyboardEvent): void {
    endSelecting();
    const isMove = event.code === config.moveKey;
    if ((!isMove && event.code !== config.selectKey) || elementAllowsTextEntry(event.target)) {
      return;
    }
    // Space would also click the focused button, and Enter activate it.
    event.preventDefault();
    if (event.repeat) {
      return;
    }
    if (isMove) {
      move();
    } else {
      select();
    }
    paint();
  }

  let frame = 0;
  const schedulePaint = (): void => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(paint);
  };
  // The open dialog whose focus was last checked, so each opening is checked once.
  let focusChecked: HTMLDialogElement | null = null;
  // Set by a scan selection, cleared by the next key or pointer press: focus landing in a text
  // field meanwhile came from the selection.
  let selecting = false;

  /**
   * The one place scanning moves focus. Scan keys pressed in a text field are left to the field,
   * so focus stuck in one would stop the switch user from scanning. Focus is moved off a text
   * field in two cases:
   * 1. A dialog opens: `showModal()` focuses its first control, often a text field.
   * 2. A scan selection puts it there, as the gloss search's Clear button does.
   * Inside a dialog focus moves to the dialog, staying in the modal; on the page it is blurred.
   * A support person who clicks or tabs into a field later types normally.
   */
  function moveFocusOffTextField (): void {
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement) || !elementAllowsTextEntry(focused)) {
      return;
    }
    const current = topDialog();
    if (current?.contains(focused)) {
      if (!current.hasAttribute("tabindex")) {
        current.tabIndex = -1;
      }
      current.focus();
    } else {
      focused.blur();
    }
  }

  // Case 2, whenever focus arrives: during the click, or later in an effect after re-rendering.
  const onFocusIn = (): void => {
    if (selecting) {
      moveFocusOffTextField();
    }
  };
  const endSelecting = (): void => {
    selecting = false;
  };

  // Repaint when the page changes: rows appear or go, text above a row pushes it down (a status
  // line), a dialog opens or closes (`showModal()` and `close()` change only `open`). `paint()`
  // changes other attributes only, so it never schedules itself.
  const observer = new MutationObserver((): void => {
    // Case 1: runs before the next key press, and `showModal()` focuses in the same task.
    const current = topDialog();
    if (current !== focusChecked) {
      focusChecked = current;
      moveFocusOffTextField();
    }
    schedulePaint();
  });
  observer.observe(document.body, {
    childList: true, characterData: true, subtree: true, attributeFilter: ["open"]
  });

  let firstRun = true;
  const stopWatchingPalette = effect(() => {
    // Read to subscribe; the effect runs again each time the palette changes.
    void adaptivePaletteGlobals.navigationStack.currentPalette;
    if (!firstRun) {
      toPaletteStart = true;
      schedulePaint();
    }
    firstRun = false;
  });

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", schedulePaint);
  // Capture, so scrolling an inner area counts too.
  window.addEventListener("scroll", schedulePaint, true);
  window.addEventListener("focusin", onFocusIn);
  window.addEventListener("pointerdown", endSelecting, true);
  paint();

  // Safe to call more than once: every step below is a no-op the second time.
  return (): void => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", schedulePaint);
    window.removeEventListener("scroll", schedulePaint, true);
    window.removeEventListener("focusin", onFocusIn);
    window.removeEventListener("pointerdown", endSelecting, true);
    observer.disconnect();
    stopWatchingPalette();
    cancelAnimationFrame(frame);
    document.querySelectorAll(`.${CELL_CLASS}`).forEach((el) => el.classList.remove(CELL_CLASS));
    overlay.remove();
  };
}
