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
import { html } from "htm/preact";

import { NavigationStack } from "./NavigationStack";
import { navigationDepth } from "../state/NavigationSignals";

const RENDERING_TEST_ID = "renderingDiv";

const testPalette1 = {
  "name": "testPalette1",
  "cells": {
    "cellOne": {
      "type": "cellOneType",
      "options": {
        "label": "Singer",
        "composition": 2411,
        "rowStart": 1,
        "rowSpan": 1,
        "columnStart": 1,
        "columnSpan": 1
      }
    },
    "cellTwo": {
      "type": "cellTwoType",
      "options": {
        "label": "Dancer",
        "composition": 513,
        "rowStart": 2,
        "rowSpan": 3,
        "columnStart": 4,
        "columnSpan": 5
      }
    }
  }
};

const testPalette2 = {
  "name": "DifferentName",
  "cells": {
    "dummyCell": {
      "type": "dummyCellType",
      "options": {
        "label": "Choreographer",
        "composition": 823,
        "rowStart": 2,
        "rowSpan": 2,
        "columnStart": 2,
        "columnSpan": 2
      }
    }
  }
};


describe("NavigationStack module - basics", (): void => {

  const navigation = new NavigationStack();
  let renderingElement: HTMLElement;

  beforeAll(async (): Promise<void> => {
    render(html`<div data-testid="${RENDERING_TEST_ID}">Rendering div</div>`);
    renderingElement = await screen.findByTestId(RENDERING_TEST_ID);
  });

  test("Empty NavigationStack", (): void => {
    expect(navigation.isEmpty()).toBe(true);
    expect(navigation.currentPalette).toBe(null);
  });

  test("Current palette accessors", (): void => {
    const testStackItem1 = {
      palette: testPalette1,
      htmlElement: renderingElement
    };
    navigation.currentPalette = testStackItem1;
    expect(navigation.currentPalette).toBe(testStackItem1);
    navigation.currentPalette = null;
    expect(navigation.currentPalette).toBe(null);
  });

  test("Flush and reset the navigation stack", (): void => {
    const testStackItem2 = {
      palette: testPalette2,
      htmlElement: renderingElement
    };
    navigation.flushReset(testStackItem2);
    expect(navigation.isEmpty()).toBe(true);
    expect(navigation.currentPalette).toBe(testStackItem2);
  });
});

describe("NavigationStack module - pushing and popping", (): void => {

  const navigation = new NavigationStack();
  let renderingElement: HTMLElement;
  let testStackItem1: { palette: typeof testPalette1, htmlElement: HTMLElement };
  let testStackItem2: { palette: typeof testPalette2, htmlElement: HTMLElement };

  beforeAll(async (): Promise<void> => {
    render(html`<div data-testid="${RENDERING_TEST_ID}">Rendering div</div>`);
    renderingElement = await screen.findByTestId(RENDERING_TEST_ID);
    testStackItem1 = { palette: testPalette1, htmlElement: renderingElement };
    testStackItem2 = { palette: testPalette2, htmlElement: renderingElement };
  });

  test("Non-empty NavigationStack", (): void => {
    navigation.push(testStackItem1);
    expect(navigation.isEmpty()).toBe(false);
    expect(navigation.peek()).toBe(testStackItem1);
    expect(navigation.currentPalette).toBe(null);
  });

  test("Pop the top of the stack", (): void => {
    navigation.flushReset(null);
    navigation.push(testStackItem1);
    const topPalette = navigation.pop();
    expect(topPalette).toBe(testStackItem1);
    expect(navigation.isEmpty()).toBe(true);
    // The current palette should be unaffected by a pop operation.
    expect(navigation.currentPalette).toBe(null);
  });

  test("Multiple layers and a current palette", (): void => {
    navigation.push(testStackItem1);
    navigation.push(testStackItem2);
    navigation.currentPalette = testStackItem1;
    expect(navigation.isEmpty()).toBe(false);
    expect(navigation.peek()).toBe(testStackItem2);
    expect(navigation.peek(1)).toBe(testStackItem1);
    expect(navigation.currentPalette).toBe(testStackItem1);
  });

  test("Check invalid peek()", (): void => {
    navigation.push(testStackItem1);
    navigation.push(testStackItem2);
    expect(navigation.isEmpty()).toBe(false);
    expect(navigation.peek(-1)).toBe(undefined);
    expect(navigation.peek(1024)).toBe(undefined);
  });

  test("Check pop and set current utility function", (): void => {
    navigation.currentPalette = testStackItem1;
    navigation.push(testStackItem1);
    navigation.push(testStackItem2);
    const poppedPalette = navigation.popAndSetCurrent(testStackItem2);
    expect(poppedPalette).toBe(testStackItem2);
    expect(navigation.peek()).toBe(testStackItem1);
    expect(navigation.currentPalette).toBe(testStackItem2);
  });

  test("Check peeking at the bottom of the stack", (): void => {
    navigation.flushReset(null);
    expect(navigation.isEmpty()).toBe(true);
    expect(navigation.peekLast()).toBe(undefined);
    navigation.push(testStackItem1);
    navigation.push(testStackItem2);
    expect(navigation.peekLast()).toBe(testStackItem1);
  });

  test("navigationDepth tracks push, pop, and flushReset", (): void => {
    const navStack = new NavigationStack();
    const item1 = { palette: testPalette1, htmlElement: renderingElement };
    const item2 = { palette: testPalette2, htmlElement: renderingElement };

    navStack.flushReset(null);
    expect(navigationDepth.value).toBe(0);

    navStack.push(item1);
    expect(navigationDepth.value).toBe(1);

    navStack.push(item2);
    expect(navigationDepth.value).toBe(2);

    navStack.pop();
    expect(navigationDepth.value).toBe(1);

    navStack.flushReset(null);
    expect(navigationDepth.value).toBe(0);
  });

  test("navigationDepth is unchanged when push is given nothing", (): void => {
    const navStack = new NavigationStack();
    navStack.flushReset(null);

    navStack.push(null);
    expect(navigationDepth.value).toBe(0);
  });
});
