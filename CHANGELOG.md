# Changelog

## 0.1.0 (2026-05-25)

### Features

#### Palette System

* Palettes are defined in JSON files with a CSS grid layout, where each cell specifies its position using
  `columnStart`, `columnSpan`, `rowStart`, and `rowSpan` properties.
* A cell type registry maps string keys to Preact components, allowing palette JSON files to reference components by
  name.
* Users can navigate between multiple palettes using a breadcrumb stack that supports a back button and layered
  navigation history.
* Palette JSON files are loaded lazily on demand as users navigate, reducing initial load time.
* A top-level "palette of palettes" allows users to choose from multiple available palettes.
* Branch-to-palette cells display a folded-corner visual style to indicate they link to another palette.

#### Bliss Symbol Rendering

* A shared `BlissSymbol` component combines an SVG graphic with a text label for consistent symbol display across the
  palette.
* Bliss symbols are rendered as SVGs using the `bliss-svg-builder` npm package.
* The Blissary BCI-AV ID map is loaded dynamically from a remote source rather than bundled as a submodule.
* SVG elements include proper ARIA markup, and the label of a selected Bliss symbol is announced to assistive
  technologies.

#### Symbol Encoding Area

* Users can compose Bliss symbol messages in a dedicated encoding area that displays selected symbols.
* An animated blinking insertion caret shows the current edit position within the encoding area.
* Users can move the caret and edit the symbol at its position, including adding, removing, or replacing modifiers and
  indicators.
* A symbol can be inserted at the beginning of the encoding area, and the entire area can be cleared with a dedicated
  button.

#### Modifiers & Indicators

* A modifiers palette allows users to add pre* and post-modifiers to the last symbol in the encoding area, with a
  button to remove the most recently added modifier.
* An indicators palette supports adding, removing, and replacing grammatical indicators on symbols.
* The Bliss symbols shown on the "remove indicator" and "remove modifier" buttons correctly use the imperative
  indicator form.

#### Keyboard & Navigation

* The symbol encoding area supports full keyboard navigation, including moving the caret forward and backward, and
  jumping to the start or end of the input.
* A voice keyboard cursor navigation mode allows users to move the cursor via speech input.
* A global "go back" keystroke listener allows users to navigate back from any palette.
* Palette navigation keystrokes continue to work correctly even when the symbol input area has focus.

#### Symbol Search

* Users can search for Bliss symbols by gloss (text description); results are displayed as a navigable palette.
* Users can search by BCI-AV ID, with the matching symbol shown as the first result.
* A separate dialog allows users to enter SVG builder strings directly to find or compose a symbol.
* The search text field is cleared when the user clicks the clear button, and dialogs can be shown or hidden as
  needed.

#### Ollama LLM Integration (optional)

* The palette can connect to a locally running Ollama LLM instance to provide AI-assisted communication support.
* A dynamic sentence completions palette presents AI-generated continuations based on the current encoding area
  content.
* Users can configure the system prompt used for Ollama queries through an in-app dialog.
* Ollama responses support both streaming output and multiple completion candidates.

#### RAG Support (optional)

* An optional Retrieval-Augmented Generation (RAG) pipeline uses LangChain, a FAISS vector store, HuggingFace
  embeddings, and Ollama to answer questions from loaded documents.
* A script (`scripts/loadDocIntoVectorDb.js`) is provided to load documents into the vector database.
* RAG is disabled by default and can be enabled via `config/config.ts`.

#### Palette Generator App

* A standalone webapp (`apps/palette-generator`) is included for generating palette JSON definition files.

#### Accessibility

* `role="status"` is applied to search result and dialog status messages so assistive technologies announce updates
  automatically.
* The encoding display area carries `role="textbox"` to be correctly identified as an editable region by screen
  readers.
* Colour contrast has been improved for symbol cells and sentence completion buttons.
* Partial support for dark and high-contrast colour schemes has been added; light mode is enforced for now while full
  dark mode support is in progress.
* Labels, placeholder text, and static text across dialogs and search result views have been improved for clarity.

### Bug Fixes

* The column count calculation for the gloss search results palette was incorrect and has been corrected.
* Palette navigation keystrokes were being blocked when the symbol input area had focus; this has been resolved.
* The Bliss symbols assigned to the "remove indicator" and "remove modifier" buttons were incorrect and have been
  fixed.
* Command cells were using the wrong indicator symbol; they now correctly use the imperative form (BCI-AV ID 24670).
* The caret could previously move past the leftmost symbol; it is now constrained to valid positions.
* Deleting a symbol was incorrectly allowed when the caret was at the insertion start position; this is now blocked.
* The vector store on the server is now loaded as a singleton to avoid redundant model downloads.
* Dark mode is explicitly disabled while the full colour scheme implementation is in progress.

### Infrastructure

* The test runner has been migrated from Jest to Vitest, resolving long-standing compatibility issues.
* Renovate bot has been added to automate dependency update pull requests.
* A TypeScript strict type checking job has been added to CI, and all reported type errors have been resolved.
* Release-please has been configured for automated release management.
* `bliss-svg-builder` has been upgraded from alpha to rc.1.
* TypeScript, Vite, and ESLint have been upgraded to their latest versions.
* `npm-run-all` has been replaced with the actively maintained `npm-run-all2` package.

### Miscellaneous Chores

* release 0.1.0 ([#123](https://github.com/inclusive-design/adaptive-palette/issues/123)) ([2e34874](https://github.com/inclusive-design/adaptive-palette/commit/2e34874e898a2704e41004b50df74e16eb9d2148))
