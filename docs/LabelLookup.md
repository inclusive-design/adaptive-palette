# Symbol Labels After a Modifier or Indicator

Bliss modifiers (e.g., "opposite of", "much") change a symbol's meaning, and indicators (e.g., plural, past tense)
change its grammatical form. When the user adds or removes either, the label is worked out again from the symbol's
parts: "cold" + "opposite of" becomes "hot", and "walk" + past-tense indicator becomes "walked".

## Choosing an Indicator

The "add indicator" button on the command bar opens the indicator palette. It lists every
indicator in `public/data/indicators.json` in the file's order, 9 per row with no gaps and no
group headings. The file starts with the most-used ones: plural, action, description, past,
present, future and thing. Picking an indicator applies it to the symbol at the caret and the
palette stays open; Back returns to the previous palette. "remove indicator", next to "add
indicator" on the command bar, removes the indicator from the symbol at the caret.

The palette is `public/palette-sets/standardBlissChart/palettes/indicators.json`. Add a new
indicator at the end of the file, so that the others keep the places users have learned. When an
indicator is added to or moved in `indicators.json`, update the palette too;
`IndicatorsPaletteConsistency.test.ts` fails until they agree.

## Identity Tracking

The system tracks a symbol's dictionary identity rather than relying on its rendered visual composition.
State is managed using the following properties:

- **`userSelectedSymbolId`**: The symbol's core dictionary ID, retained through any modifier or indicator edits.
- **`modifierInfo`**: The modifiers, in the order they were added, each with its text and side.
- **`indicatorId`**: The currently applied indicator ID, if any.
- **`baseLabel`**: The label before any modifier or indicator. Set by the first one and kept after that.
- **`isAiLabel`**: True when the label is a model's answer.
- **`isAiBaseLabel`**: True when the base label is a model's answer, such as a new word's suggested name. The label
  keeps its AI mark while a modifier or indicator wraps it.
- **`pendingLabel`**: Set while the label waits for the model's answer. Never saved.

The pregenerated table's key is `{userSelectedSymbolId}_{indicatorId}`. It covers an indicator alone.

## Label Resolution Order

Changing a symbol never blocks the UI: the symbol is redrawn at once, and a label the model is asked for arrives
later. `labelFor()` in `utils/SymbolLabelUtils.ts` checks, in order:

1. **No modifiers and no indicator:** the base label.
2. **Pre-generated table:** an indicator alone, when `public/data/new_labels_with_indicator.json` has the pair. To
   keep the file small, the table only contains combinations mapped by Part of Speech (POS):

   | Symbol POS | Applicable Indicator Group(s) |
   | :--- | :--- |
   | `noun`, `person` | `Nominal`, `Not planned for Unicode` |
   | `action` | `Verbal` |
   | `description` | `Adjectival` |

3. **Session cache:** the model's answer for the same symbol state earlier in the session. Removing a modifier goes
   back to a state already asked about, so it costs nothing.
4. **Model query (Ollama):** on the desktop version, with Ollama running and `labelLookup.useModelQueryFallback`
   on. While the query runs, the label is the modifiers' text joined to the inner label: the table's label, or the
   model's answer for the indicator alone, or else the base label. It is dimmed and followed by "…"; a screen reader
   reads the joined text. If the symbol changes first, the query is stopped and the new state is asked about. Two
   symbols in the same state share one query.
5. **Joined text:** when the model can't be asked, or gives no answer, the joined text stays.

A model's answer is recorded on `isAiLabel` and shown with an "AI" badge and in italic. `markAiSuggestions` in
`public/config.json` turns the marking off; see [Config.md](devDoc/Config.md).

While a label waits, word prediction asks the model nothing, Make Sentence and word naming wait for it, and Speak
speaks what is on screen. Any other edit to the message while Make Sentence or word naming waits cancels it.

### Announcements

A cell announces the label known at the click:

1. **A table label, or a model's answer from the session cache:** the label, as `"AI suggestion, {label}"` for a
   model's answer when `markAiSuggestions` is on.
2. **An indicator whose label waits or stays unchanged:** `"{label}, {indicator label}"`.
3. **A modifier whose label waits or falls back:** the joined text.

Nothing is spoken when the model's answer arrives later.

## Languages

There is one table per language: `new_labels_with_indicator.json` (English) and
`new_labels_with_indicator_sv.json` (Swedish). The model query uses the UI language's prompt and
gloss, and the cached answer is keyed by language as well as the symbol's state.

## Files Involved

