/**
 * Copyright (c) 2024, Inclusive Design Institute
 *
 * Licensed under the BSD 3-Clause License. You may not use this file except
 * in compliance with this License.
 *
 * You may obtain a copy of the BSD 3-Clause License at
 * https://github.com/inclusive-design/baby-bliss-bot/blob/main/LICENSE
 */

import fs from "fs";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";

/**
 * Load the FAISS store into the memory
 * @param {string} vectorStoreDir The path to the local FAISS store
 * @returns The loaded vector store instance
 */
const load = async (vectorStoreDir: string): Promise<FaissStore> => {
  // Make sure the given directory exists
  if (!fs.existsSync(vectorStoreDir)) {
    throw new Error("The vector store directory \"" + vectorStoreDir + "\" does not exist.");
  }

  // Load the local FAISS store into the memory
  try {
    const vectorStore = await FaissStore.load(
      vectorStoreDir,
      new HuggingFaceTransformersEmbeddings({
        model: "Xenova/all-MiniLM-L6-v2",
      })
    );
    return vectorStore;
  } catch (error) {
    console.log("An error occurred during loading vector store: ", error);
    throw new Error(`Failed to load vector store: ${error}`);
  }
};

/**
 * Perform similarity search in the vector store using the given query string
 * @param {vectorStore} vectorStore The vector store instance
 * @param {string} query The query string for the similarity search
 * @param {number} topK Optional. The number to the best matches to return. Default to 4.
 * @returns An array of search results. Returns an error if an error occurs.
 */
const similaritySearch = async (
  vectorStore: FaissStore,
  query: string,
  topK: number = 4
): Promise<unknown[]> => {
  try {
    const results = await vectorStore.similaritySearch(query, topK);
    return results;
  } catch (error) {
    console.log("An error occurred during similarity search: ", error);
    throw new Error(`Failed to execute similarity search: ${error}`);
  }
};

export default {
  load,
  similaritySearch
};
