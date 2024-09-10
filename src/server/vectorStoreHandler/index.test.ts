/**
 * Copyright (c) 2024, Inclusive Design Institute
 *
 * Licensed under the BSD 3-Clause License. You may not use this file except
 * in compliance with this License.
 *
 * You may obtain a copy of the BSD 3-Clause License at
 * https://github.com/inclusive-design/baby-bliss-bot/blob/main/LICENSE
 */

import vectorStoreHandler from "./index";

describe("Test vectorStoreHandler", () => {
  describe("Test load()", () => {
    it("should load the vector store", async () => {
      const vectorStore = await vectorStoreHandler.load(__dirname + "/testVectorStore");
      expect(vectorStore).toBeTruthy();
    });

    it("should throw an error if loading fails", async () => {
      await expect(vectorStoreHandler.load("./non-existent-folder")).rejects.toThrow("The vector store directory \"./non-existent-folder\" does not exist.");
    });
  });

  describe("Test similaritySearch()", () => {
    // Calling `vectorStoreHandler.similaritySearch()` in a Jest test reports this error:
    // `TypeError: A float32 tensor's data must be type of function Float32Array() { [native code] }`.
    // The error doesn't occur when the function is called outside of Jest. Mocking `Array.isArray`
    // works around the issue.
    // See https://github.com/microsoft/onnxruntime/issues/16622#issuecomment-1626413333
    const originalImplementation = Array.isArray;

    Array.isArray = jest.fn((type: unknown): boolean => {
      if (type && type.constructor && (type.constructor.name === "Float32Array" || type.constructor.name === "BigInt64Array")) {
        return true;
      }

      return originalImplementation(type);
    }) as unknown as (arg: unknown) => arg is unknown[];

    // Verify every result element
    const verifyResults = (results: unknown[]) => {
      results.forEach((item) => {
        expect(item).toHaveProperty("pageContent");
        expect(item).toHaveProperty("metadata.source");
        expect(item).toHaveProperty("metadata.loc");
      });
    };

    it("should perform the search with a vector store by returning default 4 top matches", async () => {
      const vectorStore = await vectorStoreHandler.load(__dirname + "/testVectorStore");
      const results = await vectorStoreHandler.similaritySearch(vectorStore, "roy");
      expect(results.length).toBe(4);
      verifyResults(results);
    }, 10000);

    it("should perform the search with a vector store by returning requested number of top matches", async () => {
      const topK = 3;
      const vectorStore = await vectorStoreHandler.load(__dirname + "/testVectorStore");
      const results = await vectorStoreHandler.similaritySearch(vectorStore, "roy", topK);
      expect(results.length).toBe(topK);
      verifyResults(results);
    }, 10000);
  });
});
