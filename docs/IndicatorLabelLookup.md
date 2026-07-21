# Indicator Label Lookup

Bliss indicators (plural, definite, action, past, adverb, etc.) mark a grammatical form
on a symbol without changing its meaning. When an indicator is applied to a symbol in the
input area, the palette resolves and displays the grammatically correct label for that
symbol+indicator pair. For example, "walk" plus a past-tense indicator reads and speaks
as "walked".

## Identity tracking

Every symbol in the input area carries its dictionary identity through subsequent edits,
not just its rendered Bliss composition:

- **`userSelectedSymbolId`** — the symbol's dictionary id, set at selection and carried
  through modifier/indicator edits to that symbol.
- **`indicatorInfo`** — the indicator, if any, currently applied.
- **`baseLabel`** — the label before the currently-applied indicator, so it can be
  restored if the indicator is removed or swapped.

A symbol's dictionary id plus an applied indicator's id form a pair unique by
construction, one row of pre-generated data per pair. This pair, not the rendered
composition string, is the lookup key.

## Resolution order

1. **Pre-generated table** — offline lookup keyed by `{symbolId}_{indicatorId}`.
   Instant, no network round-trip.
2. **Optional live model query (Ollama)** — fallback for symbols missing from the table
   (typically hand-built compositions with no dictionary id). Off by default, gated by
   config, since it depends on the AAC user's device running Ollama.
3. **Unchanged label** — neither tier resolves; the indicator still applies and draws,
   only the label stays as it was.

Indicator application never blocks on the lookup: the glyph renders immediately, the
label updates once resolution completes. Every failure mode (missing data file,
malformed config, unreachable LLM, no dictionary id) degrades to "leave the label as is."

**Modifier/indicator interaction:** `baseModifierCount` records how many `modifierInfo`
entries existed at the moment `baseLabel` was captured (i.e. when an indicator was first
applied to a symbol that already had modifier(s)). `baseLabel`'s text already has those
earlier modifiers baked in, so `ActionRemoveIndicatorCell.ts` only reapplies the
modifiers added *after* that point (`modifierInfo.slice(baseModifierCount)`) when
restoring the bare label. `ActionRemoveModifierCell.ts` keeps `baseLabel` and
`baseModifierCount` in sync going the other direction: removing a modifier that predates
the `baseLabel` snapshot strips it from `baseLabel` too and decrements
`baseModifierCount`, so a later indicator removal doesn't resurrect text the user already
removed. This is exercised for the orderings covered in `ActionIndicatorCell.test.ts`,
`ActionRemoveIndicatorCell.test.ts`, and `ActionRemoveModifierCell.test.ts` (modifier
then indicator, indicator then modifier, and removal in either order); orderings outside
those tests are not verified.

## File locations

| File | Role |
| --- | --- |
| `src/client/IndicatorLabelsUtils.ts` | Client module: loads the table + indicator metadata, implements the resolution order |
| `public/data/new_labels_with_indicator.json` | Pre-generated lookup table, `{symbolId}_{indicatorId} -> label` |
| `public/data/indicators.json` | Indicator metadata (id, group, name, purpose) |
| `public/data/bliss_symbol_explanations.json` | Bliss vocabulary (gloss, pos, explanation) used to build LLM prompts |
| `public/config.json` | Runtime config — enables/disables the Ollama fallback tier, selects a model |
| `src/client/ActionIndicatorCell.ts` | Applies an indicator, triggers label resolution |
| `src/client/ActionRemoveIndicatorCell.ts` | Removes an indicator, restores `baseLabel` |

## Indicator groups

`public/data/indicators.json` splits its indicators into 4 groups:

| Group | Marks |
| --- | --- |
| `Nominal` | Noun forms — plural, definite, thing/abstract sense, and combinations thereof |
| `Verbal` | Verb forms — tense, voice, mood (action, past, future, passive, imperative, etc.) |
| `Adjectival` | Description forms — adjective/adverb, participles, before/after-the-fact |
| `Not planned for Unicode` | Grammatical roles not slated for Unicode encoding — indefinite, direct/indirect object, gender, person, possessive, diminutive |

A symbol's `pos` (from `bliss_symbol_explanations.json`) determines which group(s) of
indicators can apply to it:

| `pos` | Applicable indicator group(s) |
| --- | --- |
| `noun`, `person` | `Nominal`, `Not planned for Unicode` |
| `action` | `Verbal` |
| `description` | `Adjectival` |

This mapping defines which pairs are expected to have pre-generated labels in
`public/data/new_labels_with_indicator.json`. A symbol whose `pos` is none of the above
(or an indicator whose group matches no `pos`) has no pre-generated row and falls through
to the resolution order's later tiers.

## Generating the lookup table

**Goal:** produce `public/data/new_labels_with_indicator.json`, mapping every
symbol+indicator pair the vocabulary supports to its grammatically correct label.

Three-stage pipeline: build prompts → run an LLM over them → post-process into the flat
lookup table. All scripts live in `scripts/new_labels_with_indicator/`.

### Step 1 — Generate prompts

For every word/indicator pair whose part of speech matches the indicator's group, emit
one prompt row.

```bash
node scripts/new_labels_with_indicator/generate_indicator_label_prompts.js \
  public/data/bliss_symbol_explanations.json \
  public/data/indicators.json \
  scripts/new_labels_with_indicator/data/new_labels_with_indicator_prompts.jsonl
```

Output: JSONL, one `_meta` row (shared system prompt) followed by one row per pair
(`targetId`, `wordId`, `gloss`, `pos`, `indicatorId`, `indicatorName`, `prompt`).

### Step 2 — Run the LLM

Query a local HuggingFace model with each prompt. Each run overwrites `--output` from
scratch and generates deterministically (greedy decoding), so re-running after a crash
reproduces the same file. This step needs a GPU and typically runs as a batch job on
the server provided by Alliance Canada. (see `job_run_new_labels_with_indicator.sh`
for the Slurm job used in the server).

```bash
python scripts/new_labels_with_indicator/run_new_labels_with_indicator.py \
  --model /path/to/hf-checkpoint \
  --prompts scripts/new_labels_with_indicator/data/new_labels_with_indicator_prompts.jsonl \
  --output scripts/new_labels_with_indicator/data/new_labels_with_indicator.jsonl
```

Output: JSONL, one row per pair with the resolved `newLabel` added.

### Step 3 — Build the lookup table

Flatten the JSONL into the id-keyed JSON map the client loads. `targetId`
(`{wordId}_{indicatorId}`) is unique by construction; a duplicate is treated as corrupt
input and fails the build rather than silently overwriting a row.

```bash
node scripts/new_labels_with_indicator/build_final_labels_with_indicator.js \
  scripts/new_labels_with_indicator/data/new_labels_with_indicator.jsonl \
  public/data/new_labels_with_indicator.json
```

Rebuilding after a vocabulary or indicator-table change requires only Steps 1–3.
Step 2 (the LLM pass) only needs to be re-run when word/indicator prompts themselves
change.

**Note on model choice:** the batch builder (Step 2) and the runtime Ollama fallback
(tier 2 above) intentionally use different models — e.g. `gemma-4-31B-it` for the offline
HPC batch job versus `gemma4:12b` in `public/config.json` for the runtime tier. The
builder runs once, offline, with a GPU available, so it favors a larger, more accurate
model; the runtime tier must run live on the AAC user's own device, so it favors a
model small enough to be feasible there. This is not a mismatch to reconcile.
