/**
 * Copyright (c) 2024, Inclusive Design Institute
 *
 * Licensed under the BSD 3-Clause License. You may not use this file except
 * in compliance with this License.
 *
 * You may obtain a copy of the BSD 3-Clause License at
 * https://github.com/inclusive-design/baby-bliss-bot/blob/main/LICENSE
 */

/**
 * This script is to load a given user document into the FAISS vector store.
 * Usage: node scripts/loadDocIntoVectorDb.js userDocumentLocation saveDbLocation
 * Example: node scripts/loadDocIntoVectorDb.js user_doc.txt ./vectorStore
 */

import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { TextLoader } from "langchain/document_loaders/fs/text";
import fs from "fs";

if (process.argv.length !== 4) {
  console.log("Usage: node scripts/loadDocIntoVectorDb.js userDocumentLocation saveDbLocation");
  process.exit(1);
}
console.log(process.argv.length + "; 3: " + process.argv[3] + "; 4: " + process.argv[4]);
const fileLocation = process.argv[2];
const saveDbLocation = process.argv[3];

if (!fs.existsSync(fileLocation)) {
  console.log("Error: The user document " + fileLocation + " does not exists.");
  process.exit(1);
}
if (!fs.existsSync(saveDbLocation)) {
  console.log("Error: The directory for saving database " + saveDbLocation + " does not exists.");
  process.exit(1);
}

console.log("Loading the document " + fileLocation);
// Create docs with a loader
const loader = new TextLoader(fileLocation);
const docs = await loader.load();
console.log("Loaded.");

// Split the document into small chunks
console.log("Splitting the document...");
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200,
  chunkOverlap: 20,
});
const splits = await textSplitter.splitDocuments(docs);
console.log("Split.");

// Load the docs into the vector store
console.log("Loading the split document into Faiss...");
const vectorStore = await FaissStore.fromDocuments(
  splits,
  new HuggingFaceTransformersEmbeddings({
    model: "Xenova/all-MiniLM-L6-v2",
  })
);
console.log("Loaded.");

console.log("Saving Faiss into a local directory...");
await vectorStore.save(saveDbLocation);
console.log("Saved.");

console.log("Loading Faiss from a local directory...");
const loaded_vectorStore = await FaissStore.load(saveDbLocation,
  new HuggingFaceTransformersEmbeddings({
    model: "Xenova/all-MiniLM-L6-v2",
  })
);
console.log("Loaded.");

// Test the loaded store with a similarity search
const result = await loaded_vectorStore.similaritySearch("Roy nephew", 3);
console.log("===== Test Result: Similarity search on the phrase \"Roy nephew\" =====");
console.log(result);
