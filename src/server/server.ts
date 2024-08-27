/**
 * Copyright (c) 2024, Inclusive Design Institute
 *
 * Licensed under the BSD 3-Clause License. You may not use this file except
 * in compliance with this License.
 *
 * You may obtain a copy of the BSD 3-Clause License at
 * https://github.com/inclusive-design/baby-bliss-bot/blob/main/LICENSE
 */

import express, { Express } from "express";
import path from "path";
import { fileURLToPath } from "url";
import serveStatic from "serve-static";
import { config } from "../../config/config.js";

import { FaissStore } from "@langchain/community/vectorstores/faiss";
import vectorStoreHandler from "./vectorStoreHandler/index.js";

const PORT: number = config.server.port;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

// Parse incoming requests with JSON payloads
app.use(express.json());

// Serve static files from the root dist directory
app.use(serveStatic(path.join(__dirname, "../../../client")));

// If the `enableRag` flag is on, load the vector data store into a global variable.
// Note: The `/query-vector` endpoint is for the testing purpose. It should be removed
// when RAG is included in the AAC users' message processing.
if (config.rag.enableRag) {
  // Initialize the vector store as a global variable
  let vectorStore: FaissStore;

  try {
    vectorStore = await vectorStoreHandler.load(config.rag.vectorStoreDir);
  } catch (error) {
    console.error("An error occurred while loading the vector database: ", error);
    throw error;
  }

  // Route to search the vector database
  app.post("/query-vector", async (req, res) => {
    const { query } = req.body;

    try {
      // Convert query to vector and search the index
      const results = await vectorStoreHandler.similaritySearch(vectorStore, query);
      res.json({ results });
    } catch (error) {
      res.status(500).json({
        isError: true,
        error: error
      });
    }
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy"
  });
});
