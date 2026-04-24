/**
 * Copyright 2025-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

// ollama/browser normally side-effect-imports whatwg-fetch, polyfilling the
// global fetch used by loadBlissaryIdMap(). Mocking that module removes the
// side effect.
import "whatwg-fetch";

// Mock ollama/browser globally so tests do not require Ollama to be running.
// Tests that need specific Ollama behaviour (e.g. ollamaApi.test.ts) override
// this with their own jest.mock() factory.
jest.mock("ollama/browser", () => ({
  __esModule: true,
  default: {
    list: jest.fn().mockResolvedValue({ models: [] }),
    chat: jest.fn().mockResolvedValue({ message: { role: "assistant", content: "" } }),
  },
}));
