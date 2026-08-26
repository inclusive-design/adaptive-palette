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
 * The attributes set on the message being composed: what the message is for, how it should
 * sound, how the user feels, and how urgent it is.
 *
 * They are message-level: they belong to the one message and clear with it. They are held apart
 * from the message itself so they never reach speech or the message log as content.
 */
import { signal } from "@preact/signals";
import type { MessageAttributeType } from "../../index.d";

/**
 * The order the categories are reported to the model in. It matches the row order of
 * `public/palettes/attributes.json`, so the prompt reads the way the palette looks. A category
 * not listed here is still reported, after these, in the order it was selected — but only these
 * four are placed to match the palette; adding a palette row in a new category means adding it
 * here too if it should be reported in position.
 */
const CATEGORY_ORDER = ["Intent", "Tone", "Feeling", "Priority"];

/**
 * Nothing selected. Shared rather than rewritten at each use, so `clearAttributes()` on an
 * already-empty selection does not publish a new array and wake every reader. Frozen so a
 * consumer mutating what it reads (e.g. `.push()`) cannot poison this shared empty state.
 */
const NO_ATTRIBUTES: readonly MessageAttributeType[] = Object.freeze([]);

/**
 * The attributes currently set, in the order they were selected. Read freely; write through
 * `toggleAttribute()` and `clearAttributes()`.
 */
export const selectedAttributesSignal = signal<readonly MessageAttributeType[]>(NO_ATTRIBUTES);

/**
 * Whether two attributes are the same one. Compared by category and label rather than by
 * identity: the cell builds a fresh object on every render.
 * @param {MessageAttributeType} first - One attribute.
 * @param {MessageAttributeType} second - The other.
 * @returns {boolean}
 */
function isSameAttribute (first: MessageAttributeType, second: MessageAttributeType): boolean {
  return first.category === second.category && first.label === second.label;
}

/**
 * Whether an attribute is currently set.
 * @param {MessageAttributeType} attribute - The attribute to look for.
 * @returns {boolean}
 */
export function isAttributeSelected (attribute: MessageAttributeType): boolean {
  return selectedAttributesSignal.value.some((selected) => isSameAttribute(selected, attribute));
}

/**
 * Set an attribute that is not set, or unset one that is.
 * @param {MessageAttributeType} attribute - The attribute the user tapped.
 * @returns {void}
 */
export function toggleAttribute (attribute: MessageAttributeType): void {
  const selected = selectedAttributesSignal.peek();
  const without = selected.filter((existing) => !isSameAttribute(existing, attribute));
  selectedAttributesSignal.value = without.length === selected.length
    ? [...selected, attribute]
    : without;
}

/**
 * Unset every attribute. Called wherever the message is discarded.
 * @returns {void}
 */
export function clearAttributes (): void {
  if (selectedAttributesSignal.peek().length > 0) {
    selectedAttributesSignal.value = NO_ATTRIBUTES;
  }
}

/**
 * The attributes as one line for a prompt: categories in palette order, separated by
 * semicolons, with several attributes in one category separated by commas. For example
 * `Intent: question; Feeling: angry`. Empty when nothing is selected, which is what lets
 * `renderPromptLines()` drop the line.
 *
 * Reads the signal rather than peeking it, so an effect that calls this is subscribed to it.
 * @returns {string}
 */
export function attributesPromptText (): string {
  const selected = selectedAttributesSignal.value;
  const rank = (category: string): number => {
    const index = CATEGORY_ORDER.indexOf(category);
    return index === -1 ? CATEGORY_ORDER.length : index;
  };
  return [...new Set(selected.map((attribute) => attribute.category))]
    .sort((first, second) => rank(first) - rank(second))
    .map((category) => {
      const labels = selected
        .filter((attribute) => attribute.category === category)
        .map((attribute) => attribute.label)
        .join(", ");
      return `${category}: ${labels}`;
    })
    .join("; ");
}
