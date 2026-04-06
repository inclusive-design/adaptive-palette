/*
 * Copyright 2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { VNode } from "preact";
import { html } from "htm/preact";

import { isComposing } from "./GlobalData";
import "./ToggleIsComposingWords.scss";

export function ToggleIsComposingWords (): VNode {
  let isToggled = isComposing.value;

  const onClicked = () => {
    isToggled = isComposing.value;
    isComposing.value = !isToggled;
  };

  return html`
    <span id="toggleComposeWordsLabel" class="labelText">Compose:</span>
    <label class="toggleComposeWords" tabindex="0">
      <input type="checkbox" checked="${isToggled}" onClick=${onClicked} aria-labelledby="toggleComposeWordsLabel"/>
      <span class="slider round"></span>
    </label>
  `;
}
