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

import { vi } from "vitest";
import * as SpeechUtils from "../utils/SpeechUtils";

/**
 * The speech spies. A test file that wants them calls `vi.mock("../utils/SpeechUtils")` at its
 * top level first: that replaces every export of the module with a spy for that file, and these
 * are those spies. Without the `vi.mock()` call these are the real functions and the
 * expectations on them fail.
 */
export const mockedSpeak = vi.mocked(SpeechUtils.speak);
export const mockedSpeakUnavailable = vi.mocked(SpeechUtils.speakUnavailable);
export const mockedAnnounceIfEnabled = vi.mocked(SpeechUtils.announceIfEnabled);
