/**
 * Copyright 2023-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

// jsdom does not expose structuredClone even though Node.js has it since v17.

import v8 from "node:v8";
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (val: unknown) => v8.deserialize(v8.serialize(val));
}
