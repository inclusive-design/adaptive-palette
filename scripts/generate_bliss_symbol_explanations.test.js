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
import {
  cleanSwedishGloss, parseCsv, swedishGlossesById, withSwedishGloss
} from "./generate_bliss_symbol_explanations.js";

test("parseCsv reads quoted fields with commas and doubled quotes", () => {
  expect(parseCsv("a,\"b,c\",\"say \"\"hi\"\"\"\r\n1,2,3\n")).toEqual([
    ["a", "b,c", "say \"hi\""],
    ["1", "2", "3"]
  ]);
});

test("cleanSwedishGloss turns underscores to spaces and evens out the commas", () => {
  expect(cleanSwedishGloss("hoppsan!,Oj_då!")).toBe("hoppsan!, Oj då!");
  expect(cleanSwedishGloss("ut ur kropp_ (nedåt), avföring")).toBe("ut ur kropp (nedåt), avföring");
  expect(cleanSwedishGloss(" ")).toBeUndefined();
  expect(cleanSwedishGloss("\"")).toBeUndefined();
  expect(cleanSwedishGloss("procent,%")).toBe("procent, %");
});

test("swedishGlossesById joins on the BCI-AV id and skips empty cells", () => {
  const csv = "BCI-AV#,English,Swedish\n8483,exclamation_mark,utropstecken\n8484,percent,\n";
  expect(swedishGlossesById(csv)).toEqual(new Map([[8483, "utropstecken"]]));
});

test("withSwedishGloss puts glossSv after gloss, and adds none without a match", () => {
  const swedish = new Map([[8483, "utropstecken"]]);
  const item = { id: 1, bciAvId: 8483, gloss: "exclamation mark", pos: "expression", isCharacter: true };
  expect(Object.keys(withSwedishGloss(item, swedish))).toEqual(
    ["id", "bciAvId", "gloss", "glossSv", "pos", "isCharacter"]
  );
  expect(withSwedishGloss({ id: 7, gloss: "apostrophe", isCharacter: true }, swedish))
    .not.toHaveProperty("glossSv");
});
