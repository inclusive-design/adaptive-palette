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

import { composeWordContents } from "./GlobalData";
import { ContentBmwEncodingType } from "./index.d";
import { ToggleIsComposingWords } from "./ToggleIsComposingWords";
import { ContentEncodingInputField } from "./ContentEncodingInputField";
import "./ContentBmwEncoding.scss";

const ARIA_LABEL = "Compose Words";

type ContentComposeWordsEntryProps = {
  id: string,
  options: ContentBmwEncodingType
}

export function ContentComposeWordsEntry (props: ContentComposeWordsEntryProps): VNode {

  return html`
    <${ToggleIsComposingWords} />
    <${ContentEncodingInputField}
      id="${props.id}"
      options=${props.options}
      contentsSignal=${composeWordContents}
      ariaLabel="${ARIA_LABEL}"
    />
  `;
}

