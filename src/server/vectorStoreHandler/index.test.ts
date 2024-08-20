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
      const vectorStore = await vectorStoreHandler.load("./vectorStore");
      expect(vectorStore).toBeTruthy();
    });

    it("should throw an error if loading fails", async () => {
      await expect(vectorStoreHandler.load("./non-existent-folder")).rejects.toThrow("Failed to load vector database");
    });
  });
});
