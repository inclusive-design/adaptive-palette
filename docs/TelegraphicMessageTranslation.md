# Telegraphic Message Translation

An AAC user builds a message in the input area one Bliss symbol at a time. The resulting text
may be telegraphic: keywords only and omitting articles, tense markers, or prepositions.
For example: "brother birthday next Wednesday".

This feature sends that message to a local Ollama model, which generates complete, natural-sounding
sentences. The generated sentences are presented as large, selectable buttons. When the user selects
a sentence, it is spoken aloud and the selection is saved for future model tuning.

The user always controls what is communicated. Generated sentences are suggestions only. Nothing is
spoken until the user picks a sentence or submits their own text.

## Configuration

All settings are defined in the `telegraphicTranslation` section of `public/config.json`.

Prompts are configured through the configuration file. There are no hardcoded prompt defaults for
this feature in the application, so the contents in this config section always reflect the prompts
currently in use.

| Field | Meaning |
| --- | --- |
| `model` | Name of the Ollama model to use. |
| `numSentences` | Number of sentence suggestions to generate. |
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

When no model is available, the `Sentence` button is hidden. Its space is taken by the input area.

When the input is empty or a request is in progress, the button is marked with `aria-disabled`
instead of the native `disabled` attribute. This keeps the button focusable for keyboard, switch,
and eye-gaze users, while still communicating that it is unavailable to assistive technologies.
The click is inactive in these states.

The **Speak** button next to the typing area's text field is marked `aria-disabled` for the same reason,
while the field is empty or holds only spaces. Pressing it then announces that it is unavailable instead
of speaking.

