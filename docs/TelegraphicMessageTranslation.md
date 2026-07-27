# Telegraphic Message Translation

An AAC user builds a message in the input area one Bliss symbol at a time. The input may be
telegraphic: content words only, usually without articles, tense markers, or prepositions —
for example "brother birthday next Wednesday". This feature asks a local Ollama model to
turn that message into complete, speakable English sentences, offers them to the user as
large buttons, speaks the one the user picks, and records the choice for later fine-tuning.

The user is always the one who decides what gets said. The model proposes; it never speaks
on the user's behalf without a choice being made, except in the explicitly configured
single-sentence mode described below.

## Configuration

All settings live in one `telegraphicTranslation` section of `public/config.json`. There
are no hardcoded prompt defaults in the source: the config file is the only place the
prompts exist, so what you read there is always what is running.

| Field | Meaning |
| --- | --- |
| `model` | Preferred Ollama model name. |
| `numSentences` | How many complete sentences to ask for. |
| `maxStoredRecords` | Cap on records kept in local storage; oldest are dropped first. `0` keeps the feature but logs nothing. |
| `systemPrompt` | System prompt template. |
| `userPrompt` | User prompt template. |

### Suggested prompts

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

The model named in `model` is used when Ollama reports it as available. If that name is not
in the available list — a typo, an uninstalled model, a renamed tag — the first available
model is used instead, and the mismatch is logged to the console.

If Ollama reports no models at all, the feature is unavailable.

## Interaction

`Sentence` button is the initial trigger of this feature.

While the message is empty and while a query is in flight, the button is marked
`aria-disabled` rather than carrying the `disabled` attribute, and the click handler
refuses to act. A genuinely disabled element loses focus the moment it is disabled, and
for someone driving the palette by switch scanning or eye gaze that means losing their
place mid-interaction — the one moment they least want to start over. `aria-disabled` says
the same thing to assistive technology while leaving the element focusable.

The states below the button are:

1. **Working** — `⏳ Making sentences…` in a live region, with the trigger unavailable.
2. **Choices** — one large button per returned sentence, most likely first, plus a text box
   hinted `None of above — let me type it`.
3. **Error** — `⚠ Could not make sentences. Try again.` The trigger becomes available again.

The live region is present in the document at all times, holding an empty string when
there is nothing to announce. A `role="status"` element inserted with its text already in
place is routinely missed by screen readers; the announcement only lands reliably when the
text arrives in a region that was already being watched.

When the choices arrive, focus moves to the first of them. Clicking the trigger leaves
focus on the trigger, and without this a switch user would have to scan the whole page
again to reach the sentences they just asked for.

Tapping a sentence speaks it and records it as the preferred sentence for that message.
The list stays on screen afterwards, so the user can repeat the sentence for a listener who
missed it, or pick a different one.

A `✓ Done` button clears the choices and the message together.

Submitting text in the box speaks that text and records it as the preferred sentence.

### Single-sentence mode

When `numSentences` is `1`, the returned sentence is spoken as soon as it arrives, without
waiting for a tap.

## Response parsing

The reply is split on newlines; blank lines are dropped, and a leading list number — `1.`,
`2.`, and so on — is stripped from each line.A count that does not match `numSentences` is
accepted as-is: usable sentences are worth more to the user than an error message.

If parsing yields no usable lines at all, the result is treated as an error.

## Saved data

Browser local storage holds one record per distinct telegraphic message: a timestamp, the
message, the model used, all candidates that were returned, the preferred sentence, and how
it was arrived at (chosen from the list, auto-spoken in single-sentence mode, or typed by
the user). The rejected candidates are kept deliberately: knowing which sentence was
preferred over which alternatives is the signal that makes this data useful for
fine-tuning.

**The last sentence spoken for a message is the preference.** Saving again for the same
message replaces the earlier record and moves it to the end of the log.

The log is capped at `maxStoredRecords` messages, dropping oldest first.

There is no in-application export. The data is read from browser developer tools for now.

## Edge cases

| Situation | Behaviour |
| --- | --- |
| Ollama not running, or no models installed | Banner at the top of the page: "No models available. Start Ollama to enable AI features." The `Sentence` button is not rendered. |
| `telegraphicTranslation` section missing or malformed | Same treatment: banner with wording for this case, and no button. Nothing is silently substituted, so a broken config is visible rather than mysterious. |
| Configured model not available | First available model is used; console warning. |
| Empty message | Button marked `aria-disabled`; clicking it does nothing. |
| Done, or Delete all, pressed while choices are showing | Choices and message are discarded together; the recorded preference is kept. |
| Message edited while choices are showing | Choices are discarded: they belong to the message they were made from. |
| Message edited or cleared while a query is in flight | The reply is discarded when it arrives -- not shown, not spoken, not logged. |
| Query fails or times out | Error state; the message and the button remain, so the user can retry. |
| Model returns fewer or more sentences than requested | Whatever came back is shown. |
| Model returns nothing usable | Error state. |
| Local storage write fails | Console error only; speech already happened and the UI is unaffected. |
| Speech synthesis unavailable | Nothing is spoken; choices and saving still work. This is the existing `speak()` behaviour. |
