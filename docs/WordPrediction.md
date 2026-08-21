# Word Prediction

An AAC user builds a message in the input area one Bliss symbol at a time. Word Prediction feature
suggests the words most likely to come next and shows each one as a Bliss symbol. Selecting a
suggestion adds that symbol to the message, the same as selecting it from a palette.

Suggestions come from two sources: the user's own past messages, and optionally a model. The history
answers instantly and is what fills the row. The model, when enabled, fills whatever slots the history
left empty. With Ollama absent or the query turned off, prediction comes from the user's own past messages.

## Configuration

The feature is controlled by the `wordPrediction` section of `public/config.json`.

| Field | Meaning |
| --- | --- |
| `show` | Whether the suggestion row is displayed. `false` turns the feature off. |
| `maxSuggestions` | How many suggestions to show at once. |
| `enableModelQuery` | Whether to ask a model for words as well. |
| `model` | Which Ollama model to ask. Empty means its first available model. |
| `systemPrompt` | Tells the model to answer with single words, one per line. Supports `{{numWords}}`. |
| `userPrompt` | Carries the message so far. Supports `{{message}}`. |

The model query needs `enableModelQuery` set and both prompts filled in; anything less leaves it off.

How many messages are kept comes from the top-level `maxStoredRecords` setting, which caps this
log and the telegraphic translation log together.

When the section is missing or malformed, the feature is off and the rest of the configuration
keeps working.

## Interaction

The suggestion row updates every time the message changes.

Each suggestion is a button showing a Bliss symbol and its label. Selecting one inserts that symbol
at the caret and speaks its label, exactly as selecting the symbol from a palette does.

The row is laid out like a palette row: full width, with one cell for each of the `maxSuggestions`
slots. Every slot is drawn whether or not there is a word for it, so a word keeps the same place in
the row as the message grows and the page below never shifts. An unfilled slot is an empty cell:
there is nothing there to press, and nothing for a screen reader to announce.

## How suggestions are chosen

Before any message has been saved, the first-word suggestions come from a short built-in list of
common sentence starters. As soon as the user saves a message, their own history replaces that list
entirely.

For an empty message, the first word of each saved message is counted and the most frequent are
offered.

For a message in progress, the feature looks for what usually follows what the user has just said,
widening the net until it has enough suggestions:

1. Words that have followed the **last two** words of the current message.
2. Words that have followed the **last one** word.
3. The user's most frequently used words overall.

Matching is on labels, so a phrase does not have to repeat exactly to be useful. Ties are broken by
most recent use. A suggestion is never repeated within the row, and the word already at the end of
the message is never suggested.

When the model query is on, the third tier stops filling slots. Its evidence is the weakest of the
three, and those slots are the ones the model's words go into. The tally still counts, as the measure
of how much the user uses a word when the model's words are ranked.

## Words from the model

Words from the model are marked apart from the ones the history found, unless the
`markAiSuggestions` setting is off: a warm fill, an italic label, and an "AI" badge in the
cell's corner. The badge is hidden from screen readers, and the cell names itself
"AI suggestion, `<word>`" instead.

### Request Optimization (Debouncing)

To minimize API calls, requests to the model are debounced by 400ms.

* Any change to the message cancels in-flight requests and resets the timer.
* Queries are **not** sent if the message is empty, or if local history has already filled every available
suggestion slot.

### UI Behavior & Race Conditions

* **Appending only:** Model suggestions are appended to empty slots. Existing words on the screen are
immutable; they never shift position or change.
* **Stale request handling:** Incoming replies are evaluated against the current input. If a reply arrives
after the user has already modified the message, the stale reply is discarded to prevent race conditions.

### Status Indicator & Accessibility

