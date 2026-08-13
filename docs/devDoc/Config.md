# Runtime Configuration

`public/config.json` holds the settings that can change without a rebuild. `loadConfig()` in
[`src/client/core/Config.ts`](../../src/client/core/Config.ts) fetches and validates it at startup and stores the
result in `adaptivePaletteGlobals.config`. Each section is validated on its own: a missing or malformed section
falls back to its default and leaves the other sections intact. If the file itself is missing or unparsable,
every section falls back.

| Section | Controls |
| ------- | -------- |
| `maxStoredRecords` | Top-level, not a section. How many messages the local-storage message log keeps. |
| `announceSymbolOnInput` | Top-level, not a section. Whether labels are spoken as the user inputs. |
| `indicatorLabelLookup` | The Ollama fallback tier for looking up indicator labels. See [IndicatorLabelLookup.md](../IndicatorLabelLookup.md). |
| `telegraphicTranslation` | Translating a telegraphic message into full sentences. See [TelegraphicMessageTranslation.md](../TelegraphicMessageTranslation.md). |
| `symbolSearch` | The "Add symbol to message" trigger and its gloss-search dialog. |
| `svgBuilderString` | The "Add symbol by svg-builder string" trigger and its dialog. Off in production: it is for development. |
| `wordPrediction` | Suggesting the next word from the user's past messages, and optionally from a model. See [WordPrediction.md](../WordPrediction.md). |

## `maxStoredRecords`

An integer capping the message log, the single local-storage log holding the messages the
user has said and the translations made from them. When it reaches the limit, its oldest records are
dropped first. `0` keeps the features that log but stores nothing. A missing or malformed value falls
back to 500.

## `announceSymbolOnInput`

A boolean deciding whether the palette speaks a label when the user selects a symbol. When `true`, adding a symbol,
applying an indicator or modifier, choosing a predicted word, navigating to a palette, and moving the
caret each announce their label. When `false`, all of that goes quiet and the "Speak" button, which reads
the whole composed message, becomes the only routine speech.

Failures always speak, whatever the setting: activating a cell marked `aria-disabled` announces
"`<label>` unavailable". Nothing else tells the user that a press did nothing, since the message
preview is deliberately not a live region.

The two are separate functions in [`src/client/utils/SpeechUtils.ts`](../../src/client/utils/SpeechUtils.ts):
`announceIfEnabled()` consults this setting, `speak()` ignores it.

## `indicatorLabelLookup`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `useModelQueryFallback` | boolean | Required. Whether to ask a model when the local label lookup finds nothing. |
| `model` | string | Ollama model name. Defaults to the empty string, which means Ollama's first available model. |
| `systemPrompt` | string | Required, non-empty. Tells the model to answer with the resulting label alone. |
| `userPrompt` | string | Required, non-empty. One field per line, using the placeholders below. |

`userPrompt` placeholders: `{{word}}`, `{{pos}}`, `{{explanation}}`, `{{indicator}}`, `{{purpose}}`. A line
whose placeholder value is empty is dropped, so one template covers a symbol with an explanation, one without,
and a hand-built symbol that has neither a part of speech nor an explanation.

When `useModelQueryFallback` is missing or is not a boolean, or either prompt is missing or blank, the whole
section is discarded and the fallback tier is disabled. The pregenerated lookup keeps working.

## `telegraphicTranslation`

There are no hardcoded prompts, so every field below is required. A partially configured section is treated as
missing and the feature reports itself as unconfigured rather than running with empty prompts.

| Field | Type | Description |
| ----- | ---- | ----------- |
| `model` | string | Ollama model name. The empty string means Ollama's first available model. |
| `numSentences` | number | Positive integer. How many candidate sentences to request. |
| `systemPrompt` | string | Non-empty. Supports the `{{numSentences}}` placeholder. |
| `userPrompt` | string | Non-empty. Supports the `{{telegraphicMessage}}` placeholder. |

Placeholders are `{{name}}` and are substituted at query time; one with no matching value is left as is.

## `wordPrediction`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `show` | boolean | Required. Whether the suggestion row is rendered. |
| `maxSuggestions` | number | Positive integer. How many suggestions to offer at once. Defaults to 10. |
| `enableModelQuery` | boolean | Whether a model is asked for words as well as the message history. Defaults to `false`. |
| `model` | string | Ollama model name. The empty string means Ollama's first available model. |
| `systemPrompt` | string | Non-empty when the query is enabled. Supports the `{{numWords}}` placeholder. |
| `userPrompt` | string | Non-empty when the query is enabled. Supports the `{{message}}` placeholder. |

`{{numWords}}` is how many words to ask for, and `{{message}}` the labels of the message up to the caret.

When the section is missing or `show` is not a boolean, the feature is off. A malformed `maxSuggestions`
alone falls back to 10 and leaves the feature on.

The model query is a separate decision from the feature itself. It runs only when `enableModelQuery` is
`true` and both prompts are filled in: there are no hardcoded prompts to query with, so a half-configured
model section is treated as `enableModelQuery: false` and the history-based suggestions carry on alone.
Ollama having no model available turns the query off too, silently.

## `symbolSearch` and `svgBuilderString`

Both are feature-visibility sections carrying a single `show` boolean. The matching toolbar trigger is rendered
only when `show` is `true`. When the section is missing or `show` is not a boolean, `symbolSearch` defaults to
`true` and `svgBuilderString` to `false`, so an older config.json neither loses symbol search nor turns on the
developer tool.
