/*
 * Copyright 2023 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { html } from "htm/preact";
import { getSvgMarkupString } from "./SvgUtils";

export type BciAvId = number | (string|number)[];

type BlissSymbolProps = {
  bciAvId: BciAvId,
  label: string
}

export function BlissSymbol (props: BlissSymbolProps) {
  const { bciAvId, label } = props;
  const svgMarkupString = getSvgMarkupString(bciAvId);

  // The coercion to `any` and assignment to `raw` is _only_ for the unit
  // tests to avoid the error:
  // "Argument of type 'any[]' is not assignable to parameter of type
  // 'TemplateStringsArray.  Property raw is mssing ..."
  // see: https://stackoverflow.com/questions/50706337/importing-html-to-typescript-to-use-as-templatestringliteral#answer-51012181
  // Also TypeScript-ESLint does not allow explicit `any` types; override that
  // rule for this case.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templateStringArray = [`${svgMarkupString}`] as any;
  templateStringArray.raw = [`${svgMarkupString}`];
  console.debug("templateStringArray.raw is " + (templateStringArray.raw ? templateStringArray.raw : "null"));

  return html`
    ${html(templateStringArray)}
    <div>${label}</div>
  `;
}
