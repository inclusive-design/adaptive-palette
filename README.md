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
may need to run `npx playwright install` to install browsers._

See [Testing](./docs/devDoc/Testing.md) for the test setup, watch mode and running a single file.

## Demonstrations

The sub-folder [`demos`](./demos) contains code for a number of demonstrations.
These are short examples.  The [`apps`](./apps) folder contains more fully
built-out application examples.  See the respective READMEs and documentation
for instructions on how to run the software.

- [Ollama Chat Web-App](./apps/ollama/README.md): a chat application running on
  `localhost` that provides access to multiple models using the Ollama localhost
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

### Feature Documentation

- [Label Lookup When Indicator Applied](./docs/IndicatorLabelLookup.md): three-stage pipeline that maps
every symbol+indicator pair that the vocabulary supports to its grammatically correct label.
  - [Corresponding script directory](scripts/new_labels_with_indicator/)
- [Telegraphic Message Translation](./docs/TelegraphicMessageTranslation.md): use a local Ollama model to
turn telegraphic messages into complete, speakable English sentences.
- [Word Prediction](./docs/WordPrediction.md): suggest the words most likely to come next, from the user's
past messages and optionally from a local Ollama model.
- [Adjust Settings](./docs/Settings.md): change the runtime settings from within the app, saved in the
browser and applied at the next page load.

### Utility Documentation

- [Shortcut Keys](./docs/ShortcutKeys.md): keyboard shortcuts for palette navigation, caret movement in the
input area, and modal dialogs.
- [Generate Bliss Symbol Explanations](./docs/GenerateBlissSymbolExplanations.md): how to generate
  `public/data/bliss_symbol_explanations.json`, which contains Bliss symbol vocabulary including glosses,
  part-of-speech labels, semantic explanations, and symbol compositions.
  - [Corresponding utility script](scripts/generate_bliss_symbol_explanations.js)
- [Palette JSON Generator](./docs/PaletteJsonGenerator.md): how to use the web-based Palette Generator app to
  create custom Bliss symbol palettes from gloss words, BCI AV IDs, or SVG builder strings.
  - [Script directory](apps/palette-generator/)

### Developer Documentation

- [Developer Documentation](./docs/devDoc/README.md): technical guide for developers building the
  adaptive palette. Covers the source structure, application state, runtime configuration, palettes,
  cell types, Bliss sentences and testing.

## Attribution

The following data file is adapted from [Blissary.com](https://blissary.com), which builds upon the work
of [Blissymbolics Communication International (BCI)](https://blissymbolics.org).

In accordance with the ShareAlike clause, this adapted file is also licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/):

- [`public/data/bliss_symbol_explanations.json`](./public/data/bliss_symbol_explanations.json)

## Acknowledgments

This project was developed using an AI-assisted workflow. Special thanks to [Claude Code](https://code.claude.com/docs/en/overview)
and [OpenAI Codex](https://openai.com/codex/). All AI-generated code was reviewed, tested, and refined by
human developers to ensure quality and security.
