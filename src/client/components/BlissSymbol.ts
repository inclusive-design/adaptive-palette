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
  // The colour of the symbol's strokes and letters, as a CSS colour. Black when absent.
  color?: string,
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
  isMarked?: boolean,
  // True when the label waits for a model's answer: the label is dimmed, with "…" after it.
  isPending?: boolean
}

// One template per SVG markup string. `html` keeps every template array it is given, keyed by
// the array itself, and never drops one, so a new array on each draw would grow without end.
const svgTemplates = new Map<string, TemplateStringsArray>();

/**
 * The SVG markup as a template `html` can parse into elements. `html` takes a
 * `TemplateStringsArray`, which is an array of strings with a `raw` copy of itself.
 * @param {string} markup - The SVG markup, or the empty string for no symbol.
 * @returns {TemplateStringsArray}
 */
function svgTemplate (markup: string): TemplateStringsArray {
  let template = svgTemplates.get(markup);
  if (!template) {
    template = Object.assign([markup], { raw: [markup] });
    svgTemplates.set(markup, template);
  }
  return template;
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
  const { composition, picture, label, color, isPresentation, labelledBy, isMarked, isPending } = props;
  // A picture is drawn in place of the symbol, so the symbol is not built.
  const svgElement = picture === undefined && composition !== undefined ? getSvgElement(composition, color) : undefined;

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

  const templateStringArray = svgTemplate(svgMarkupString);

  const labelClass = [isMarked && "aiLabel", isPending && "pendingLabel"].filter(Boolean).join(" ") || undefined;
  const badge = isMarked ? html`<${AiBadge} />` : null;
  // Hidden from screen readers, which read the label alone.
  const waiting = isPending ? html`<span aria-hidden="true">…</span>` : null;

  // The picture is decorative: the label names the cell. Keyed by its path, so a new picture
  // gets a new element rather than one an earlier failure hid.
  const pictureElement = picture === undefined ? null : html`
    <img key=${picture} class="cellPicture" src=${picture} alt="" aria-hidden="true" onError=${hidePicture} />
  `;

  return html`
    ${pictureElement}${html(templateStringArray)}
    <div id="${labelledBy}" class=${labelClass}>${badge}${label}${waiting}</div>
  `;
}
