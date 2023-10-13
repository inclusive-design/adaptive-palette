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
import { msgSignal } from "./GlobalStates";
import "./PaletteCell.scss";

export function PaletteCell (props) {
  // const {stateBmwEncodingAction, setStateBmwEncodingAction} = getStateBmwEncodingAction();

  const cellClicked = () => {
    // setStateBmwEncodingAction({
    //   "actionType": "add",
    //   "payload": {
    //     "id": props.id,
    //     "label": props.labelText,
    //     "bciAvId": props.bciAvId
    //   }
    // });
    // console.log("click: ", stateBmwEncodingAction);
    // setStateBmwEncodingAction(() => {
    //   return {
    //     "actionType": "add",
    //     "payload": {
    //       "id": props.id,
    //       "label": props.labelText,
    //       "bciAvId": props.bciAvId
    //     }
    //   };
    //   console.log("after cell clicked: ", stateBmwEncodingAction);
    // });
    msgSignal.value = {
      actionType: "addBmwCode",
      payload: {
        "id": props.id,
        "label": props.labelText,
        "bciAvId": props.bciAvId
      }
    };
  };

  // Basic styles are the `paletteCell` class defined in PaletteCell.css.
  // Concatenate any additional classes provided by `props`.
  let classes = "paletteCell";
  if (props.class) {
    classes = `${classes} ${props.class}`;
  }
  let disabled = false;
  if (classes.indexOf("disabled") >= 0) {
    disabled = true;
  }

  // Also concatenate local styles with given grid cell styles
  let styles = `
    grid-column: ${props.columnStart} / span ${props.columnSpan};
    grid-row: ${props.rowStart} / span ${props.rowSpan};
  `;
  if (props.style) {
    styles = `${styles} ${props.style}`;
  }

  return html`
    <button id="${props.id}" class="${classes}" style="${styles}" disabled=${disabled} onClick=${cellClicked}>
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="presentation">
        <circle cx="5" cy="5" r="4" fill="transparent" stroke="black" stroke-width="1"/>
      </svg>
      ${props.labelText}
    </button>
  `;
}
