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
import { getModelNames, queryChat } from "./OllamaApi";
import ollama from "ollama/browser";

// Mock the entire ollama/browser module.
// `vi.mock` is hoisted above const declarations, so anything the factory closes over has
// to be created inside `vi.hoisted`.
const { mockOllamaClass, mockClientChat } = vi.hoisted(() => {
  const mockClientChat = vi.fn();
  // A function expression, not an arrow: `queryChat` calls this with `new`, and arrow
  // functions are not constructible.
  const mockOllamaClass = vi.fn(function (config?: { fetch?: typeof fetch }) {
    void config;
    return { chat: mockClientChat };
  });
  return { mockOllamaClass, mockClientChat };
});

vi.mock("ollama/browser", () => ({
  __esModule: true,
  default: {
    list: vi.fn(),
    chat: vi.fn(),
  },
  Ollama: mockOllamaClass,
}));

const mockedOllama = vi.mocked(ollama);
// Dynamically infer what mockedOllama returned types are supposed to be
type OllamaListResponse = Awaited<ReturnType<typeof mockedOllama.list>>;
type OllamaChatResponse = Awaited<ReturnType<typeof mockedOllama.chat>>;

describe("OllamaApi", (): void => {

  // Clear mocks before each test so they don't interfere with one another
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getModelNames", () => {
    test("returns the model names", async (): Promise<void> => {
      const mockResponse = {
        models: [
          { name: "llama3" },
          { name: "mistral" },
        ],
      };

      // Casting through `unknown` tells TypeScript:
      // 1. "Treat this object as unknown" (which strips its current strict type constraints).
      // 2. "Now treat it as ListResponse" (which forces it to match the expected type).
      mockedOllama.list.mockResolvedValue(mockResponse as unknown as OllamaListResponse);

      const modelNames = await getModelNames();
      expect(mockedOllama.list).toHaveBeenCalledTimes(1);
      expect(modelNames).toEqual(["llama3", "mistral"]);
    });

    test("returns an empty array when the request fails", async (): Promise<void> => {
      // Intentionally mock an error response to test error handling. Also spy on
      // console.error to suppress expected error logs during testing.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      // Simulate a network error or Ollama being offline
      mockedOllama.list.mockRejectedValue(new Error("Connection refused"));

      const modelNames = await getModelNames();
      expect(mockedOllama.list).toHaveBeenCalledTimes(1);
      expect(modelNames).toEqual([]);
      consoleErrorSpy.mockRestore();
    });
  });

  describe("queryChat", () => {
    const mockQuery = "What is the capital of France?";
    const mockModel = "llama3";
    const mockResponse = { message: { role: "assistant", content: "Paris" } };

    test("queries without a system prompt when none is given", async () => {
      mockedOllama.chat.mockResolvedValue(mockResponse as unknown as OllamaChatResponse);

      const response = await queryChat(mockQuery, mockModel, false);
      expect(mockedOllama.chat).toHaveBeenCalledTimes(1);
      expect(mockedOllama.chat).toHaveBeenCalledWith({
        model: mockModel,
        keep_alive: 15,
        think: false,
        stream: false,
        messages: [
          { role: "user", content: mockQuery },
        ],
      });
      expect(response).toEqual(mockResponse);
    });

    test("includes the system prompt when one is given", async () => {
      mockedOllama.chat.mockResolvedValue(mockResponse as unknown as OllamaChatResponse);
      const systemPrompt = "You are a helpful geography teacher.";

      await queryChat(mockQuery, mockModel, false, systemPrompt);
      expect(mockedOllama.chat).toHaveBeenCalledWith({
        model: mockModel,
        keep_alive: 15,
        think: false,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mockQuery },
        ],
      });
    });

    test("ignores an empty system prompt", async () => {
      mockedOllama.chat.mockResolvedValue(mockResponse as unknown as OllamaChatResponse);

      await queryChat(mockQuery, mockModel, false, "");
      expect(mockedOllama.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "user", content: mockQuery },
            // System prompt should NOT be here
          ],
        })
      );
    });

    test("streams the reply when streamResp is true", async () => {
      // For a stream, Ollama returns an AsyncIterable. Mock it using an async generator.
      async function* mockStream() {
        // Add a mock `await` to satisfies the linter. Otherwise, the linter complains an async
        // function is not waiting for anything inside it.
        await Promise.resolve();
        yield { message: { content: "Pa" } };
        yield { message: { content: "ris" } };
      }
      mockedOllama.chat.mockResolvedValue(mockStream() as unknown as OllamaChatResponse);

      const response = await queryChat(mockQuery, mockModel, true);
      expect(mockedOllama.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        })
      );

      // Verify we actually get the async iterable back
      expect(typeof (response as AsyncIterable<unknown>)[Symbol.asyncIterator]).toBe("function");
    });

    test("uses the shared singleton and builds no client when no signal is given", async () => {
      mockedOllama.chat.mockResolvedValue(mockResponse as unknown as OllamaChatResponse);

      await queryChat(mockQuery, mockModel, false);

      expect(mockedOllama.chat).toHaveBeenCalledTimes(1);
      expect(mockOllamaClass).not.toHaveBeenCalled();
    });

    test("routes through a client whose fetch carries the abort signal", async () => {
      mockClientChat.mockResolvedValue(mockResponse);
      const controller = new AbortController();
      const fetchSpy = vi.spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("{}"));

      const response = await queryChat(mockQuery, mockModel, false, undefined, controller.signal);

      expect(mockOllamaClass).toHaveBeenCalledTimes(1);
      expect(mockedOllama.chat).not.toHaveBeenCalled();
      expect(mockClientChat).toHaveBeenCalledTimes(1);
      expect(mockClientChat).toHaveBeenCalledWith({
        model: mockModel,
        keep_alive: 15,
        think: false,
        stream: false,
        messages: [
          { role: "user", content: mockQuery },
        ],
      });
      expect(response).toEqual(mockResponse);

      // ollama-js sends every request through the fetch it was given, so attaching the
      // signal there is what makes the request cancellable.
      const injectedFetch = mockOllamaClass.mock.calls[0][0]?.fetch;
      expect(injectedFetch).toBeTypeOf("function");
      await injectedFetch?.("http://example.test/api/chat", { method: "POST" });
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://example.test/api/chat",
        expect.objectContaining({ method: "POST", signal: controller.signal })
      );

      fetchSpy.mockRestore();
    });
  });
});
