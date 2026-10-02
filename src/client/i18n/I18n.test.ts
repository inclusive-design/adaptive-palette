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

import { languageSignal, parseLanguage, startLanguage, t } from "./I18n";
import { en } from "./en";
import { sv } from "./sv";

describe("I18n", () => {

  afterEach(() => {
    languageSignal.value = "en";
  });

  test("t() returns the string in the current language", () => {
    expect(t("close")).toBe("Close");
    languageSignal.value = "sv";
    expect(t("close")).toBe("Stäng");
  });

  test("t() fills placeholders and leaves an unfilled one showing", () => {
    expect(t("symbolAdded", { label: "bread" })).toBe("bread added to message");
    expect(t("searchFoundMany", { total: 3 })).toBe("3 symbols found for \"{{text}}\"");
  });

  test("every Swedish string keeps the English string's placeholders", () => {
    const placeholders = (text: string): string[] => (text.match(/\{\{\w+\}\}/g) ?? []).sort();
    (Object.keys(en) as (keyof typeof en)[]).forEach((key) => {
      expect(placeholders(sv[key]), key).toEqual(placeholders(en[key]));
    });
  });

  test("parseLanguage() accepts only supported codes", () => {
    expect(parseLanguage("sv")).toBe("sv");
    expect(parseLanguage("en")).toBe("en");
    expect(parseLanguage("de")).toBeUndefined();
    expect(parseLanguage(null)).toBeUndefined();
  });

  test("startLanguage(): the URL wins, and an unknown code falls through", () => {
    expect(startLanguage("?lang=sv", "en")).toBe("sv");
    expect(startLanguage("?set=mine&lang=en", "sv")).toBe("en");
    expect(startLanguage("?lang=xx", "sv")).toBe("sv");
    expect(startLanguage("", "sv")).toBe("sv");
  });
});
