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

import { INPUT_AREA_CLASS, elementAllowsTextEntry, inputAreaElement } from "./TextEntryUtils";

describe("elementAllowsTextEntry", (): void => {

  test("the input area does not take text, whatever its id", (): void => {
    const area = document.createElement("div");
    area.id = "a-palette-specific-id";
    area.className = INPUT_AREA_CLASS;
    area.setAttribute("role", "textbox");
    expect(elementAllowsTextEntry(area)).toBe(false);
  });

  test("another textbox takes text", (): void => {
    const box = document.createElement("div");
    box.setAttribute("role", "textbox");
    expect(elementAllowsTextEntry(box)).toBe(true);
  });

  test("a text input takes text", (): void => {
    expect(elementAllowsTextEntry(document.createElement("input"))).toBe(true);
  });
});

describe("inputAreaElement", (): void => {

  test("finds the input area, not the message preview that comes first", (): void => {
    const preview = document.createElement("div");
    preview.className = `${INPUT_AREA_CLASS} messagePreviewArea`;
    const area = document.createElement("div");
    area.className = INPUT_AREA_CLASS;
    document.body.append(preview, area);
    try {
      expect(inputAreaElement()).toBe(area);
    } finally {
      preview.remove();
      area.remove();
    }
  });
});
