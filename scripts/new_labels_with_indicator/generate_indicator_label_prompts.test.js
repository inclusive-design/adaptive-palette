import { describe, expect, test } from "vitest";
import { generateRows, SYSTEM_PROMPTS } from "./generate_indicator_label_prompts.js";

const WORDS = [{ id: 131, gloss: "apple", glossSv: "äpple", pos: "noun", explanation: "fruit" }];
const INDICATORS = [{ id: 99, group: "Nominal", indicatorName: "plural", purpose: "Marks plural" }];

describe("generateRows", () => {

  test("asks with the English gloss by default", () => {
    expect(generateRows(WORDS, INDICATORS)[0].prompt).toContain("Word: \"apple\"");
  });

  test("asks with the Swedish gloss in Swedish", () => {
    const [row] = generateRows(WORDS, INDICATORS, "sv");
    expect(row.prompt).toContain("Word: \"äpple\"");
    expect(row.gloss).toBe("äpple");
  });

  test("falls back to the English gloss when there is no Swedish one", () => {
    const [row] = generateRows([{ ...WORDS[0], glossSv: undefined }], INDICATORS, "sv");
    expect(row.gloss).toBe("apple");
  });
});

test("has a system prompt per language", () => {
  expect(SYSTEM_PROMPTS.sv).toContain("svenska");
});
