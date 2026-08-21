# Developer Documentation

Technical guide for developers building the adaptive palette.

- [Source Structure](SourceStructure.md) — where the source code live, and the rule that decides
  where a new one goes.
- [State](State.md) — the globals singleton, the signals, and why the start-up and registry modules
  sit outside `state/`.
- [Runtime Configuration](Config.md) — every field in `public/config.json` and what a malformed one
  falls back to.
- [Palettes](Palettes.md) — how a palette renders, the palette file map, and the palette JSON
  structure.
- [Cell Types](CellTypes.md) — every registered cell type, its options, and how to add a new one.
- [Bliss Sentences](BlissSentences.md) — how an English sentence becomes a row of Bliss
  symbols, and the shared gloss lookup behind it.
- [Testing](Testing.md) — the browser test setup and how to run it.

Also useful:

- [Shortcut Keys](../ShortcutKeys.md) — keyboard shortcuts for navigation, caret movement and
  dialogs.
- Feature documentation: [Indicator Label Lookup](../IndicatorLabelLookup.md),
  [Telegraphic Message Translation](../TelegraphicMessageTranslation.md),
  [Word Prediction](../WordPrediction.md), [Adjust Settings](../Settings.md).
