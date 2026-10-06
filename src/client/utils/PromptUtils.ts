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

import type { Language } from "../i18n/I18n";
import type { PromptType } from "../index.d";

/**
 * Substitute `{{name}}` placeholders in a prompt template. Placeholders with no matching
 * value are left in place.
 * @param {string} template - The template text.
 * @param {Record<string, string>} values - Placeholder values by name.
 * @returns {string}
 */
export function renderTemplate (template: string, values: Record<string, string>): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (placeholder, name: string) => (name in values ? values[name] : placeholder)
  );
}

/**
 * Render a line-per-field prompt template, dropping every line whose placeholders are all
 * empty. This lets one template cover prompts where some fields are unknown, instead of one
 * template per combination. A line holding a mix of empty and non-empty placeholders is
 * kept, so an empty field cannot take a filled one down with it. A placeholder with no
 * matching value at all is left in place, as in `renderTemplate()`, and its line is kept.
 * @param {string} template - The template text, one field per line.
 * @param {Record<string, string>} values - Placeholder values by name.
 * @returns {string}
 */
export function renderPromptLines (template: string, values: Record<string, string>): string {
  return template
    .split("\n")
    .filter((line) => {
      const placeholders = [...line.matchAll(/\{\{(\w+)\}\}/g)];
      return placeholders.length === 0 || !placeholders.every(
        ([, name]) => name in values && values[name].trim().length === 0
      );
    })
    .map((line) => renderTemplate(line, values))
    .join("\n");
}

/**
 * A feature's two prompts in a language. A plain-string prompt serves every language; a
 * prompt per language serves only the languages it names. `undefined` when either has no
 * text for the language: the feature is then off, as if it were not configured.
 * @param {object | undefined} section - The feature's config section.
 * @param {Language} language - The language to ask in.
 * @returns {{ systemPrompt: string, userPrompt: string } | undefined}
 */
export function promptsFor (
  section: { systemPrompt: PromptType, userPrompt: PromptType } | undefined, language: Language
): { systemPrompt: string, userPrompt: string } | undefined {
  const pick = (prompt: PromptType | undefined): string =>
    (typeof prompt === "string" ? prompt : prompt?.[language]) ?? "";
  const systemPrompt = pick(section?.systemPrompt);
  const userPrompt = pick(section?.userPrompt);
  return systemPrompt.trim() && userPrompt.trim() ? { systemPrompt, userPrompt } : undefined;
}
