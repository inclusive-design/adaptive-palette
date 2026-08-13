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

import { signal } from "@preact/signals";

/**
 * How many palettes are on the navigation stack.  Zero means the root palette is
 * displayed, which is when `Back` and `Home` are unavailable.
 *
 * This lives apart from `GlobalData.ts` so `NavigationStack.ts` can write to it without
 * importing `GlobalData`.  `GlobalData` constructs a `NavigationStack` while its own
 * module body runs, so that import would form a cycle that fails whenever a module
 * reaches `NavigationStack` first.  `GlobalData` re-exports this signal for consumers.
 */
export const navigationDepth = signal<number>(0);