Pressing **Sentence** first looks the message up in the message log (see [Saved Data](#saved-data)). If
the message has been translated before, its most recently recorded sentence appears immediately, with no
model query. It waits to be tapped like any other sentence, and nothing is recorded until it is. With
`numSentences` at `1` that is the whole interaction. With `numSentences` above `1`, the model is asked
for the rest, which are appended below the recalled sentence. A returned sentence identical to the
recalled one is dropped, so the list can end up shorter than `numSentences`.

The sentence area can be in one of four states:

1. **Idle**
   - Nothing is shown. This is the state before any message has been sent for translation, and after
     **✓ Done** or **Delete all** clears everything.

2. **Working**
   - Announces `⏳ Making sentences…` in a live region, or `⏳ Making more sentences…` when a recalled
     sentence is already showing.
   - Includes the typing area (text field, **Speak**, **✓ Done**) and any recalled sentence.

3. **Choices**
   - Displays one button per sentence: a recalled one first if there is one, followed by the model's
     suggestions in order.
   - Includes the typing area (text field, **Speak**, **✓ Done**).

4. **Error**
   - Announces `⚠ Could not make sentences. Try again.`
   - The typing area stays on screen, together with any recalled sentence.

The typing area is present in every state except **Idle**, and typing does not wait for the model.

Requesting a sentence also records the message for [word prediction](WordPrediction.md), since asking for
a sentence means the message is finished.

A live region is in the document at all times and contains an empty string when there is nothing to
announce. Updates are written into the existing region so screen readers can announce status changes.

Focus moves to the first sentence option once per message, not on every update, so a second wave of
sentences filled in after a recall does not drag the user back to the top of the list. Focus never moves
away from the text field while it holds focus.

Tapping a sentence, speaking typed text, and **✓ Done** each stop a fill request still running — the
user has said what they wanted, so a query for more suggestions is no longer needed.

When clicking a sentence:

- Speaks the sentence.
- Saves it as the preferred sentence for the current message.
- Keeps the list visible so the sentence can be replayed or a different option can be selected.

The **✓ Done** button clears both the generated choices and the current message.

If the user enters text in the custom input field and submits it, that text is spoken and saved as the
preferred sentence.

If the input area is modified while a query is in progress or while sentences are displayed on the screen,
a modal dialog titled "Change your message?" will appear. Because the new input invalidates the current translation
results, the user will be asked if they want to proceed. The edit is held back while the question is on screen, so
the message stays as it was: applying it would start word prediction on a message the user has not agreed to, and
leave that query running beside the sentence query. "Change anyway" aborts the active query, clears the existing
sentences and applies the edit. "Keep sentences", Escape and the dialog's ✕ all drop the edit and leave
the query and the sentences as is. Word prediction reports nothing and runs no query of its own
while the question is on screen.

If a recalled sentence is shown on the screen with an error message from a failed request, it counts as a
displayed sentence. But when there is no sentence on screen, for example, when an error occurred, or the user
chose "speak" or moved on before the sentence appeared, the state is cleared without asking the user anything
because there is nothing to discard.

## Response Parsing

The model response is split into lines. Blank lines are ignored, and leading list markers such as
`1.`, `2.`, and `3.` are removed from each line.

The number of parsed sentences does not need to match `numSentences`. Any usable sentences are shown
to the user, even if fewer or more than requested are returned. When a sentence has already been recalled
for the message, only enough of the parsed sentences to reach `numSentences` are kept, and one identical
to the recalled sentence is dropped — see [Interaction](#interaction).

If no usable sentences can be extracted from the response, the request is treated as a failure and
the feature enters the **Error** state.

## Saved Data

Translations are stored in the shared **Message Log** in browser local storage, described in
[WordPrediction.md](WordPrediction.md). Pressing **Sentence** records the message itself; choosing a
sentence adds the translation to that record:

- Model name
- All generated sentence candidates
- Preferred sentence
- Selection method:
  - "chosen": Chosen from generated options
  - "typed": Entered manually by the user

All generated candidates are retained, including those not selected. Comparing the preferred sentence
with the alternatives provides useful training data for future model tuning.

**The most recently spoken sentence becomes the preferred sentence for that message.** A repeated
message is recorded each time it is said, and the translation attaches to its most recent record.

The log is limited to the top-level `maxStoredRecords` setting in `public/config.json`, which caps every
log the application keeps. When the limit is reached, the oldest records are removed first. Setting it to
`0` keeps the feature but stores nothing.

Data can currently be inspected through browser developer tools. No in-application export is provided.

## Edge Cases

| Situation | Behaviour |
| --- | --- |
| Ollama is not running or no models are installed | A banner indicates that AI features are unavailable. The **Sentence** button is not shown. |
| `config.telegraphicTranslation` is missing or invalid | A configuration error banner is displayed and the **Sentence** button is not shown. No fallback configuration is applied. |
| Configured model is unavailable | The first available model is used and a warning is logged to the console. |
| Message has a past translation | Its most recently spoken sentence is shown first, with no query. Remaining sentences are requested only when `numSentences` is above `1`. |
| Model repeats the recalled sentence | The repeat is dropped; the list can end up shorter than `numSentences`. |
| Empty message | The **Sentence** button is marked `aria-disabled` and cannot be activated. |
| Text field empty | The **Speak** button is marked `aria-disabled` and announces it is unavailable when pressed. |
| **Done** or **Delete all** pressed while choices are visible | The message and generated choices are cleared. Any saved preference remains. |
| Message edited while sentences are visible | Warn user this action will discard existing sentences because they no longer match the current message. This includes a recalled sentence still on screen under a failed request's error report. |
| Message edited while a request is in progress | Warn user this action will abort the current query because responded sentences no longer match the current message. |
| Request fails or times out | The feature enters the **Error** state: the error line replaces the progress line and the typing area stays on screen, along with any recalled sentence. The message remains available so the user can retry. |
| Model returns fewer or more sentences than requested | All usable returned sentences are displayed, unless a sentence was recalled for the message — see above. |
| Model returns no usable sentences | The feature enters the **Error** state. |
| Local storage write fails | An error is logged to the console. Speech and UI behaviour are unaffected. |
| Speech synthesis is unavailable | No speech is produced, but sentence selection and data storage continue to work. |