A dynamic status line appears above the suggestion row to report the query state (e.g., "Querying more word
suggestions," followed by the number of words received).

* **Accessibility:** The status line is an ARIA live region, ensuring screen readers announce both active
queries and results.
* **Layout shifting:** The status element takes up no vertical space when empty. When active, it temporarily
pushes the suggestion row and palette downward.
* **Context-aware:** Like the model replies, status messages are tied to the specific input they belong to
and disappear if the user continues typing.
* **Finished messages:** Pressing **Speak** or **Sentence** records the message as finished. The
status line goes quiet for it and any query still running stops, while the words already
suggested stay on the row. Changing the message finishes it no longer, so building the same
message again predicts as normal.
* **Silent failures:** Failed queries fail silently to prevent UI clutter, leaving the user with their existing
history suggestions.

### Ordering

A word the model returns that is already on screen is dropped. What is left is ranked by this formula:

```text
score(w) = W_HISTORY × P_history(w) + W_MODEL × P_model(w)
```

* `W_HISTORY`, weight of history word, defaulted to 0.4.
* `W_MODEL`, weight of model word, defaulted to 0.6.
* `P_model`, its position in the model's reply: 1st = 1.0, 2nd = 0.9, and so on down to 0.
* `P_history`, how much of the candidates' total use in the message log belongs to that word.

```text
P_history(w) = count(w) / Σ count(c) for every candidate c in the model's reply
```

`count(w)` is how often the label `w` appears anywhere in the message log. When no candidate has
ever been used, every `P_history` is 0.

**Worked example** — context "I want", history slots already showing `want` and `coffee`, model
replies `food`, `tea`, `juice`, `hug`. Log counts: `tea` 6, `hug` 2, `food` 0, `juice` 0, so the
candidate sum is 8.

| word | P_history | P_model | score = 0.4·Ph + 0.6·Pm |
| --- | --- | --- | --- |
| tea | 0.75 | 0.9 | 0.30 + 0.54 = **0.84** |
| food | 0 | 1.0 | 0 + 0.60 = **0.60** |
| hug | 0.25 | 0.7 | 0.10 + 0.42 = **0.52** |
| juice | 0 | 0.8 | 0 + 0.48 = **0.48** |

Appended order: `tea`, `food`, `hug`, `juice`. A word the user actually uses outranks one the
model merely liked better.

### Finding a symbol for a word

A suggestion with no Bliss symbol cannot be shown, so each word is looked up in turn:

1. The user's own history, whose stored form carries the indicators and modifiers they used.
2. A Bliss entry one of whose senses is the word, matched as
   [Bliss Sentences](devDoc/BlissSentences.md#look-up-the-key) describes.
3. A Bliss entry with the word inside a longer gloss, shortest gloss first, since a common word appears
   in hundreds of them. This is the one step the Bliss sentence rows do not take.

A word none of these matches is dropped, and more words are asked for than there are slots to make up
for it. Every query writes a line to the browser console reporting how many words came back, which step
found each of them, which were dropped, and the totals for the session. That is the evidence for whether
a cleverer way of matching a word to a symbol is worth building.

Each suggestion is offered in the form it was last used. A symbol saved with an indicator or a
modifier is suggested with them applied.

Having fewer suggestions than `maxSuggestions` is normal, particularly early on. The row fills out
as the history grows.

## Saved Data

Messages are kept in the shared **Message Log** in browser local storage, one record per message
the user has said. Each record contains:

* Timestamp
* The message's symbols, including their labels, indicators, and modifiers
* A translation, on the messages the user asked to turn into a sentence. See
  [TelegraphicMessageTranslation.md](TelegraphicMessageTranslation.md).

Full symbols are stored rather than plain text so a suggestion can be drawn as a symbol and
inserted unchanged.

A message is saved when the user presses **Speak** or **Sentence**: both mean the message is
finished, so it counts towards prediction.

Repeated messages identical to the last stored message are skipped.

The log is limited to `maxStoredRecords` entries. When the limit is reached, the oldest records are
removed first. Setting it to `0` keeps the feature running but stores nothing, which also means no
new predictions are learned.

## Edge Cases

| Situation | Behaviour |
| --- | --- |
| No messages saved yet | The first word is suggested from the built-in starter list. A message in progress gets no suggestions. |
| `config.wordPrediction` is missing or invalid | The feature is off and no suggestion row is rendered. |
| `maxStoredRecords` is `0` | Suggestions still come from whatever is already stored, but no new messages are saved. |
| Fewer matches than `maxSuggestions` | The row shows what it has; its remaining cells are empty. |
| No matches at all | The row stays in place as a row of empty cells. |
| Ollama is not running, or has no models | No query is sent. The history-based suggestions are unaffected and nothing is reported to the user. |
| A model query fails or returns nothing usable | An error is logged to the console and the status line clears. The row keeps the suggestions the history gave it. |
| The model's words all lack Bliss symbols | The slots stay empty. The console line reports the drop. |
| The user changes the message mid-query | The request is cancelled without asking, and its words and status are never shown. Suggestions are recomputed at once, so nothing is lost. |
| **Speak** or **Sentence** is pressed mid-query | The request is cancelled and the status line goes quiet. The words already on the row stay there. |
| The message is finished and the caret is moved | Nothing is asked for. Moving the caret does not change the message. |
| A message said earlier is built again | Prediction runs as normal: the first change to the message ends the finished state. |
| Local storage read fails or holds unreadable data | An error is logged to the console and the history reads as empty. Composing a message is unaffected. |
| Local storage write fails | An error is logged to the console. Speech and the message itself are unaffected. |
| Speech synthesis is unavailable | No speech is produced. Suggestions, selection, and saving continue to work. |
| Empty message when **Speak** or **Sentence** is pressed | The button is `aria-disabled` and announces that it is unavailable. Nothing is saved. |
