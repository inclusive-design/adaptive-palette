# Telegraphic Message Translation

An AAC user builds a message in the input area one Bliss symbol at a time. The resulting text
may be telegraphic: keywords only and omitting articles, tense markers, or prepositions.
For example: "brother birthday next Wednesday".

This feature sends that message to a local Ollama model, which generates complete, natural-sounding
sentences. The generated sentences are presented as large, selectable buttons. When the user selects
a sentence, it is spoken aloud and the selection is saved for future model tuning.

The user always controls what is communicated. Generated sentences are suggestions only. Nothing is
spoken automatically unless single-sentence mode has been explicitly enabled.

## Configuration

All settings are defined in the `telegraphicTranslation` section of `public/config.json`.

Prompts are configured through the configuration file. There are no hardcoded prompt defaults for
this feature in the application, so the contents in this config section always reflect the prompts
currently in use.

| Field | Meaning |
| --- | --- |
| `model` | Name of the Ollama model to use. |
| `numSentences` | Number of sentence suggestions to generate. |
| `maxStoredRecords` | Maximum number of selection records retained in local storage. When the limit is reached, the oldest records are removed first. Set to `0` to disable logging while keeping the feature enabled. |
| `systemPrompt` | System prompt template sent to the model. |
| `userPrompt` | User prompt template sent to the model. |

### Prompts

The system prompt:

```text
You are a communication assistant for someone using a Bliss-symbol AAC device. The user
builds messages one symbol at a time, so their input is telegraphic: content words only,
usually with no articles, no tense markers, and no prepositions.

Rewrite the user's telegraphic message as {{numSentences}} complete English sentences.
Each one must be a plausible reading of what the user meant.

Rules:
- Write in the first person, as the user speaking aloud to another person.
- Preserve the meaning of every content word.
- Do not invent facts, names, times, places, or feelings the user did not give.
- When the message is ambiguous, vary the readings: different tense, different politeness,
  or a different sentence type (statement, question, request).
- Keep each sentence short and natural to say out loud.
- Order them most likely first.
- Output exactly {{numSentences}} lines. Each line is one numbered sentence, like
  "1. ...". No preamble, no commentary, no blank lines.
```

The user prompt:

```text
Telegraphic message: {{telegraphicMessage}}
```

## Model selection

The model named in `model` setting is used when Ollama reports it as available. If that name is not
in the available list, the first available model is used instead, and the mismatch is logged
to the console.

If Ollama reports no models at all, the feature is unavailable.

## Interaction

The `Sentence` button starts this feature. It becomes available when the input area has text.

When the input is empty or a request is in progress, the button is marked with `aria-disabled`
instead of the native `disabled` attribute. This keeps the button focusable for keyboard, switch,
and eye-gaze users, while still communicating that it is unavailable to assistive technologies.
The click is inactive in these states.

The button can be in one of three states:

1. **Working**
   - Announces `⏳ Making sentences…` in a live region.
   - The click is unavailable until the request completes.

2. **Choices**
   - Displays one button for each generated sentence, ordered by likelihood.
   - Includes a text field with the placeholder `None of the above — let me type it`.

3. **Error**
   - Announces `⚠ Could not make sentences. Try again.`
   - The click becomes available again.

A live region is in the document at all times and contains an empty string when there is nothing to
announce. Updates are written into the existing region so screen readers can announce status changes.

When sentence choices are returned, focus moves to the first sentence option. This lets users immediately
review the generated choices without navigating back through the page.

When clicking a sentence:

- Speaks the sentence.
- Saves it as the preferred sentence for the current message.
- Keeps the list visible so the sentence can be replayed or a different option can be selected.

The **✓ Done** button clears both the generated choices and the current message.

If the user enters text in the custom input field and submits it, that text is spoken and saved as the
preferred sentence.

### Single-sentence mode

When `numSentences` is `1`, the returned sentence is spoken as soon as it arrives, without
waiting for a click.

## Response Parsing

The model response is split into lines. Blank lines are ignored, and leading list markers such as
`1.`, `2.`, and `3.` are removed from each line.

The number of parsed sentences does not need to match `numSentences`. Any usable sentences are shown
to the user, even if fewer or more than requested are returned.

If no usable sentences can be extracted from the response, the request is treated as a failure and
the feature enters the **Error** state.

## Saved Data

The feature stores one record per telegraphic message in browser local storage. Each record contains:

- Timestamp
- Original telegraphic message
- Model name
- All generated sentence candidates
- Preferred sentence
- Selection method:
  - "chosen": Chosen from generated options
  - "auto": Automatically spoken in single-sentence mode
  - "typed": Entered manually by the user

All generated candidates are retained, including those not selected. Comparing the preferred sentence
with the alternatives provides useful training data for future model tuning.

**The most recently spoken sentence becomes the preferred sentence for that message.**

The log is limited to `maxStoredRecords` entries. When the limit is reached, the oldest records are removed first.

Data can currently be inspected through browser developer tools. No in-application export is provided.

## Edge Cases

| Situation | Behaviour |
| --- | --- |
| Ollama is not running or no models are installed | A banner indicates that AI features are unavailable. The **Sentence** button is not shown. |
| `telegraphicTranslation` is missing or invalid | A configuration error banner is displayed and the **Sentence** button is not shown. No fallback configuration is applied. |
| Configured model is unavailable | The first available model is used and a warning is logged to the console. |
| Empty message | The **Sentence** button is marked `aria-disabled` and cannot be activated. |
| **Done** or **Delete all** pressed while choices are visible | The message and generated choices are cleared. Any saved preference remains. |
| Message edited while choices are visible | Existing choices are discarded because they no longer match the current message. |
| Message edited or cleared while a request is in progress | The response is ignored when it arrives. It is not displayed, spoken, or saved. |
| Request fails or times out | The feature enters the **Error** state. The message remains available so the user can retry. |
| Model returns fewer or more sentences than requested | All usable returned sentences are displayed. |
| Model returns no usable sentences | The feature enters the **Error** state. |
| Local storage write fails | An error is logged to the console. Speech and UI behaviour are unaffected. |
| Speech synthesis is unavailable | No speech is produced, but sentence selection and data storage continue to work. |
