# Source Structure

Where the client-side files live, and the rule that decides where a new one goes.

## Layout

```text
launcher/         — The desktop launcher: a static server for `dist/` and the OS glue
                    around it. CommonJS, because Node's single-executable feature runs
                    only CommonJS. Not part of the app and never imported by it.
src/client/
  index.js          Entry point: initializes globals, then mounts the fixed components
  index.d.ts        Shared types, including the palette JSON shapes
  index.scss        Global styles
  cells/            Components registered in the cell type registry
  components/       Preact components that are not registry cells
  core/             Services and start-up wiring
  state/            Signals and the globals singleton
  testUtils/        Helpers shared between test files
  utils/            Stateless helper functions
  features/         Feature slices
    word-prediction/
    telegraphic-translation/
    message-attributes/
    settings/
```

| Folder | Holds | Examples |
| ------ | ----- | -------- |
| `cells/` | Components named in `cellTypeRegistry`, one per palette cell type | `ActionCodeCell.ts`, `CommandGoBackCell.ts` |
| `components/` | Preact components a palette JSON never names | `Palette.ts`, `ModalDialog.ts`, `BlissSymbol.ts` |
| `core/` | Services with their own state or I/O, and start-up | `Config.ts`, `PaletteStore.ts`, `OllamaApi.ts`, `InitGlobals.ts`, `StorageBackend.ts`, `IndexedDbStorage.ts` |
| `state/` | The globals singleton and the signals shared across features | `GlobalData.ts` |
| `testUtils/` | Helpers shared between test files. Test-only, never imported by production code. Files here carry no `.test.ts` suffix, so Vitest does not collect them as suites | `CellTestUtils.ts`, `StorageContract.ts`, `FakeStorage.ts`, `MessageLogTestUtils.ts` |
| `utils/` | Functions with no state of their own | `SpeechUtils.ts`, `GridUtils.ts`, `SvgUtils.ts`, `GlossLookupUtils.ts` |
| `features/<slice>/` | Everything belonging to one feature and nothing else | `word-prediction/`, `telegraphic-translation/`, `message-attributes/`, `settings/` |

See [State.md](State.md) for what `state/` and `core/` hold and why they are separate.

## Choosing a folder

A module belongs in `features/<slice>/` when nothing outside that slice imports it. A feature slice
keeps its own cells, components, state and helpers together, so changing the feature touches one
folder.

Everything else belongs in the folder matching what the module is. When a helper that lived in a
slice gains an importer elsewhere, move it out to `utils/` or `core/`.

`cells/` is decided by the registry, not by what the component does: if `cellTypeRegistry` maps a
`type` string to it, it is a cell. `CommandMakeSentence` is a registered cell that lives in
`features/telegraphic-translation/` because it belongs to that feature; the registry imports it
from there.

## Naming

- Modules under `src/client` use PascalCase: `SpeechUtils.ts`, not `speech-utils.ts`.
- A test sits beside its source as `<Module>.test.ts`.
- A component's styles sit beside it as `<Component>.scss`.
- Feature slice folders use kebab-case: `word-prediction/`.

## Structural check

```bash
npm run lint:cycles
```

[`scripts/check_cycles.js`](../../scripts/check_cycles.js) walks every import under `src/client` and
fails on any cycle. No cycle is tolerated: one that works today because a bundler defers a lookup is
still a cycle. `npm run lint` runs it along with the JS and Markdown linters.
