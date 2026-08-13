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
import { ActionModifierCodeCellPropsType, ActionModifierCellCommon }
  from "./ActionModifierCellCommon";

const PREPENDED = true;

/*
 * A "pre" modifier is a modifier symbol that is prepended to the current symbol
 * in the input area.
 */
export function ActionPreModifierCell (props: ActionModifierCodeCellPropsType): VNode {
  return ActionModifierCellCommon(props, PREPENDED);
}
