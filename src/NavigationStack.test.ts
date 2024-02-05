/*
 * Copyright 2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
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
        "bciAvId": 16991,
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
        "bciAvId": 19961,
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
        "bciAvId": 666,
        "rowStart": 2,
        "rowSpan": 2,
        "columnStart": 2,
        "columnSpan": 2
      }
    }
  }
};

describe("NavigationStack module - basics", () => {

  const navigation = new NavigationStack();

  test("Empty NavigationStack", () => {
    expect(navigation.isEmpty()).toBe(true);
    expect(navigation.currentPalette).toBe(null);
  });

  test("Current palette accessors", () => {
    navigation.currentPalette = testPalette1;
    expect(navigation.currentPalette).toBe(testPalette1);
    navigation.currentPalette = null;
    expect(navigation.currentPalette).toBe(null);
  });

  test("Flush and reset the navigation stack", () => {
    navigation.flushReset(testPalette2);
    expect(navigation.isEmpty()).toBe(true);
    expect(navigation.currentPalette).toBe(testPalette2);
  });
});

describe("NavigationStack module - pushing and popping", () => {

  const navigation = new NavigationStack();

  beforeEach (() => {
    navigation.flushReset(null);
  });

  test("Non-empty NavigationStack", () => {
    navigation.push(testPalette1);
    expect(navigation.isEmpty()).toBe(false);
    expect(navigation.peek()).toBe(testPalette1);
    expect(navigation.currentPalette).toBe(null);
  });

  test("Pop the top of the stack", () => {
    navigation.push(testPalette1);
    const topPalette = navigation.pop();
    expect(topPalette).toBe(testPalette1);
    expect(navigation.isEmpty()).toBe(true);
    // The current palette should be unaffected by a pop operation.
    expect(navigation.currentPalette).toBe(null);
  });

  test("Multiple layers and a current palette", () => {
    navigation.push(testPalette1);
    navigation.push(testPalette2);
    navigation.currentPalette = testPalette1;
    expect(navigation.isEmpty()).toBe(false);
    expect(navigation.peek()).toBe(testPalette2);
    expect(navigation.peek(1)).toBe(testPalette1);
    expect(navigation.currentPalette).toBe(testPalette1);
  });

  test("Check invalid peek()", () => {
    navigation.push(testPalette1);
    navigation.push(testPalette2);
    expect(navigation.isEmpty()).toBe(false);
    expect(navigation.peek(-1)).toBe(undefined);
    expect(navigation.peek(1024)).toBe(undefined);
  });

  test("Check pop and set current utility function", () => {
    navigation.currentPalette = testPalette1;
    navigation.push(testPalette1);
    navigation.push(testPalette2);
    const poppedPalette = navigation.popAndSetCurrent(testPalette2);
    expect(poppedPalette).toBe(testPalette2);
    expect(navigation.peek()).toBe(testPalette1);
    expect(navigation.currentPalette).toBe(testPalette2);
  });

});
