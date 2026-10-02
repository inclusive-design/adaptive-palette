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
import { expect, test } from "vitest";
import { glossLabel } from "./draft_swedish_labels.js";

const symbolsById = new Map([
  [180, { id: 180, gloss: "bread, loaf of bread, loaf", glossSv: "bröd" }],
  [8, { id: 8, gloss: "friend", glossSv: "vän, kamrat, kompis" }],
  [7, { id: 7, gloss: "apostrophe" }]
]);

test("a single symbol labelled with its whole gloss takes the Swedish gloss", () => {
  expect(glossLabel("bread, loaf of bread, loaf", 180, symbolsById)).toBe("bröd");
});

test("a one-word English label takes the first Swedish sense only", () => {
  expect(glossLabel("friend", 8, symbolsById)).toBe("vän");
});

test("a hand-picked label, a composition or a symbol with no Swedish gloss needs the model", () => {
  expect(glossLabel("bread", 180, symbolsById)).toBeUndefined();
  expect(glossLabel("bread, loaf of bread, loaf", [180, "/", 7], symbolsById)).toBeUndefined();
  expect(glossLabel("apostrophe", 7, symbolsById)).toBeUndefined();
});
