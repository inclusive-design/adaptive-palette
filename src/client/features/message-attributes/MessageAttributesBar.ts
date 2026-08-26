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

import { VNode } from "preact";
import { html } from "htm/preact";
import { BlissSymbol } from "../../components/BlissSymbol";
import { announceIfEnabled } from "../../utils/SpeechUtils";
import { selectedAttributesSignal, toggleAttribute } from "./MessageAttributesState";
import "./MessageAttributesBar.scss";

/**
 * The attributes set on the message being composed: one chip each, and tapping a chip takes
 * that attribute off.
 *
 * It sits at the left of the top bar, opposite the symbol-entry triggers.
 *
 * Nothing is rendered when no attribute is set. No space is reserved for them.
 *
 * A chip is a little taller than the buttons beside it, so setting the first attribute grows
 * the top bar and nudges everything below it down. Accepted rather than giving the bar a
 * fixed height to save space.
 * @returns {VNode | null}
 */
export function MessageAttributesBar (): VNode | null {
  const attributes = selectedAttributesSignal.value;
  if (attributes.length === 0) {
    return null;
  }

  const chips = attributes.map((attribute) => {
    // A chip only exists for an attribute that is currently set, and a click on it removes it,
    // so the announcement is always "off" -- no state read needed.
    const chipClicked = (event: Event): void => {
      const chip = event.currentTarget as HTMLElement;
      // Captured before the toggle: `key`ing the chips by category/label (see the test for
      // the middle-removal case) means a surviving sibling is the same live DOM node after
      // the toggle, so focusing it afterwards is reliable.
      const next = (chip.nextElementSibling ?? chip.previousElementSibling) as HTMLElement | null;
      toggleAttribute(attribute);
      announceIfEnabled(`${attribute.category}: ${attribute.label}, off`);
      // Removing the last chip leaves no sibling and the bar unmounts, so focus
      // falls back to document.body as there is no obviously right target.
      next?.focus();
    };
    return html`
      <button
        key=${`${attribute.category}:${attribute.label}`}
        class="messageAttributeChip"
        aria-label="Remove ${attribute.category}: ${attribute.label}"
        onClick=${chipClicked}>
        <${BlissSymbol}
          composition=${attribute.composition}
          label=${attribute.label}
          isPresentation="true"
        />
      </button>
    `;
  });

  return html`<div class="messageAttributesBar">${chips}</div>`;
}
