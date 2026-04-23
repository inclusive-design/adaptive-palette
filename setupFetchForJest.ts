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

// There is an issue requesting the additions adding the fetch API to jest-dom
// for testing with node. Node.js Core has had an implementation of the fetch
// API since v17.5.  However, jest-dom removes it.  This comment in the issue
// suggests using whatwg's version of fetch() instead:
// https://github.com/jsdom/jsdom/issues/1724#issuecomment-720727999

// import { fetch } from "whatwg-fetch";

// jsdom does not expose structuredClone even though Node.js has it since v17.
// bliss-svg-builder@1.0.0-rc.1 depends on it.  Same class of issue as fetch above.

import v8 from "node:v8";
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (val: unknown) => v8.deserialize(v8.serialize(val));
}

// module.exports = {
//   globals: {
//     fetch: fetch
//   }
// };
