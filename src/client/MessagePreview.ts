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
import { useId } from "preact/hooks";

import { changeEncodingContents } from "./GlobalData";
import { generateMarkupArray } from "./ContentEncoding";
import "./MessagePreview.scss";

export const MESSAGE_PREVIEW_LABEL = "Message so far";

/**
 * A read-only view of the message being composed, shown inside the symbol-entry
 * dialogs. `showModal()` renders the real input area inert.
 *
 * The region is named by `aria-labelledby` rather than `aria-label` so the visible
 * heading and the accessible name are one and the same string; an `aria-label`
 * alongside the visible text makes a screen reader announce it twice in a row.
 *
 * It is deliberately not a live region. Each dialog owns a `role="status"` element
 * that announces every add, and a second live region here would race it.
 *
 * The label id comes from `useId` because this component is shared by more than one
 * dialog. Only one dialog body is mounted at a time.
 * @returns {VNode}
 */
export function MessagePreview (): VNode {
  const { payloads, caretPosition } = changeEncodingContents.value;
  const labelId = useId();

  return html`
    <div class="messagePreview">
      <span id=${labelId} class="messagePreviewLabel">${MESSAGE_PREVIEW_LABEL}:</span>
      <div
        class="contentEncodingArea messagePreviewArea"
        role="group"
        aria-labelledby=${labelId}>
        ${generateMarkupArray(payloads, caretPosition)}
      </div>
    </div>
  `;
}
