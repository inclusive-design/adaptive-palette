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

import { NavigationStack } from "./NavigationStack";

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

  test("Empty NavigationStack", (): void => {
    expect(navigation.isEmpty()).toBe(true);
    expect(navigation.currentPalette).toBe(null);
  });

  test("Current palette accessors", (): void => {
    navigation.currentPalette = testPalette1;
    expect(navigation.currentPalette).toBe(testPalette1);
    navigation.currentPalette = null;
    expect(navigation.currentPalette).toBe(null);
  });

  test("Flush and reset the navigation stack", (): void => {
    navigation.flushReset(testPalette2);
    expect(navigation.isEmpty()).toBe(true);
    expect(navigation.currentPalette).toBe(testPalette2);
  });
});

describe("NavigationStack module - pushing and popping", (): void => {

  const navigation = new NavigationStack();

  test("Non-empty NavigationStack", (): void => {
    navigation.push(testPalette1);
    expect(navigation.isEmpty()).toBe(false);
    expect(navigation.peek()).toBe(testPalette1);
    expect(navigation.currentPalette).toBe(null);
  });

  test("Pop the top of the stack", (): void => {
    navigation.flushReset(null);
    navigation.push(testPalette1);
    const topPalette = navigation.pop();
    expect(topPalette).toBe(testPalette1);
    expect(navigation.isEmpty()).toBe(true);
    // The current palette should be unaffected by a pop operation.
    expect(navigation.currentPalette).toBe(null);
  });

  test("Multiple layers and a current palette", (): void => {
    navigation.push(testPalette1);
    navigation.push(testPalette2);
    navigation.currentPalette = testPalette1;
    expect(navigation.isEmpty()).toBe(false);
    expect(navigation.peek()).toBe(testPalette2);
    expect(navigation.peek(1)).toBe(testPalette1);
    expect(navigation.currentPalette).toBe(testPalette1);
  });

  test("Check invalid peek()", (): void => {
    navigation.push(testPalette1);
    navigation.push(testPalette2);
    expect(navigation.isEmpty()).toBe(false);
    expect(navigation.peek(-1)).toBe(undefined);
    expect(navigation.peek(1024)).toBe(undefined);
  });

  test("Check pop and set current utility function", (): void => {
    navigation.currentPalette = testPalette1;
    navigation.push(testPalette1);
    navigation.push(testPalette2);
    const poppedPalette = navigation.popAndSetCurrent(testPalette2);
    expect(poppedPalette).toBe(testPalette2);
    expect(navigation.peek()).toBe(testPalette1);
    expect(navigation.currentPalette).toBe(testPalette2);
  });

  test("Check peeking at the bottom of the stack", (): void => {
    navigation.flushReset(null);
    expect(navigation.isEmpty()).toBe(true);
    expect(navigation.peekLast()).toBe(undefined);
    navigation.push(testPalette1);
    navigation.push(testPalette2);
    expect(navigation.peekLast()).toBe(testPalette1);
  });

  test("depth tracks push, pop, and flushReset", (): void => {
    const navStack = new NavigationStack();

    navStack.flushReset(null);
    expect(navStack.depth).toBe(0);

    navStack.push(testPalette1);
    expect(navStack.depth).toBe(1);

    navStack.push(testPalette2);
    expect(navStack.depth).toBe(2);

    navStack.pop();
    expect(navStack.depth).toBe(1);

    navStack.flushReset(null);
    expect(navStack.depth).toBe(0);
  });

  test("depth is unchanged when push is given nothing", (): void => {
    const navStack = new NavigationStack();
    navStack.flushReset(null);

    navStack.push(null);
    expect(navStack.depth).toBe(0);
  });
});
