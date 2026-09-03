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
import { getModelNames, pullModel, queryChat } from "./OllamaApi";
import ollama from "ollama/browser";

// Mock the entire ollama/browser module.
// `vi.mock` is hoisted above const declarations, so anything the factory closes over has
// to be created inside `vi.hoisted`.
const { mockOllamaClass, mockClientChat, mockClientPull } = vi.hoisted(() => {
  const mockClientChat = vi.fn();
  const mockClientPull = vi.fn();
  // A function expression, not an arrow: `queryChat` calls this with `new`, and arrow
  // functions are not constructible.
  const mockOllamaClass = vi.fn(function (config?: { fetch?: typeof fetch }) {
    void config;
    return { chat: mockClientChat, pull: mockClientPull };
  });
  return { mockOllamaClass, mockClientChat, mockClientPull };
});

vi.mock("ollama/browser", () => ({
  __esModule: true,
  default: {
    list: vi.fn(),
    chat: vi.fn(),
    pull: vi.fn(),
  },
  Ollama: mockOllamaClass,
}));

const mockedOllama = vi.mocked(ollama);
// Dynamically infer what mockedOllama returned types are supposed to be
type OllamaListResponse = Awaited<ReturnType<typeof mockedOllama.list>>;
type OllamaChatResponse = Awaited<ReturnType<typeof mockedOllama.chat>>;
type OllamaPullResponse = Awaited<ReturnType<typeof mockedOllama.pull>>;

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

  describe("pullModel", () => {
    // The shape ollama-js streams while a model downloads.
    const progressStream = (parts: unknown[]): AsyncIterable<unknown> => ({
      // eslint-disable-next-line @typescript-eslint/require-await
      async *[Symbol.asyncIterator] () {
        for (const part of parts) { yield part; }
      }
    });

    test("reports every step of the download", async (): Promise<void> => {
      mockedOllama.pull.mockResolvedValue(progressStream([
        { status: "pulling", completed: 0, total: 100 },
        { status: "pulling", completed: 60, total: 100 },
        { status: "success", completed: 100, total: 100 },
      ]) as unknown as OllamaPullResponse);
      const seen: { completed: number, total: number }[] = [];

      await pullModel("gemma4:12b", (progress) => seen.push(progress));

      expect(mockedOllama.pull).toHaveBeenCalledWith({ model: "gemma4:12b", stream: true });
      expect(seen).toEqual([
        { completed: 0, total: 100 },
        { completed: 60, total: 100 },
        { completed: 100, total: 100 },
      ]);
    });

    test("ignores the steps that carry no size", async (): Promise<void> => {
      // The manifest steps arrive before Ollama knows how big the download is.
      mockedOllama.pull.mockResolvedValue(progressStream([
        { status: "pulling manifest" },
        { status: "pulling", completed: 5, total: 0 },
        { status: "pulling", completed: 10, total: 50 },
      ]) as unknown as OllamaPullResponse);
      const seen: { completed: number, total: number }[] = [];

      await pullModel("gemma4:12b", (progress) => seen.push(progress));

      expect(seen).toEqual([{ completed: 10, total: 50 }]);
    });

    test("treats a missing `completed` as nothing downloaded yet", async (): Promise<void> => {
      mockedOllama.pull.mockResolvedValue(progressStream([
        { status: "pulling", total: 80 },
      ]) as unknown as OllamaPullResponse);
      const seen: { completed: number, total: number }[] = [];

      await pullModel("gemma4:12b", (progress) => seen.push(progress));

      expect(seen).toEqual([{ completed: 0, total: 80 }]);
    });

    test("a signal routes the pull through a client of its own", async (): Promise<void> => {
      mockClientPull.mockResolvedValue(progressStream([]));
      const controller = new AbortController();

      await pullModel("gemma4:12b", () => {}, controller.signal);

      expect(mockOllamaClass).toHaveBeenCalledTimes(1);
      expect(mockClientPull).toHaveBeenCalledWith({ model: "gemma4:12b", stream: true });
      // The shared client is left alone, so cancelling one pull cannot disturb anything else.
      expect(mockedOllama.pull).not.toHaveBeenCalled();
    });

    test("a failed pull rejects", async (): Promise<void> => {
      mockedOllama.pull.mockRejectedValue(new Error("Connection refused"));

      await expect(pullModel("gemma4:12b", () => {})).rejects.toThrow("Connection refused");
    });
  });
});
