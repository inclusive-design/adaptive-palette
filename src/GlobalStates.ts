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

import { signal } from "@preact/signals";

/** Pass the action signal to the BMW encoding area. The structure is an object:
 * {
 *   "actionType": "addBmwCode" || "deleteLastBmwCode" || "deleteAllBmwCodes"
 *   "payload": {   // "payload" is only required when actionType === "add"
 *     "id": string,
 *     "label": string,
 *     "bciAvId": number or array
 *   }
 * }
 */
export const msgSignal = signal(undefined);
