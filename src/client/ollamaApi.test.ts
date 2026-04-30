/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { getModelNames, queryChat } from "./ollamaApi";
import ollama from "ollama/browser";

// Mock the entire ollama/browser module
jest.mock("ollama/browser", () => ({
  __esModule: true,
  default: {
    list: jest.fn(),
    chat: jest.fn(),
  },
}));

const mockedOllama = jest.mocked(ollama);
// Dynamically infer what mockedOllama returned types are supposed to be
type OllamaListResponse = Awaited<ReturnType<typeof mockedOllama.list>>;
type OllamaChatResponse = Awaited<ReturnType<typeof mockedOllama.chat>>;

describe("ollamaApi unit tests", (): void => {
  
  // Clear mocks before each test so they don't interfere with one another
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getModelNames", () => {
    test("should return an array of model names on success", async (): Promise<void> => {
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

    test("should handle errors and return an empty array", async (): Promise<void> => {
      // Intentionally mock an error response to test error handling. It will override the
      // global mock defined in `setupForJestAfterFramework.ts`. Also spy on console.error
      // to suppress expected error logs during testing.
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
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

    test("should call ollama.chat without a system prompt (stream: false)", async () => {
      mockedOllama.chat.mockResolvedValue(mockResponse as unknown as OllamaChatResponse);

      const response = await queryChat(mockQuery, mockModel, false);
      expect(mockedOllama.chat).toHaveBeenCalledTimes(1);
      expect(mockedOllama.chat).toHaveBeenCalledWith({
        model: mockModel,
        keep_alive: 15,
        stream: false,
        messages: [
          { role: "user", content: mockQuery },
        ],
      });
      expect(response).toEqual(mockResponse);
    });

    test("should include the system prompt when provided", async () => {
      mockedOllama.chat.mockResolvedValue(mockResponse as unknown as OllamaChatResponse);
      const systemPrompt = "You are a helpful geography teacher.";

      await queryChat(mockQuery, mockModel, false, systemPrompt);
      expect(mockedOllama.chat).toHaveBeenCalledWith({
        model: mockModel,
        keep_alive: 15,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mockQuery },
        ],
      });
    });

    test("should ignore the system prompt if it is an empty string", async () => {
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

    test("should call ollama.chat with stream: true when streamResp is true", async () => {
      // For a stream, Ollama returns an AsyncIterable. Mock it using an async generator.
      async function* mockStream() {
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
      expect(typeof response[Symbol.asyncIterator]).toBe("function");
    });
  });
});
