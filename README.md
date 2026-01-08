# Adaptive Palette

This project builds a palette that empowers AAC(Augmentative and Alternative
Communication) users with the ability to personalize it according to their
specific requirements, thereby enhancing their communication capabilities with
others.

The front end of the project is built with [Preact](https://preactjs.com/).

## Install

To work on the project, you need to install [NodeJS and NPM](https://nodejs.org/en/download/)
for your operating system.

_**Note:** If you'd like to make use of RAG (optional), you'll also need to ensure that [CMake](http://cmake.org)
is installed. CMake is required for installing `faiss` which is pulled in by the optional depenency `faiss-node`._

Then, clone the project from GitHub. [Create a fork](https://help.github.com/en/github/getting-started-with-github/fork-a-repo)
with your GitHub account, then enter the following in your command line
(make sure to replace `your-username` with your username):

```bash
git clone https://github.com/your-username/adaptive-palette
```

From the root of the cloned project, enter the following in your command line
to install dependencies:

```bash
npm ci
```

_**Note:** If CMake is not available on the device, the optional dependency `faiss-node` will fail to install but
will not prevent the application from installing. However, if you wish to use RAG, you'll need to install CMake and
re-run `npm ci`._

## Development

### Start a Server

To start a local web server, run:

```bash
npm start
```

To start a local web server for **development** that every change to the source code
will be watched and redeployed,
run:

```bash
npm run dev
```

The website will be available at [http://localhost:3000](http://localhost:3000).

### Enable RAG

RAG (Retrieval-Augmented Generation) is an AI technique designed to enhance the accuracy of generative models by
incorporating factual knowledge from external sources. It requires loading factual knowledge into a vector store
that will be queried to provide relevant information to the language model as a context.

By default, the use of RAG is turned off in the system. The `enableRag` flag is set to `false` by default in the
[config/config.ts](./config/config.ts).

Follow these steps to complete a one-time setup to enable RAG in the system:

1. **Load a document into the vector store**

   Use the [`scripts/loadDocIntoVectorDb.js`](./scripts/loadDocIntoVectorDb.js) script to populate the vector store.
   Run the following command from the project root directory:

   ```bash
   node scripts/loadDocIntoVectorDb.js [location-of-document] [target-dir-of-vector-db]
   ```

2. **Configure the application**

   Update the [config/config.ts](./config/config.ts) file to specify the path to the vector store directory and set
   the flag `enableRag` to `true`:

   ```typescript
   export const config = {
     // ... other configurations
     rag: {
      enableRag: true,
       vectorStoreDir: "[path-to-vector-db-directory]"
     }
     ...
   };
   ```

   **Note**: The `vectorStoreDir` defaults to `./vectorStore`. Modify the value to match where your vector store
   is located. When a relative path is used, the path is relative to the project root directory.

3. **Restart the server**

   Follow the instruction in the [Start a Server](./README.md#start-a-server) section.

#### Troubleshooting

In order to use RAG, `fais-node` must be installed. `faise-node` is an optional dependency and requires that
[CMake](https://cmake.org/) be installed on the machine first. If this has not been done, install CMake and re-run
the application install steps.

### Lint

To lint the source code, run:

```bash
npm run lint
```

### Run Tests

To run tests, run:

```bash
npm test
```

## Demonstrations

The sub-folder [`demos`](./demos) contains code for a number of demonstrations.
These are short examples.  The [`apps`](./apps) folder contains more fully
built-out application examples.  See the respective READMEs for instructions on
how to run the software.

- [Ollama Chat Web-App](./apps/ollama/README.md): a chat application running on
  `localhost` that provides access to multiple LLMs using the Ollama localhost
  web service.
- [Palette Generator Web-App](./apps/palette-generator/README.md): an
  application for generating and saving a palette using the Bliss gloss.  By
  providing a set of gloss words, BCI AV IDs, or svg builder strings, the Bliss
  gloss is searched and a palette is generated based on matches found.
- [Ollama Chat Service Demo](./demos/Ollama%20Chat%20Service/README.md): a
  simple web-app that runs on `localhost` for sending queries to an Ollama
  chatbot service also running on `localhost`.

## Cloudflare

The adaptive-palette can be served as a production preview using [Cloudflare Pages](https://developers.cloudflare.com/pages/),
specifically using the [Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/).
You will need to have your own [Cloudflare account](https://www.cloudflare.com/)
to do this.

In the "Deployment details" for the preview, use the following for the "Build
command" and "Build output directory" settings:

- Build command: `npm run build:client`
- Build output directory:: `/dist/client`

## Utility Scripts

- [Load a document into a vector databbase (`scripts/loadDocIntoVectorDb.js`)](./scripts/loadDocIntoVectorDb.js)
- [One time script to generate the composition of Bliss-word based on the Blissary (`scripts/createAndRecordCompositions.ts`)](scripts/createAndRecordCompositions.ts)