| File | Role |
| :--- | :--- |
| `src/client/utils/SymbolLabelUtils.ts` | Loads the table and metadata, works out labels (`labelFor()`), and asks the model about pending ones. |
| `public/data/new_labels_with_indicator.json` | Pre-generated lookup table (`{symbolId}_{indicatorId} -> label`). |
| `public/data/new_labels_with_indicator_sv.json` | Swedish lookup table, same format. |
| `public/data/indicators.json` | Indicator metadata (id, group, name, purpose). |
| `public/data/bliss_symbol_explanations.json` | Bliss vocabulary (gloss, POS, explanation) used to build model prompts. |
| `public/config.json` | Runtime config (enables/disables Ollama fallback, selects model, `markAiSuggestions`). |
| `src/client/core/InitGlobals.ts` | Starts the label watcher at start-up. |
| `src/client/core/MessageLog.ts` | Drops `pendingLabel` on save; repairs messages saved before labels came from a symbol's parts. |
| `src/client/features/telegraphic-translation/CommandMakeSentence.ts` | Waits for pending labels before making sentences. |
| `src/client/features/compose-word/ComposeWordState.ts` | Waits for pending labels before naming a word. |
| `src/client/features/word-prediction/WordPredictionState.ts` | Runs no query while a label is pending. |
| `src/client/cells/ActionIndicatorCell.ts` | Applies an indicator and triggers label resolution. |
| `src/client/cells/ActionRemoveIndicatorCell.ts` | Removes an indicator; the label is worked out again. |
| `src/client/cells/ActionModifierCellCommon.ts` | Adds a modifier and relabels the symbol. |
| `src/client/cells/ActionRemoveModifierCell.ts` | Removes the last modifier and relabels the symbol. |
| `src/client/cells/ContentEncoding.ts` | Renders the message; folds `markAiSuggestions` into each symbol's AI mark. |
| `src/client/components/BlissSymbol.ts` | Draws a symbol; badges and italicises a marked label. |
| `src/client/components/AiBadge.ts` | The "AI" badge and the spoken "AI suggestion" prefix; styles in `AiBadge.scss`. |

### Runtime Configuration (`public/config.json`)

This config file controls the model query via the `labelLookup` object:

| Property | Type | Description |
| :--- | :--- | :--- |
| `useModelQueryFallback` | Boolean | Whether to ask the model for the label of a symbol with modifiers, or with an indicator the table lacks. |
| `model` | String | Specifies the name of the local Ollama model to query when the model is asked (e.g., `gemma4:12b`). |
| `systemPrompt` | String | Required, non-empty. Instructs the model to reply with the resulting label alone. |
| `userPrompt` | String | Required, non-empty. The per-query prompt, one field per line. |

`userPrompt` supports the placeholders `{{word}}`, `{{pos}}`, `{{explanation}}`, `{{modifiers}}`, `{{indicator}}`
and `{{purpose}}`. `{{modifiers}}` lists the modifiers in the order they were added, with their side: `opposite of
(before), much (after)`. A line whose placeholder values are all empty is dropped, so one template serves modifiers
alone, an indicator alone, both, and a hand-built symbol with no part of speech or explanation:

```text
Word: "cold"
Part of speech: description
Meaning: coldness,cold + description indicator
Modifiers, in order: opposite of (before)
```

If either prompt is missing or blank, the whole section is discarded and the model is never asked; the table still works.

### Indicator Groups (`public/data/indicators.json`)

Indicators are split into four grammatical groups:

| Group | Marks |
| :--- | :--- |
| `Nominal` | Noun forms (plural, definite, thing/abstract sense, combinations). |
| `Verbal` | Verb forms (tense, voice, mood, action, past, future, passive, imperative). |
| `Adjectival` | Description forms (adjective/adverb, participles, before/after-the-fact). |
| `Not planned for Unicode` | Indefinite, direct/indirect object, gender, person, possessive, diminutive. |

## Lookup Table Generation Pipeline

**Goal:** Generate `public/data/new_labels_with_indicator.json`.

The generation pipeline uses three scripts located in `scripts/new_labels_with_indicator/`. Rebuilding after
a vocabulary or indicator change requires running all three steps.

### Step 1: Generate Prompts

Emits a prompt for every valid word/indicator pair based on the POS mapping.

```bash
node scripts/new_labels_with_indicator/generate_indicator_label_prompts.js \
  public/data/bliss_symbol_explanations.json \
  public/data/indicators.json \
  scripts/new_labels_with_indicator/data/new_labels_with_indicator_prompts.jsonl
```

Add `--language sv` to ask with the Swedish gloss and the Swedish system prompt. For the Swedish run,
use the same job script in Step 2 with `--prompts` and `--output` pointing at Swedish files.

**Output:** A JSONL file starting with a `_meta` row (system prompt), followed by rows for each pair containing
`targetId`, `wordId`, `gloss`, `pos`, `indicatorId`, `indicatorName`, and `prompt`.

This script keeps its own copy of the system prompt and builds its per-pair prompt as a single header line, so it
can drift from the live model query prompts in `public/config.json`. Edit both when the wording matters.

### Step 2: Run the Model

Queries a local HuggingFace model via deterministic greedy decoding. This requires a GPU and is typically run as
a batch job on an Alliance server (see `job_run_new_labels_with_indicator.sh`).

```bash
python scripts/new_labels_with_indicator/run_new_labels_with_indicator.py \
  --model /path/to/hf-checkpoint \
  --prompts scripts/new_labels_with_indicator/data/new_labels_with_indicator_prompts.jsonl \
  --output scripts/new_labels_with_indicator/data/new_labels_with_indicator.jsonl
```

**Output:** A JSONL file appending the resolved `newLabel` to each row.

> **Note on Model Selection:** This step intentionally uses a larger, more accurate model (e.g., `gemma-4-31B-it`)
because it runs on GPU hardware. The live model query (Ollama) uses a smaller model (e.g., `gemma4:12b`)
so it can run efficiently on local user devices.

### Step 3: Build the Lookup Table

Flattens the JSONL output into the final key-value JSON map used by the client. The build will intentionally fail
if it detects duplicate `targetId` keys.

```bash
node scripts/new_labels_with_indicator/build_final_labels_with_indicator.js \
  scripts/new_labels_with_indicator/data/new_labels_with_indicator.jsonl \
  public/data/new_labels_with_indicator.json
```
