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
 * The UI language and the text shown in it.
 *
 * A leaf module: it imports only the strings files and signals, so `Config.ts` and any cell
 * can import it without making a cycle.
 */
import { signal } from "@preact/signals";
import { en } from "./en";
import { sv } from "./sv";

export const LANGUAGES = ["en", "sv"] as const;
export type Language = typeof LANGUAGES[number];
export type StringKey = keyof typeof en;

// Each language named in itself, so a user can find their own in the list.
export const LANGUAGE_NAMES: Record<Language, string> = { en: "English", sv: "Svenska" };

// The voice each language is spoken in.
export const SPEECH_LANGS: Record<Language, string> = { en: "en-US", sv: "sv-SE" };

const STRINGS: Record<Language, Record<StringKey, string>> = { en, sv };

/**
 * The language the UI is shown in. A component that calls `t()` while rendering reads this
 * signal, so it draws again when the language changes.
 */
export const languageSignal = signal<Language>("en");

/**
 * A language code this app supports, or `undefined` for anything else.
 * @param {unknown} value - A code from the URL, the config or the store.
 * @returns {Language | undefined}
 */
export function parseLanguage (value: unknown): Language | undefined {
  return LANGUAGES.includes(value as Language) ? value as Language : undefined;
}

/**
 * The language to start in: `?lang=` in the page URL when it names a supported language,
 * otherwise the configured one, which already has the user's saved choice applied.
 * @param {string} search - `window.location.search`.
 * @param {Language} configured - `config.language`.
 * @returns {Language}
 */
export function startLanguage (search: string, configured: Language): Language {
  return parseLanguage(new URLSearchParams(search).get("lang")) ?? configured;
}

/**
 * A UI string in the current language, with each `{{name}}` filled from `vars`. A
 * placeholder with no value is left as it is, so the gap shows.
 * @param {StringKey} key - The string's key in `en.ts`.
 * @param {Record<string, string | number>} vars - The placeholder values.
 * @returns {string}
 */
export function t (key: StringKey, vars: Record<string, string | number> = {}): string {
  return STRINGS[languageSignal.value][key].replace(
    /\{\{(\w+)\}\}/g, (match, name: string) => Object.hasOwn(vars, name) ? String(vars[name]) : match
  );
}
