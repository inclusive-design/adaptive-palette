# Changelog

## [0.2.0](https://github.com/inclusive-design/adaptive-palette/compare/v0.1.0...v0.2.0) (2026-09-04)

### Features

#### Settings & Configuration

* Users can now modify application settings directly from the `config.json` file ([#191](https://github.com/inclusive-design/adaptive-palette/issues/191)) ([e2fc3e7](https://github.com/inclusive-design/adaptive-palette/commit/e2fc3e744d9ba7cf190ef58b4ebde63aefecd27e)).
* A configuration option has been added to toggle Text-to-Speech (TTS) announcements for individual symbols during input ([#185](https://github.com/inclusive-design/adaptive-palette/issues/185)) ([70c0feb](https://github.com/inclusive-design/adaptive-palette/commit/70c0feb0720151fb05ce0a0970cd04a370aafc3e)).

#### AI-involved Features

* A new model has been integrated to provide improved next-word suggestions during sentence construction ([#183](https://github.com/inclusive-design/adaptive-palette/issues/183)) ([d7148d0](https://github.com/inclusive-design/adaptive-palette/commit/d7148d0f333eb84fbd0561b2a8775e658e179c87)).
* Word prediction now utilizes user history to offer more personalized and accurate suggestions ([#177](https://github.com/inclusive-design/adaptive-palette/issues/177)) ([6fe0a1c](https://github.com/inclusive-design/adaptive-palette/commit/6fe0a1c90fb7d2825c15a81c3bb78fb906f2540d)).
* The "telegraphic translation" feature has been improved by allowing users to recall previously saved translations ([#194](https://github.com/inclusive-design/adaptive-palette/issues/194)) ([506cfd7](https://github.com/inclusive-design/adaptive-palette/commit/506cfd7bb9a0c8c852f6775dae10eef6e275829f)).
* The process for translating a telegraphic message into a full sentence has been simplified for better usability ([#163](https://github.com/inclusive-design/adaptive-palette/issues/163)) ([fc50a91](https://github.com/inclusive-design/adaptive-palette/commit/fc50a91a19461b6bccc9ecfeb65725e6ae53cb9f)).
* AI-suggested labels, words, and sentences are now visually distinguished from user inputs to provide clearer context ([#204](https://github.com/inclusive-design/adaptive-palette/issues/204)) ([ead7ea6](https://github.com/inclusive-design/adaptive-palette/commit/ead7ea6630c5365c805de1251c674d92bcaa5140)).
* The AI "thinking" state is now disabled by default ([#150](https://github.com/inclusive-design/adaptive-palette/issues/150)) ([90a0b73](https://github.com/inclusive-design/adaptive-palette/commit/90a0b7364bbdda20302b5ac80fbea294835b8f06)).

#### Bliss Symbol Rendering & UI

* Bliss symbols are now displayed alongside English sentences to improve multimodal reading comprehension ([#202](https://github.com/inclusive-design/adaptive-palette/issues/202)) ([e4fe2d6](https://github.com/inclusive-design/adaptive-palette/commit/e4fe2d6870d91998971ce9f9af29442ac8db0a57)).
* Symbol labels now dynamically update when a grammatical indicator is applied ([#155](https://github.com/inclusive-design/adaptive-palette/issues/155)) ([98abe67](https://github.com/inclusive-design/adaptive-palette/commit/98abe678b72e7eb99fcb610b83a1c2c04ab11755)).
* Message-level attribute tagging is now supported to provide additional context to composed messages ([#206](https://github.com/inclusive-design/adaptive-palette/issues/206)) ([23d48aa](https://github.com/inclusive-design/adaptive-palette/commit/23d48aa0d70664a260b4273b6e39bb68dd4c5831)).
* The "SVG builder string" and "search by vocabulary" features have been moved out of the main view and into dedicated modal dialogs for a cleaner interface ([#169](https://github.com/inclusive-design/adaptive-palette/issues/169)) ([54b2dd3](https://github.com/inclusive-design/adaptive-palette/commit/54b2dd3681da721b849dceb0c7b669da2a3fda1d)).
* General layout changes have been implemented to improve the overall user interface ([#175](https://github.com/inclusive-design/adaptive-palette/issues/175)) ([0eef263](https://github.com/inclusive-design/adaptive-palette/commit/0eef2632747167a6ebc61ca362ba8c1cc220cdd0)).

#### Data Management

* A "clear all saved data" button has been added to allow users to easily reset their application state ([#181](https://github.com/inclusive-design/adaptive-palette/issues/181)) ([058a78b](https://github.com/inclusive-design/adaptive-palette/commit/058a78b0da9ee651bb57921982b3781de3f75c76)).

#### Accessibility

* The standard `window.confirm()` dialog has been replaced with a fully accessible modal dialog ([#195](https://github.com/inclusive-design/adaptive-palette/issues/195)) ([826d922](https://github.com/inclusive-design/adaptive-palette/commit/826d9221eeeb1bbb37cbcefb120a3fcfa578d2e7)).

### Bug Fixes

* Edits to the user message are now properly guarded to prevent unintended modifications ([#197](https://github.com/inclusive-design/adaptive-palette/issues/197)) ([5702b12](https://github.com/inclusive-design/adaptive-palette/commit/5702b12f01af025f7214673d9eb8b4a32e1944b9)).

### Infrastructure

* Local storage has been replaced with IndexedDB to handle larger data payloads and improve application performance ([#212](https://github.com/inclusive-design/adaptive-palette/issues/212)) ([44eb7bd](https://github.com/inclusive-design/adaptive-palette/commit/44eb7bdbc0196f1f694f947ca26867019611185f)).
* The deployment process has been automated and fully implemented ([#216](https://github.com/inclusive-design/adaptive-palette/issues/216)) ([503790a](https://github.com/inclusive-design/adaptive-palette/commit/503790a2848f32e813ecf6f41d8a928ed745b116)).
* The application dependency for BCI-AV has been updated to the newly released version ([#210](https://github.com/inclusive-design/adaptive-palette/issues/210)) ([82671bb](https://github.com/inclusive-design/adaptive-palette/commit/82671bba1ec0822fb677e0fce7eb0610b960939d)).
* The `bliss_symbol_explanations.json` file has been updated and a new ID system has been implemented ([#126](https://github.com/inclusive-design/adaptive-palette/issues/126)) ([d973c57](https://github.com/inclusive-design/adaptive-palette/commit/d973c57d82020314b858e53a726a40b7e020302e)).
* General codebase refactoring and restructuring has been completed to improve long-term maintainability ([#188](https://github.com/inclusive-design/adaptive-palette/issues/188)) ([99c2567](https://github.com/inclusive-design/adaptive-palette/commit/99c25674f977fee12a3c0061b63742600b752322)).
* The automated test suite has been cleaned up and improved ([#189](https://github.com/inclusive-design/adaptive-palette/issues/189)) ([68979a2](https://github.com/inclusive-design/adaptive-palette/commit/68979a2ab0630f9cc314880798152c56937c3ca7)).
* Documentation for label lookups has been improved, and variable names have been adjusted for better code clarity ([#165](https://github.com/inclusive-design/adaptive-palette/issues/165)) ([6bcddd9](https://github.com/inclusive-design/adaptive-palette/commit/6bcddd9f8715408efa9938833eb570b9e2186eb8)).
* The legacy BMW palette has been safely removed from the codebase ([#145](https://github.com/inclusive-design/adaptive-palette/issues/145)) ([2511528](https://github.com/inclusive-design/adaptive-palette/commit/2511528274c1e110f393dae5f2ae6ac5f37e6e49)).

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

#### Ollama Model Integration (optional)

* The palette can connect to a locally running Ollama model instance to provide AI-assisted communication support.
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
