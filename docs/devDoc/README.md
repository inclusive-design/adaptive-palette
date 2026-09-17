# Developer Documentation

## Adaptive Palette

Technical guide for developers building the adaptive palette.

- [Source Structure](SourceStructure.md) — where the source code live, and the rule that decides
  where a new one goes.
- [State](State.md) — the globals singleton, the signals, and why the start-up and registry modules
  sit outside `state/`.
- [Runtime Configuration](Config.md) — every field in `public/config.json` and what a malformed one
  falls back to.
- [Palettes](Palettes.md) — how a palette renders, the palette set, screens, and the palette JSON
  structure.
- [Cell Types](CellTypes.md) — every registered cell type, its options, and how to add a new one.
- [Bliss Sentences](BlissSentences.md) — how an English sentence becomes a row of Bliss
  symbols, and the shared gloss lookup behind it.
- [Storage](Storage.md) — the storage interface, the IndexedDB backend, and the message log cache
  that keeps reads synchronous.
- [Testing](Testing.md) — the browser test setup and how to run it.
- [Packaging the Desktop Build](Deployment.md) — how the macOS and Windows bundles are built,
  how to test one, and the release checklist.

## Feature Documentation

- [Indicator Label Lookup](../IndicatorLabelLookup.md)
- [Telegraphic Message Translation](../TelegraphicMessageTranslation.md)
- [Word Prediction](../WordPrediction.md)
- [Message Attributes](../MessageAttributes.md)
- [Adjust Settings](../Settings.md)

## Interoperability

- [Mapping Grid 3 Grid Sets](Grid3Mapping.md) — how a Grid 3 export is structured, how it maps to
  Adaptive Palette, and the gaps an import would have to close.

## Tooling

- [Shortcut Keys](../ShortcutKeys.md) — keyboard shortcuts for navigation, caret movement and
  dialogs.
- [Palette Generator](../PaletteJsonGenerator.md),
- [Generating Bliss Symbol Explanations](../GenerateBlissSymbolExplanations.md).
