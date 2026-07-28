# Label Lookup When Indicator Applied

Bliss indicators (e.g., plural, past tense, adverb) change a symbol's grammatical form without altering
its core meaning. When a user applies an indicator to a symbol in the input area, the system resolves
and displays the grammatically correct label. For example, "walk" + past-tense indicator becomes "walked".

## Identity Tracking

The system tracks a symbol's dictionary identity rather than relying on its rendered visual composition.
State is managed using the following properties:

- **`userSelectedSymbolId`**: The symbol's core dictionary ID, retained through any modifier or indicator edits.
- **`indicatorId`**: The currently applied indicator ID, if any.
- **`baseLabel`**: The original text label, preserved so it can be restored if the indicator is removed or swapped.

The lookup key for resolving a new label is always `{userSelectedSymbolId}_{indicatorId}`.

## Label Resolution Order

Indicator application never blocks the UI; the glyph renders immediately, and the label updates once resolution
completes. The system attempts to resolve the label in the following order:

1. **Pre-generated Table (Offline)**
   Looks up the key in `public/data/new_labels_with_indicator.json`. To optimize file size, the table only
   contains combinations mapped by Part of Speech (POS):

   | Symbol POS | Applicable Indicator Group(s) |
   | :--- | :--- |
   | `noun`, `person` | `Nominal`, `Not planned for Unicode` |
   | `action` | `Verbal` |
   | `description` | `Adjectival` |

2. **Live Model Query (Ollama)**
   Acts as a fallback for combinations missing from the table. It is disabled by default but can be enabled
   in `public/config.json` via `indicatorLabelLookup.useModelQueryFallback`. This feature requires the user's
   device to be running Ollama.

3. **Unchanged Label**
   If both tiers fail (e.g., missing data, unreachable LLM, or invalid POS combination), the system gracefully
   degrades: the visual indicator is applied, but the text label remains unchanged.

### Audio Announcement Order

Audio feedback triggers immediately when an indicator is clicked:

1. **Lookup Table Match:** Announces the new label immediately.
2. **LLM Fallback:** Announces `"{symbol label} {indicator label} — loading new label"` once the indicator is
selected. Once the LLM responds, it announces the new label.
3. **No Match / Fallback Failed:** Announces `"{symbol label} {indicator label}"`. The text label remains unchanged.

### Modifier Interaction

Users can add modifiers before or after applying an indicator. The system tracks any modifiers applied *before* the
indicator and automatically reapplies them to the newly resolved label.

## Files Involved

| File | Role |
| :--- | :--- |
| `src/client/IndicatorLabelsUtils.ts` | Client module: loads the table, metadata, and implements the resolution logic. |
| `public/data/new_labels_with_indicator.json` | Pre-generated lookup table (`{symbolId}_{indicatorId} -> label`). |
| `public/data/indicators.json` | Indicator metadata (id, group, name, purpose). |
| `public/data/bliss_symbol_explanations.json` | Bliss vocabulary (gloss, POS, explanation) used to build LLM prompts. |
| `public/config.json` | Runtime config (enables/disables Ollama fallback, selects model). |
| `src/client/ActionIndicatorCell.ts` | Applies an indicator and triggers label resolution. |
| `src/client/ActionRemoveIndicatorCell.ts` | Removes an indicator and restores `baseLabel`. |

### Runtime Configuration (`public/config.json`)

This config file controls the live LLM fallback behavior (Resolution Tier 2) via the `indicatorLabelLookup` object:

| Property | Type | Description |
| :--- | :--- | :--- |
| `useModelQueryFallback` | Boolean | Enables or disables the live Ollama fallback. If set to `false`, the system bypasses Tier 2 entirely. |
| `model` | String | Specifies the name of the local Ollama model to query when the fallback is triggered (e.g., `gemma4:12b`). |

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

**Output:** A JSONL file starting with a `_meta` row (system prompt), followed by rows for each pair containing
`targetId`, `wordId`, `gloss`, `pos`, `indicatorId`, `indicatorName`, and `prompt`.

### Step 2: Run the LLM

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
because it runs on GPU hardware. The live Ollama fallback (Resolution Tier 2) uses a smaller model (e.g., `gemma4:12b`)
so it can run efficiently on local user devices.

### Step 3: Build the Lookup Table

Flattens the JSONL output into the final key-value JSON map used by the client. The build will intentionally fail
if it detects duplicate `targetId` keys.

```bash
node scripts/new_labels_with_indicator/build_final_labels_with_indicator.js \
  scripts/new_labels_with_indicator/data/new_labels_with_indicator.jsonl \
  public/data/new_labels_with_indicator.json
```
