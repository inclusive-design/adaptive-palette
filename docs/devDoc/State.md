# State

What holds application state, and why the modules that touch it are split the way they are.

## The globals singleton

[`src/client/state/GlobalData.ts`](../../src/client/state/GlobalData.ts) exports
`adaptivePaletteGlobals`, the single object the rest of the code reads:

| Field | Holds |
| ----- | ----- |
| `symbols` | The Bliss vocabulary loaded from `public/data/bliss_symbol_explanations.json` |
| `paletteStore` | The `PaletteStore` caching loaded palettes |
| `navigationStack` | The `NavigationStack` tracking where the user is |
| `models` | Ollama model names found at start-up; empty when Ollama is not running |
| `config` | The validated `public/config.json`, or its defaults. See [Config.md](Config.md) |
| `indicatorLabels` | The pregenerated symbol-plus-indicator label lookup |
| `mainPaletteContainerId` | The `id` of the element the main palette renders into |

The same module exports `changeEncodingContents`, the signal holding the message being composed:
the symbol payloads and the caret position. Every component that draws or edits the message reads
it, so a change there re-renders all of them.

Almost nothing writes that signal directly. Every edit goes through `editMessage()` in
[`core/MessageEdit.ts`](../../src/client/core/MessageEdit.ts), which freezes the message and then
offers it to the guard registered with `setEditGuard()`. A guard that returns `true` holds the
edit: the signal is never written, so there is nothing to take back. Telegraphic translation
registers the only guard, from `core/InitGlobals.ts`, to hold edits that would throw away a
sentence request or the sentences on screen until the user agrees to them. What `editMessage()`
publishes is frozen — the symbol array, each symbol in it, and each symbol's `modifierInfo` with
its entries — so a cell that changed the message in place after publishing it would throw.

Two writes skip the gate, both inside `features/telegraphic-translation/` and both marked as
such: `clearMessageAndChoices()`, which has already cleared the state the guard would ask about,
and `confirmDiscardEdit()`, which applies an edit the guard itself held. A raw
`changeEncodingContents.value = …` anywhere else is a bug.

## Navigation state

[`core/NavigationStack.ts`](../../src/client/core/NavigationStack.ts) keeps two signals of its own
rather than plain fields:

- `currPalette` — the palette in the main display area. `components/CurrentPalette.ts` is mounted
  once and draws whatever this holds, so pushing or popping redraws the area without any cell
  knowing where it renders.
- `depthSignal` — how many palettes are on the stack. Zero means the root palette is showing, which
  is when `CommandGoBackCell` and `CommandGoToRootCell` are unavailable. They read it, so they
  re-render when navigation happens.

Cells that navigate only set state. `ActionBranchToPaletteCell` pushes, `CommandGoBackCell` pops,
`CommandGoToRootCell` flushes. None of them renders a palette.

## Three modules deliberately kept out of `state/`

The first two splits exist to break an import cycle; `npm run lint:cycles` fails if either is
undone. The third is a layering choice rather than a cycle fix.

**`core/CellTypeRegistry.ts`** maps each `type` string to its component. `components/Palette.ts`
needs the registry to render a cell, and the registered cells read `adaptivePaletteGlobals`. Putting
the registry inside `GlobalData.ts` would make the globals import every cell, and every cell import
the globals.

**`core/InitGlobals.ts`** owns `initAdaptivePaletteGlobals()`. Start-up reaches into `SvgUtils`,
`IndicatorLabelsUtils`, `OllamaApi` and `Config`, and each of those reads the globals back. Holding
the function in `GlobalData.ts` would put the state module in a cycle with all four.

For the same reason `GlobalData.ts` must not re-export `initAdaptivePaletteGlobals` as a
convenience. A value re-export is a real import and rebuilds the cycle.

**`core/MessageEdit.ts`** owns the write side of `changeEncodingContents`. It sits in `core/`
rather than in the feature that vetoes edits, so that editing the message does not require
importing a feature: nine cells and `features/word-prediction/PredictedWords.ts` import
`core/MessageEdit`, and the one feature with an opinion registers a guard instead of being
imported by all ten.

## Start-up order

[`src/client/index.js`](../../src/client/index.js) awaits `initAdaptivePaletteGlobals()` before
anything renders. It:

1. Registers telegraphic translation's `guardEdit` with `setEditGuard()`. This is first, and
   synchronous, so no edit can reach the message unguarded even while the fetches below are in
   flight.
2. Loads the Blissary composite definitions used to draw symbols.
3. Records the container id for the main palette display area.
4. Fetches the Ollama model list, `public/config.json` and the indicator label lookup in parallel,
   then stores the results on `adaptivePaletteGlobals`.

Only then does `index.js` load the palette file map and the fixed palettes and mount the components.
