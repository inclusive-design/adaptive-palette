# Runtime Configuration

`public/config.json` holds the settings that can change without a rebuild. `loadConfig()` in
[`src/client/core/Config.ts`](../../src/client/core/Config.ts) fetches and validates it at startup and stores the
result in `adaptivePaletteGlobals.config`. Each section is validated on its own: a missing or malformed section
falls back to its default and leaves the other sections intact. If the file itself is missing or unparsable,
every section falls back.

Some of these fields can also be changed from within the app, through the **Adjust Settings**
dialog: everything except `model`, `systemPrompt`, and `userPrompt`. Those choices are kept in
the storage layer and applied over the file at start-up by `applyStoredSettings()` in
[`src/client/features/settings/SettingsSchema.ts`](../../src/client/features/settings/SettingsSchema.ts),
which re-validates every value it reads back. See [Settings.md](../Settings.md) and
[Storage.md](Storage.md).

| Section | Controls |
| ------- | -------- |
| `maxRecalledRecords` | Top-level, not a section. How many of the newest stored messages the app reads back for word prediction and sentence recall. |
| `announceSymbolOnInput` | Top-level, not a section. Whether labels are spoken as the user inputs. |
| `markAiSuggestions` | Top-level, not a section. Whether suggestions a model made are marked as such. |
| `indicatorLabelLookup` | The Ollama fallback tier for looking up indicator labels. See [IndicatorLabelLookup.md](../IndicatorLabelLookup.md). |
| `telegraphicTranslation` | Translating a telegraphic message into full sentences. See [TelegraphicMessageTranslation.md](../TelegraphicMessageTranslation.md). |
| `symbolSearch` | The "Add Symbol to Message" trigger and its gloss-search dialog. |
| `svgBuilderString` | The "Add Symbol by SVG-Builder String" trigger and its dialog. Off in production: it is for development. |
| `wordPrediction` | Suggesting the next word from the user's past messages, and optionally from a model. See [WordPrediction.md](../WordPrediction.md). |

## Prompt placeholders

`systemPrompt` and `userPrompt` fields below are templates with `{{name}}` placeholders, filled in at
query time. A placeholder with no matching value is left as is. Nothing validates the names in either
prompt: remove one and that data silently stops reaching the model; misspell one and the literal
`{{name}}` text is sent instead.

`userPrompt` fields are one field per line, rendered with `renderPromptLines()`: a line whose
placeholders all resolve empty is dropped before substitution. This is what lets an optional field --
such as the message attributes line -- disappear from the prompt when there is nothing to say.
The `systemPrompt` fields of `telegraphicTranslation` and `wordPrediction` are prose, not one field
per line, so they keep plain substitution (`renderTemplate()`) instead, and no line of theirs is ever
dropped. `indicatorLabelLookup.systemPrompt` is the exception: it is sent verbatim, so a placeholder
written there reaches the model as literal text.

## `maxRecalledRecords`

An integer controlling how many of the newest stored messages are read back into the app's message
log, the record of what the user has said and the translations made from it. Nothing is ever deleted
from storage; this caps what is read into memory for word prediction and sentence recall, not what is
kept. `0` turns the history off entirely: nothing is read back and nothing new is written. A missing
or malformed value falls back to 500 -- a working-set size, not a storage limit, chosen because word
prediction walks the whole set on every keystroke.

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

## `markAiSuggestions`

A boolean deciding whether suggestions that came from a model are marked apart from those that
did not. When `true`, a word the model suggested and a sentence the model made each get a warm
fill, italic text, and an "AI" badge, and name themselves to a screen reader as
"AI suggestion, `<text>`".

An indicator label the model produced is marked too, but more lightly: an "AI" badge before the
label and the label in italic, with no fill. A word or sentence is an offer the user picks from,
so a fill that marks the whole cell fits; an indicator label is already applied, part of the
message rather than an offer. It is announced as "AI suggestion, `<text>`" once, as it lands.

Only what a model produced is marked. A suggested word found in the user's own message history
is not, and neither is a sentence recalled from the message log, which the user approved
themselves. Nor is an indicator label found in the pregenerated table -- only the model-query
tier is marked. A missing or malformed value leaves the marking on.

The badge and the spoken prefix live in
[`src/client/components/AiBadge.ts`](../../src/client/components/AiBadge.ts). A word's and a
sentence's fill and italic are set per feature, beside the styles for what they mark; the
indicator label's italic sits with the badge in `AiBadge.scss`.

## `indicatorLabelLookup`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `useModelQueryFallback` | boolean | Required. Whether to ask a model when the local label lookup finds nothing. |
| `model` | string | Ollama model name. Defaults to the empty string, which means Ollama's first available model. |
| `systemPrompt` | string | Required, non-empty. Tells the model to answer with the resulting label alone. |
| `userPrompt` | string | Required, non-empty. See [Prompt placeholders](#prompt-placeholders). |

`userPrompt` placeholders: `{{word}}`, `{{pos}}`, `{{explanation}}`, `{{indicator}}`, `{{purpose}}` --
one template covers a symbol with an explanation, one without, and a hand-built symbol that has
neither a part of speech nor an explanation.

When `useModelQueryFallback` is missing or is not a boolean, or either prompt is missing or blank, the whole
section is discarded and the fallback tier is disabled. The pregenerated lookup keeps working.

## `telegraphicTranslation`

There are no hardcoded prompts, so every field below is required except `showBlissSentence`. A partially
configured section is treated as missing and the feature reports itself as unconfigured rather than running
with empty prompts. `showBlissSentence` is exempt so that a `config.json` written before it existed keeps
working: anything other than `false` reads as `true`.

| Field | Type | Description |
| ----- | ---- | ----------- |
| `model` | string | Ollama model name. The empty string means Ollama's first available model. |
| `numSentences` | number | Positive integer. How many candidate sentences to request. |
| `systemPrompt` | string | Non-empty. Supports the `{{numSentences}}` placeholder. |
| `userPrompt` | string | Non-empty. See [Prompt placeholders](#prompt-placeholders). |
| `showBlissSentence` | boolean | Optional. Draws Bliss symbols above each sentence choice. Only `false` turns it off. |

`userPrompt` placeholders: `{{telegraphicMessage}}` and `{{attributes}}` -- the message attributes
the user set, as `Intent: question; Feeling: angry`. Its line is dropped when no attribute is set,
so give it a line of its own. See [MessageAttributes.md](../MessageAttributes.md).

## `wordPrediction`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `show` | boolean | Required. Whether the suggestion row is rendered. |
| `maxSuggestions` | number | Positive integer. How many suggestions to offer at once. Defaults to 10. |
| `enableModelQuery` | boolean | Whether a model is asked for words as well as the message history. Defaults to `false`. |
| `model` | string | Ollama model name. The empty string means Ollama's first available model. |
| `systemPrompt` | string | Non-empty when the query is enabled. Supports the `{{numWords}}` placeholder. |
| `userPrompt` | string | Non-empty when the query is enabled. See [Prompt placeholders](#prompt-placeholders). |

`userPrompt` placeholders: `{{message}}` -- the labels of the message up to the caret -- and
`{{attributes}}` -- the message attributes the user set, as `Intent: question; Feeling: angry`. Its
line is dropped when no attribute is set, so give it a line of its own. See
[MessageAttributes.md](../MessageAttributes.md).

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
