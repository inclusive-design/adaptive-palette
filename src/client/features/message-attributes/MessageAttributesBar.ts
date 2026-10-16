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
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { BlissSymbol } from "../../components/BlissSymbol";
import { goToPalette } from "../../core/PaletteNavigation";
import { announceIfEnabled } from "../../utils/SpeechUtils";
import { t } from "../../i18n/I18n";
import type { MessageAttributeType } from "../../index.d";
import { attributeLabel, categoryName, selectedAttributesSignal, toggleAttribute } from "./MessageAttributesState";
import "./MessageAttributesBar.scss";

// The palette "+N" opens: the one the command bar's Msg Style opens.
const ATTRIBUTES_PALETTE = "attributes";

/**
 * How many chips fit across the bar. Every chip is 4rem wide, so the bar's width is all this needs.
 * @param {HTMLElement} bar - The bar.
 * @returns {number}
 */
function chipsThatFit (bar: HTMLElement): number {
  const chipWidth = 4 * parseFloat(getComputedStyle(document.documentElement).fontSize);
  const gap = parseFloat(getComputedStyle(bar).columnGap) || 0;
  return Math.floor((bar.clientWidth + gap) / (chipWidth + gap));
}

/**
 * An attribute's name, as its chip announces it.
 * @param {MessageAttributeType} attribute - The attribute.
 * @returns {string}
 */
const attributeName = (attribute: MessageAttributeType): string =>
  `${categoryName(attribute.category)}: ${attributeLabel(attribute)}`;

/**
 * The attributes set on the message being composed: one chip each, and tapping a chip takes
 * that attribute off.
 *
 * It sits at the left of the top bar, on one 44px line. It draws the chips that fit. When they
 * do not all fit, the last place holds "+N": it stands for the chips left out, and opens the
 * attributes palette, which shows them all. A chip left out is not drawn, so Tab, scanning and
 * screen readers skip it; the "+N" label names it.
 *
 * Nothing is rendered when no attribute is set.
 * @returns {VNode | null}
 */
export function MessageAttributesBar (): VNode | null {
  const attributes = selectedAttributesSignal.value;
  const isShown = attributes.length > 0;
  const barRef = useRef<HTMLDivElement>(null);
  // How many chips fit. Counted again when the bar's width changes: a window resize, or the
  // notice beside it changing length with the language.
  const [room, setRoom] = useState(Infinity);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) {
      return;
    }
    const count = (): void => setRoom(chipsThatFit(bar));
    count();
    const observer = new ResizeObserver(count);
    observer.observe(bar);
    return (): void => observer.disconnect();
  }, [isShown]);

  // After a chip is removed, focus the element now in its place, or the last one when it was
  // last. Chosen after the render, since removing a chip can also remove "+N".
  const focusIndexRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const index = focusIndexRef.current;
    focusIndexRef.current = null;
    const children = barRef.current?.children;
    if (index !== null && children && children.length > 0) {
      (children[Math.min(index, children.length - 1)] as HTMLElement).focus();
    }
  }, [attributes]);

  if (!isShown) {
    return null;
  }

  const drawn = attributes.length <= room ? attributes : attributes.slice(0, Math.max(0, room - 1));
  const hidden = attributes.slice(drawn.length);

  const chips = drawn.map((attribute) => {
    const label = attributeLabel(attribute);
    const name = attributeName(attribute);
    // A chip only exists for an attribute that is currently set, and a click on it removes it,
    // so the announcement is always "off" -- no state read needed.
    const chipClicked = (event: Event): void => {
      const chip = event.currentTarget as HTMLElement;
      // Removing the last chip unmounts the bar, so focus falls back to document.body as there
      // is no obviously right target.
      focusIndexRef.current = Array.from(chip.parentElement?.children ?? []).indexOf(chip);
      toggleAttribute(attribute);
      announceIfEnabled(t("attributeOff", { name }));
    };
    return html`
      <button
        key=${`${attribute.category}:${JSON.stringify(attribute.composition)}`}
        class="messageAttributeChip"
        aria-label=${t("attributeRemove", { name })}
        onClick=${chipClicked}>
        <${BlissSymbol}
          composition=${attribute.composition}
          label=${label}
          isPresentation="true"
        />
      </button>
    `;
  });

  const moreLabel = t("attributeMore", { count: hidden.length, names: hidden.map(attributeName).join(", ") });
  const moreClicked = (): void => {
    announceIfEnabled(moreLabel);
    void goToPalette(ATTRIBUTES_PALETTE);
  };
  const more = hidden.length === 0 ? null : html`
    <button
      key="more"
      class="messageAttributeChip messageAttributeMore"
      aria-label=${moreLabel}
      onClick=${moreClicked}>
      +${hidden.length}
    </button>
  `;

  return html`<div class="messageAttributesBar" ref=${barRef}>${chips}${more}</div>`;
}
