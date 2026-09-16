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
import { render, screen } from "@testing-library/preact";
import { html } from "htm/preact";

import { JsonPaletteType } from "../index.d";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { setTestConfig } from "../testUtils/TestConfig";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { Palette } from "./Palette";

describe("Palette", (): void => {

  // The test palette defines three cells, but they collectively define a
  // palette of four rows and six columns.
  const testPalette = {
    "name": "Test Palette",
    "cells": {
      "firstCell": {
        "type": "ActionCodeCell",
        "options": {
          "label": "First Cell",
          "composition": [
            652,
            "/",
            646
          ],   // IDsfor bciAvIds 17720, 17697
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 3,
          "columnSpan": 1
        }
      },
      "secondCell": {
        "type": "ActionCodeCell",
        "options": {
          "label": "Second Cell",
          "composition": 823,
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 4,
          "columnSpan": 1
        }
      },
      "thirdCell": {
        "type": "ActionCodeCell",
        "options": {
          "label": "Third Cell",
          "composition": [
            1028,
            "/",
            106
          ],   // IDsfor bciAvIds 25554, 12335
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 5,
          "columnSpan": 1
        }
      }
    }
  };
  const NUM_CELLS = Object.keys(testPalette.cells).length;

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("Render palette", async(): Promise<void> => {

    // render() the palette and then wait until its first cell is available to
    // ensure that the entire palette is in the DOM.
    render(html`<${Palette} json=${testPalette}/>`);
    const firstCell = await screen.findByText("First Cell");
    expect(firstCell).toBeInTheDocument();

    const paletteElement = document.querySelector("div.paletteContainer") as HTMLElement;
    if (!paletteElement) {
      throw new Error("Palette element with class 'paletteContainer' not found in the DOM");
    }

    expect(paletteElement).toBeVisible();
    expect(paletteElement).toBeValid();

    // There should be 6 columns in the grid and NUM_CELLS children.
    expect(paletteElement.style["grid-template-columns" as keyof typeof paletteElement.style]).toBe("repeat(5, 1fr)");
    expect(paletteElement.childNodes.length).toBe(NUM_CELLS);
  });

  // Both flags mark a cell whose feature may be unavailable: the command bar's "Msg Style"
  // button and the input area's "Make Sentences" button carry them in the palette JSON.
  describe("a cell whose feature can be unavailable", (): void => {

    // The flagged cell sits between the other two, so its column is the one that has to
    // collapse for the row to close up.
    const paletteFlagging = (flags: object): JsonPaletteType => ({
      "name": "Feature Palette",
      "cells": {
        "plainCell": {
          "type": "ActionCodeCell",
          "options": {
            "label": "Plain Cell", "composition": 823,
            "rowStart": 1, "rowSpan": 1, "columnStart": 1, "columnSpan": 1
          }
        },
        "featureCell": {
          "type": "ActionCodeCell",
          "options": {
            "label": "Feature Cell", "composition": 823, ...flags,
            "rowStart": 1, "rowSpan": 1, "columnStart": 2, "columnSpan": 1
          }
        },
        "lastCell": {
          "type": "ActionCodeCell",
          "options": {
            "label": "Last Cell", "composition": 823,
            "rowStart": 1, "rowSpan": 1, "columnStart": 3, "columnSpan": 1
          }
        }
      }
    });

    const gridColumns = (container: Element): string => {
      const paletteElement = container.querySelector("div.paletteContainer") as HTMLElement;
      return paletteElement.style["grid-template-columns" as keyof typeof paletteElement.style] as string;
    };

    afterEach((): void => {
      adaptivePaletteGlobals.models = [];
    });

    test("flagged `requiresModel` is left out with no model, and its column collapses", async (): Promise<void> => {
      adaptivePaletteGlobals.models = [];

      const { container } = render(html`<${Palette} json=${paletteFlagging({ requiresModel: true })}/>`);
      await screen.findByText("Last Cell");

      expect(screen.queryByText("Feature Cell")).toBeNull();
      expect(gridColumns(container)).toBe("1fr 0fr 1fr");
    });

    test("flagged `requiresModel` is rendered as usual when a model is available", async (): Promise<void> => {
      adaptivePaletteGlobals.models = ["phony-model:12b"];

      const { container } = render(html`<${Palette} json=${paletteFlagging({ requiresModel: true })}/>`);

      expect(await screen.findByText("Feature Cell")).toBeInTheDocument();
      expect(gridColumns(container)).toBe("repeat(3, 1fr)");
    });

    test("flagged `requiresConfig` is left out when its config section is missing", async (): Promise<void> => {
      adaptivePaletteGlobals.models = ["phony-model:12b"];
      // The default config has no `telegraphicTranslation` section.
      setTestConfig();

      const palette = paletteFlagging({ requiresConfig: "telegraphicTranslation" });
      const { container } = render(html`<${Palette} json=${palette}/>`);
      await screen.findByText("Last Cell");

      expect(screen.queryByText("Feature Cell")).toBeNull();
      expect(gridColumns(container)).toBe("1fr 0fr 1fr");
    });
  });

  describe("a PaletteInclude cell", (): void => {

    const symbolCell = (label: string, rowStart: number, columnStart: number): object => ({
      type: "ActionCodeCell",
      options: { label, composition: 823, rowStart, rowSpan: 1, columnStart, columnSpan: 1 }
    });

    const includeCell = (options: object): object => ({
      type: "PaletteInclude",
      options: { rowStart: 1, rowSpan: 1, columnStart: 1, columnSpan: 1, ...options }
    });

    // Two symbols side by side.
    const pair = {
      name: "Pair",
      cells: { "left": symbolCell("Left", 1, 1), "right": symbolCell("Right", 1, 2) }
    };

    const outerColumns = (container: Element): string => {
      const paletteElement = container.querySelector("div.paletteContainer") as HTMLElement;
      return paletteElement.style["grid-template-columns" as keyof typeof paletteElement.style] as string;
    };

    const buttonFor = (label: string): HTMLElement => screen.getByText(label).closest("button") as HTMLElement;

    beforeEach((): void => {
      adaptivePaletteGlobals.paletteStore.addPalette(pair as JsonPaletteType);
    });

    afterEach((): void => {
      vi.restoreAllMocks();
    });

    test("nested: the included palette is drawn inside the span, with its own columns", async (): Promise<void> => {
      const screenPalette = {
        name: "Screen",
        cells: {
          "pair": includeCell({ palette: "Pair", columnSpan: 3 }),
          "below": symbolCell("Below", 2, 1)
        }
      };

      const { container } = render(html`<${Palette} json=${screenPalette}/>`);
      await screen.findByText("Right");

      const wrapper = container.querySelector(".paletteInclude") as HTMLElement;
      expect(wrapper.style.gridColumnEnd).toBe("span 3");
      const inner = wrapper.querySelector("[data-palettename='Pair']") as HTMLElement;
      expect(inner.style["grid-template-columns" as keyof typeof inner.style]).toBe("repeat(2, 1fr)");
      expect(outerColumns(container)).toBe("repeat(3, 1fr)");
    });

    // Draws a screen holding `include` beside an "After" cell, and checks the include drew nothing.
    const expectIncludeRejected = async (include: object): Promise<void> => {
      const consoleError = vi.spyOn(console, "error").mockImplementation((): void => {});
      const screenPalette = {
        name: "Screen",
        cells: { "include": includeCell(include), "after": symbolCell("After", 1, 3) }
      };
      // In the store, so that a screen including itself gets past the lookup to the cycle check.
      adaptivePaletteGlobals.paletteStore.addPalette(screenPalette as JsonPaletteType);

      render(html`<${Palette} json=${screenPalette}/>`);
      await screen.findByText("After");

      expect(screen.queryByText("Left")).toBeNull();
      expect(document.querySelector(".paletteInclude")).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("PaletteInclude \"include\""));
    };

    test("draws nothing and logs an error when the palette is not loaded", async (): Promise<void> => {
      await expectIncludeRejected({ palette: "Nowhere" });
    });

    test("draws nothing and logs an error when the palette includes itself", async (): Promise<void> => {
      await expectIncludeRejected({ palette: "Screen" });
    });

    test("logs an error when a palette includes itself through another palette", async (): Promise<void> => {
      const consoleError = vi.spyOn(console, "error").mockImplementation((): void => {});
      const screenPalette = {
        name: "Screen",
        cells: { "loop": includeCell({ palette: "Loop", columnSpan: 2 }), "after": symbolCell("After", 1, 3) }
      };
      // Screen nests Loop, Loop nests Mid, Mid includes Screen: the chain has to carry through each level.
      const loopPalette = {
        name: "Loop",
        cells: { "mid": includeCell({ palette: "Mid" }) }
      };
      const midPalette = {
        name: "Mid",
        cells: { "back": includeCell({ palette: "Screen" }) }
      };
      adaptivePaletteGlobals.paletteStore.addPalette(screenPalette as JsonPaletteType);
      adaptivePaletteGlobals.paletteStore.addPalette(loopPalette as JsonPaletteType);
      adaptivePaletteGlobals.paletteStore.addPalette(midPalette as JsonPaletteType);

      render(html`<${Palette} json=${screenPalette}/>`);

      expect(await screen.findByText("After")).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalledWith(expect.stringMatching(/^PaletteInclude "back": .* drawn inside itself/));
    });

    test("a cell keeps its element when the next palette has a cell with the same id", async (): Promise<void> => {
      // "shared" is the second cell here and the first in `second`: only a key matches them up.
      const first = {
        name: "First", cells: { "one": symbolCell("One", 1, 1), "shared": symbolCell("Shared", 1, 2) }
      };
      const second = {
        name: "Second", cells: { "shared": symbolCell("Shared", 1, 2), "two": symbolCell("Two", 1, 1) }
      };

      const { rerender } = render(html`<${Palette} json=${first}/>`);
      await screen.findByText("Shared");
      const sharedBefore = buttonFor("Shared");

      rerender(html`<${Palette} json=${second}/>`);
      await screen.findByText("Two");

      expect(buttonFor("Shared")).toBe(sharedBefore);
    });
  });
});
