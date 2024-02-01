/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { html } from "htm/preact";
import { getSvgElement } from "./SvgUtils";
import { BciAvIdType } from "./index.d";

export const GRAPHIC_ROLE = "graphic-symbol img";

type BlissSymbolPropsType = {
  bciAvId: BciAvIdType,
  label: string,
  // Aria markup information for svg part of the BlissSymbol.  The first is
  // really a boolean, but the html template function converts it to string
  // values.
  isPresentation: "true" | "false",
  // @id of label element when isPresntation is "false"
  labelledBy?: string
}

export function BlissSymbol (props: BlissSymbolPropsType) {
  const { bciAvId, label, isPresentation, labelledBy } = props;
  const svgElement = getSvgElement(bciAvId);

  let svgMarkupString = "";
  if (svgElement) {
    // Deal with aria markup, depending on whether the SVG is for presentation only or
    // associates with a labelled area.
    if (isPresentation === "true") {
      svgElement.setAttribute("aria-hidden", true);
    } else {
      svgElement.setAttribute("role", `${GRAPHIC_ROLE}`);
      svgElement.setAttribute("aria-labelledby", labelledBy);
    }
    svgMarkupString = svgElement.outerHTML;
  }

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

  return html`
    ${html(templateStringArray)}
    <div id="${labelledBy}">${label}</div>
  `;
}
