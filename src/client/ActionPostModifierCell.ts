/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { VNode } from "preact";
import { ActionModifierCodeCellPropsType, ActionModifierCellCommon }
  from "./ActionModifierCellCommon";

const APPENDED = false;

/*
 * A "post" modifier is a modifier symbol that is appended to the current
 * Bliss-word in the input area.
 */
export function ActionPostModifierCell (props: ActionModifierCodeCellPropsType): VNode {
  return ActionModifierCellCommon (props, APPENDED);
}

