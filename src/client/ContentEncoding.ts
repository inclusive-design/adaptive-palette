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

import { changeEncodingContents } from "./GlobalData";
import { ContentEncodingType } from "./index.d";
import { ContentEncodingInputField } from "./ContentEncodingInputField";
import "./ContentEncoding.scss";

const ARIA_LABEL = "Input Area";

type ContentEncodingProps = {
  id: string,
  options: ContentEncodingType
}

export function ContentEncoding (props: ContentEncodingProps): VNode {

  return html`
    <${ContentEncodingInputField}
      id="${props.id}"
      options=${props.options}
      contentsSignal=${changeEncodingContents}
      ariaLabel="${ARIA_LABEL}"
    />
  `;
}
