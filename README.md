# Adaptive Palette

This project builds a palette that empowers AAC(Augmentative and Alternative
Communication) users with the ability to personalize it according to their
specific requirements, thereby enhancing their communication capabilities with
others.

The front end of the project is built with [Preact](https://preactjs.com/).

## Install

To work on the project, you need to install [NodeJS and NPM](https://nodejs.org/en/download/)
for your operating system.

Then, clone the project from GitHub. [Create a fork](https://help.github.com/en/github/getting-started-with-github/fork-a-repo)
with your GitHub account, then enter the following in your command line
(make sure to replace `your-username` with your username):

```bash
git clone https://github.com/your-username/adaptive-palette
```

From the root of the cloned project, enter the following in your command line
to install dependencies:

```bash
# Install project dependencies
npm ci

# Install Playwright browsers for testing. This should only need to be done once.
npx playwright install
```

## Development

### Start Development Server

To start a local development server with hot module reload that injects updated code
modules directly into a running application without requiring a full page refresh, run:

```bash
npm start
```

The website will be available at [http://localhost:3000](http://localhost:3000).

To build the project for production (outputs to `dist`), run:

```bash
npm run build
npx vite preview
```

_**NOTE:** `npx vite preview` launches a local static web server to preview the build
in the `/dist` directory.

### Lint

To lint the source code, run:

```bash
npm run lint
```

### Type Checking

To type check the source code, run:

```bash
npm run typecheck
```

### Run Tests

To run tests, run:

```bash
# Run all tests
npm test
```

You can pass in arguments to the tests runner by placing them after a `--`. For example,
if you want to only run a single test you could call `npm test -- {test file name}`.

For a complete list CLI flags that can be passed to the tests see Vitest's
[Command Line Interface](https://vitest.dev/guide/cli.html) docs.

_**NOTE:** The browser tests make use of Playwright to test real browsers. If you haven't already, you
may need to run `npx playwright install` to install browsers. (see: [Browsers](https://playwright.dev/docs/browsers))_

_**NOTE:** Browser tests are run in headless mode; however audio may still be played._

_**NOTE:** Tests are run with watch mode disabled. If you prefer to enable watch mode you can use `-- --watch` flag.
(e.g. `npm test -- --watch`)_

## Demonstrations

The sub-folder [`demos`](./demos) contains code for a number of demonstrations.
These are short examples.  The [`apps`](./apps) folder contains more fully
built-out application examples.  See the respective READMEs and documentation
for instructions on how to run the software.

- [Ollama Chat Web-App](./apps/ollama/README.md): a chat application running on
  `localhost` that provides access to multiple LLMs using the Ollama localhost
  web service.
- [Palette Generator Web-App](./docs/PaletteJsonGenerator.md): an
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

- Build command: `npm run build`
- Build output directory:: `/dist`

## Documentation

- [Generate Bliss Symbol Explanations](./docs/GenerateBlissSymbolExplanations.md): how to generate
  `public/data/bliss_symbol_explanations.json`, which contains Bliss symbol vocabulary including glosses,
  part-of-speech labels, semantic explanations, and symbol compositions.
  - [Corresponding utility script](scripts/generate_bliss_symbol_explanations.js)
- [Generating the lookup table for symbol+indicator pairs](./docs/IndicatorLabelLookup.md): three-stage
pipeline that maps every symbol+indicator pair that the vocabulary supports to its grammatically correct label.
  - [Corresponding script directory](scripts/new_labels_with_indicator/)
- [Palette JSON Generator](./docs/PaletteJsonGenerator.md): how to use the web-based Palette Generator app to
  create custom Bliss symbol palettes from gloss words, BCI AV IDs, or SVG builder strings.
  - [Script directory](apps/palette-generator/)
- [Client Developer Documentation](./docs/DeveloperDoc.md): technical guide for developers building the
  adaptive palette client side with Preact.
