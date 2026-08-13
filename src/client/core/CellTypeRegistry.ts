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

/**
 * A registry mapping cell types (strings) to the components that render them.
 * This is deliberately kept separate from `GlobalData.ts` to prevent circular dependencies.
 */

import { ActionCodeCell } from "../cells/ActionCodeCell";
import { ActionBranchToPaletteCell } from "../cells/ActionBranchToPaletteCell";
import { ActionIndicatorCell } from "../cells/ActionIndicatorCell";
import { ActionPreModifierCell } from "../cells/ActionPreModifierCell";
import { ActionPostModifierCell } from "../cells/ActionPostModifierCell";
import { ActionRemoveIndicatorCell } from "../cells/ActionRemoveIndicatorCell";
import { ActionRemoveModifierCell } from "../cells/ActionRemoveModifierCell";
import { ActionSpeakCell } from "../cells/ActionSpeakCell";
import { CommandClearEncoding } from "../cells/CommandClearEncoding";
import { CommandClearSavedData } from "../cells/CommandClearSavedData";
import { CommandCursorBackward } from "../cells/CommandCursorBackward";
import { CommandCursorForward } from "../cells/CommandCursorForward";
import { CommandDelLastEncoding } from "../cells/CommandDelLastEncoding";
import { CommandGoBackCell } from "../cells/CommandGoBackCell";
import { CommandGoToRootCell } from "../cells/CommandGoToRootCell";
import { CommandMakeSentence } from "../features/telegraphic-translation/CommandMakeSentence";
import { ContentEncoding } from "../cells/ContentEncoding";

export const cellTypeRegistry = {
  "ActionCodeCell": ActionCodeCell,
  "ActionBranchToPaletteCell": ActionBranchToPaletteCell,
  "ActionIndicatorCell": ActionIndicatorCell,
  "ActionPreModifierCell": ActionPreModifierCell,
  "ActionPostModifierCell": ActionPostModifierCell,
  "ActionRemoveIndicatorCell": ActionRemoveIndicatorCell,
  "ActionRemoveModifierCell": ActionRemoveModifierCell,
  "ActionSpeakCell": ActionSpeakCell,
  "CommandClearEncoding": CommandClearEncoding,
  "CommandClearSavedData": CommandClearSavedData,
  "CommandCursorBackward": CommandCursorBackward,
  "CommandCursorForward": CommandCursorForward,
  "CommandDelLastEncoding": CommandDelLastEncoding,
  "CommandGoBackCell": CommandGoBackCell,
  "CommandGoToRootCell": CommandGoToRootCell,
  "CommandMakeSentence": CommandMakeSentence,
  "ContentEncoding": ContentEncoding,
};
