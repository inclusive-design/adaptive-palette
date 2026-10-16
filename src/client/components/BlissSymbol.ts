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
import { getSvgElement } from "../utils/SvgUtils";
import { AiBadge } from "./AiBadge";
import { SymbolCompositionType } from "../index.d";

export const GRAPHIC_ROLE = "graphic-symbol img";

type BlissSymbolPropsType = {
  // The symbol to draw. Absent for a picture, or for a cell that shows its label only.
  composition?: SymbolCompositionType,
  // The path of a picture file, drawn in place of the symbol.
  picture?: string,
  label: string,
  // Aria markup information for svg part of the BlissSymbol.  The first is
  // really a boolean, but the html template function converts it to string
  // values.
  isPresentation: "true" | "false",
  // @id of label element when isPresntation is "false"
  labelledBy?: string,
  // True when the label's provenance is to be marked: the badge before the label, and the
  // label italicised. The caller folds in the config; this only draws it. Only meaningful when
  // `isPresentation` is "true": otherwise the label element is the `aria-labelledby` target, and
  // the badge could land in the computed accessible name despite being `aria-hidden`.
  isMarked?: boolean
}

/**
 * Hide a picture that could not be loaded, so no broken-image icon shows. The label stays.
 * @param {Event} event - The picture's `error` event.
 */
function hidePicture (event: Event): void {
  const img = event.currentTarget as HTMLImageElement;
  img.hidden = true;
  console.error(`Picture not loaded: ${img.src}`);
}

export function BlissSymbol (props: BlissSymbolPropsType): VNode {
  const { composition, picture, label, isPresentation, labelledBy, isMarked } = props;
  // A picture is drawn in place of the symbol, so the symbol is not built.
  const svgElement = picture === undefined && composition !== undefined ? getSvgElement(composition) : undefined;

  // Deal with aria markup, depending on whether the SVG is for presentation only or
  // associates with a labelled area.
  let svgMarkupString = "";
  if (svgElement) {
    if (isPresentation === "true") {
      svgElement.setAttribute("aria-hidden", "true");
    } else {
      svgElement.setAttribute("role", `${GRAPHIC_ROLE}`);
      if (labelledBy) {
        svgElement.setAttribute("aria-labelledby", labelledBy);
      }
    }
    svgMarkupString = svgElement.outerHTML;
  }

  // The construction below is _only_ for the unit tests to avoid the error:
  // "Argument of type 'any[]' is not assignable to parameter of type
  // 'TemplateStringsArray.  Property raw is mssing ..."
  // see: https://stackoverflow.com/questions/50706337/importing-html-to-typescript-to-use-as-templatestringliteral#answer-51012181
  const templateStringArray = Object.assign(
    [`${svgMarkupString}`],
    { raw: [`${svgMarkupString}`] }
  ) as unknown as TemplateStringsArray;

  const labelClass = isMarked ? "aiLabel" : undefined;
  const badge = isMarked ? html`<${AiBadge} />` : null;

  // The picture is decorative: the label names the cell. Keyed by its path, so a new picture
  // gets a new element rather than one an earlier failure hid.
  const pictureElement = picture === undefined ? null : html`
    <img key=${picture} class="cellPicture" src=${picture} alt="" aria-hidden="true" onError=${hidePicture} />
  `;

  return html`
    ${pictureElement}${html(templateStringArray)}
    <div id="${labelledBy}" class=${labelClass}>${badge}${label}</div>
  `;
}
