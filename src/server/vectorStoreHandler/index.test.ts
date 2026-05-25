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
  let vectorStore: Awaited<ReturnType<typeof vectorStoreHandler.load>>;
  beforeAll(async () => {
    vectorStore = await vectorStoreHandler.load(__dirname + "/testVectorStore");
  }, 25000);

  describe("Test load()", () => {
    it("the vector store should be loaded", () => {
      expect(vectorStore).toBeTruthy();
    });

    it("should throw an error if loading fails", async () => {
      await expect(vectorStoreHandler.load("./non-existent-folder")).rejects.toThrow("The vector store directory \"./non-existent-folder\" does not exist.");
    });
  });

  describe("Test similaritySearch()", () => {
    // Verify every result element
    const verifyResults = (results: unknown[]) => {
      results.forEach((item) => {
        expect(item).toHaveProperty("pageContent");
        expect(item).toHaveProperty("metadata.source");
        expect(item).toHaveProperty("metadata.loc");
      });
    };

    it("should perform the search with a vector store by returning default 4 top matches", async () => {
      const results = await vectorStoreHandler.similaritySearch(vectorStore, "roy");
      expect(results.length).toBe(4);
      verifyResults(results);
    }, 50000);

    it("should perform the search with a vector store by returning requested number of top matches", async () => {
      const topK = 3;
      const results = await vectorStoreHandler.similaritySearch(vectorStore, "roy", topK);
      expect(results.length).toBe(topK);
      verifyResults(results);
    }, 25000);
  });
});
