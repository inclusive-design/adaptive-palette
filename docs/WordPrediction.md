# Word Prediction

An AAC user builds a message in the input area one Bliss symbol at a time. Word Prediction feature
suggests the words most likely to come next and shows each one as a Bliss symbol. Selecting a
suggestion adds that symbol to the message, the same as selecting it from a palette.

For now, suggestions come from the user's own past messages. No model is involved: prediction works with
Ollama absent and never waits on a network request.

## Configuration

The feature is controlled by the `wordPrediction` section of `public/config.json`.

| Field | Meaning |
| --- | --- |
| `show` | Whether the suggestion row is displayed. `false` turns the feature off. |
| `maxSuggestions` | How many suggestions to show at once. |

How many messages are kept comes from the top-level `maxStoredRecords` setting, which caps this
log and the telegraphic translation log together.

When the section is missing or malformed, the feature is off and the rest of the configuration
keeps working.

## Interaction

The suggestion row sits between the input area and the sentence choices. It updates every time the
message changes.

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

Each suggestion is offered in the form it was last used. A symbol saved with an indicator or a
modifier is suggested with them applied.

Having fewer suggestions than `maxSuggestions` is normal, particularly early on. The row fills out
as the history grows.

## Saved Data

Messages are kept in the shared **Message Log** in browser local storage, one record per message
the user has said. Each record contains:

- Timestamp
- The message's symbols, including their labels, indicators, and modifiers
- A translation, on the messages the user asked to turn into a sentence. See
  [TelegraphicMessageTranslation.md](TelegraphicMessageTranslation.md).

Full symbols are stored rather than plain text so a suggestion can be drawn as a symbol and
inserted unchanged.

A message is saved when the user presses **Speak** or **Sentence**: both mean the message is
finished, so it counts towards prediction.

Repeated messages are stored every time, not merged. Repetition is what tells the feature which
words matter to this user.

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
| Local storage read fails or holds unreadable data | An error is logged to the console and the history reads as empty. Composing a message is unaffected. |
| Local storage write fails | An error is logged to the console. Speech and the message itself are unaffected. |
| Speech synthesis is unavailable | No speech is produced. Suggestions, selection, and saving continue to work. |
| Empty message when **Speak** or **Sentence** is pressed | The button is `aria-disabled` and announces that it is unavailable. Nothing is saved. |
