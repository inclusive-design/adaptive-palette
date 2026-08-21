# Bliss Sentences

How an English sentence becomes a row of Bliss symbols.

## Overview

Telegraphic translation offers the user a few English sentences to choose between. Each choice is
drawn as a row of Bliss symbols, one per span of the sentence, so a user who reads Bliss rather than
English can compare the candidates.

[`BlissSentenceUtils.ts`](../../src/client/features/telegraphic-translation/BlissSentenceUtils.ts)
exports the entry point `blissSlots(sentence)`, which returns one `BlissSentenceSlotType` per span.
Everything it does is pure and synchronous — the sentence is parsed by `compromise` on the client
and looked up in the Bliss vocabulary already in memory. No model is queried and no network call is
made. `showBlissSentence` in `public/config.json` turns the row off; see [Config.md](Config.md).

## The pipeline

```text
"I came home"  --compromise-->  [I:Pron] [came:Verb,PastTense] [home:Noun]
       |
  1. parse               expand contractions, read terms and verb spans
  2. segment into spans  verb + "to" first, then n-grams n=3..2, then single tokens
  3. key each span       verb -> "to " + infinitive; plural noun -> singular; else its text
  4. look the key up     the user's history, then an exact gloss sense
  5. apply an indicator  imperative, tense, plural — overlaid with ";;"
  6. render              a symbol per slot, or the span's text when nothing matched
```

## Parse

`parseSentence()` hands the sentence to `compromise` and reads two things back:

- **terms** — each word with the tags compromise gave it (`Pronoun`, `Plural`, and so on) and its
  `post`, the whitespace and punctuation that followed it.
- **verb spans** — each verb with its infinitive, form and tense, and the ids of the terms it
  covers. `will eat` is one verb over two terms.

Contractions are expanded first, so `I'm` is parsed as `I am`. That happens here rather than in a
prompt to the model, because it holds even when the model ignores the instruction.

compromise types `.json()` as `any`, and its `JsonProps` does not declare the `verb` option the
verbs plugin supports. The document is cast once to `SentenceDocType`, a local type naming just the
shapes this module uses, rather than letting `any` spread through the parsing.

## Segment into spans

`sentenceSpans()` walks the terms left to right in a fixed order. **The order is load-bearing.**

**A verb span is claimed first**, absorbing a following `to` only when another verb follows that
`to`:

| Sentence | Spans |
| -------- | ----- |
| `I want to go home` | `I` / `want to` / `go` / `home` |
| `I want to go to school` | `I` / `want to` / `go` / `to` / `school` |
| `I go to school` | `I` / `go` / `to` / `school` |

Without that guard, `I go to school` loses its directional `to` (id 657).

**The n-gram scan then runs** over each run of terms no verb claimed, n=3 down to n=2, longest match
first. It finds multi-word glosses such as `ice cream` (id 1843) and `Valentine's Day` (id 2680). A
miss is retried with the last word singularized, so `ice creams` finds `ice cream` and takes the
plural indicator. 98% of senses are three words or fewer, which is where `MAX_GLOSS_WORDS` comes
from.

**A verb span keeps only the verb.** compromise folds a verb's negation, its adverbs and the
do-support of a question or a negation into one span. Each of those is split back out, so a span's
label never claims more than its symbol shows:

| Sentence | Spans |
| -------- | ----- |
| `I don't want that` | `I` / `not` / `want` / `that` |
| `I never eat meat` | `I` / `never` / `eat` / `meat` |
| `I don't feel well` | `I` / `not` / `feel` / `well` |
| `I really want that` | `I` / `really` / `want` / `that` |

The negation comes first whatever its place in the English phrase — Bliss puts `not` (id 2088) ahead
of the verb it negates, where English has `do not want` and `is not`. `never` has a symbol of its
own (id 2069). An adverb keeps the side of the verb it was read on. The do-support is dropped rather
than given a span: `do` carries no meaning and has no Bliss symbol.

A do-support verb compromise reports as a span of its own — the `Do` of `Do you want to go
outside?`, the `do` of `How do you feel?` — is not the sentence's verb either, and drawing it would
put `to do, to act` (id 1558) at the head of the row. It is skipped when the term is tagged a
question word, or when a bare `do` carries another verb in the same sentence and is not itself
tagged imperative — which is what `Do your homework` is. A real `do`, as in `I do my homework`,
still resolves to id 1558.

The past tense of `Did you eat?` is lost with the skipped `did`: the indicator belongs to a span
that is no longer drawn.

**Whatever is left is a single-token span.**

Reversing the first two stages breaks `I want to go home`. `to go` is a real two-word sense, so a
scan running first claims it, stranding `want` as a lone token — which matches the noun
`want, desire` (id 4765) rather than the action `to want` (id 2705). The scan never runs at n=1 for
the same reason: a single token is only ever reached after the verbs have taken theirs.

Punctuation is split off each term's `post` once the span covering that term is pushed, one span per
run of non-space characters, so `...` becomes one span rather than three periods.

## Key each span

A span's key is what the dictionary is searched for. It differs from the span's text, because the
Bliss dictionary glosses actions with a `to` prefix and nouns in the singular.

| Span | Key |
| ---- | --- |
| Verb | `to <infinitive>` |
| Plural noun | the singular, plus the plural indicator |
| Anything else | its own text, lowercased |
| Punctuation | the mark itself |

Two details:

- compromise already prefixes the infinitive with `to` for a `have to` construction, so the prefix
  is stripped before it is added back. Otherwise the span keys as `to to go`.
- `toSingular()` tags the word `Noun` before asking for the singular. compromise reads a bare
  `books` or `drinks` as a verb, which leaves `.nouns()` empty and the word unchanged.

The span's text, not its key, labels the symbol: the user reads `want to`, even though `to want` is
what was looked up.

## Look up the key

[`utils/GlossLookupUtils.ts`](../../src/client/utils/GlossLookupUtils.ts) is the resolution engine
for both the Bliss sentence rows and the word prediction row, which is why it lives in `utils/`
rather than inside either feature. An entry's gloss is a comma-separated list of synonym senses —
`water, fluid, liquid` — sometimes with a trailing parenthetical qualifier: `side (body)`,
`a (lowercase)`.

### Two indexes

The vocabulary is indexed by sense on first use, once for each of the two readings below, and every
lookup is a map hit. It used to be scanned per lookup — 6420 entries, twice over on a miss — which
cost about 8 ms per sentence. Every span of every candidate sentence is looked up synchronously
before the choices are first drawn, so that time lands on the first paint. Building both indexes
costs about 15 ms, once.

`findGlossEntry(key)` tries the index of senses as written, and the normalized one only if that
missed. The order matters:

1. **senses as written**, lowercased and trimmed but otherwise untouched, with `preferSingleSense`
   on;
2. **senses normalized**, with the trailing parenthetical dropped, with `preferSingleSense` off.

1192 of the 6420 entries carry a trailing parenthetical, and most of them disambiguate rather than
annotate. Normalizing in one pass turns those into single-sense entries that outrank the right
answer, sending `i` to id 37 instead of id 1840 and `a` to id 29 instead of id 100. Only a key whose
every candidate is qualified reaches the second index, which is exactly what normalization is for.

`preferSingleSense` is off on the normalized index because there every candidate is qualified by
definition, and the rule would pick the more obscure disambiguation: `four` would land on id 23,
`four (index number)`, a superscript modifier glyph, rather than id 13, `four (digit), 4`.

Within one index, a tie goes to the earliest sense position, so `water` is the fluid rather than a late
synonym of `urine`; then, on the written pass only, to an entry whose one sense is the key, so
`ice cream` alone beats `ice cream, sherbet, sorbet`; then to the lowest id, since the vocabulary is
ordered by id and a strict comparison keeps the first entry seen.

### Precedence for a sentence span

`spanPayload()` tries, in order:

1. **the user's own history** — a payload from the message log carries the indicators, modifiers and
   symbol they chose for that word themselves, so it beats anything the dictionary offers;
2. **`findGlossEntry(span.key)`**;
3. **nothing** — the span is rendered as text.

History is consulted three ways, because a span's key is not what the user's label looks like:
`span.key`, then `span.text` lowercased, then `span.key` with its leading `to` prefix stripped. A
verb span is keyed `to want` and reads `want to`, while the label they saved is `want`.

Word prediction takes a third, looser rung that sentences deliberately stop before: an entry with
the word somewhere inside a longer gloss. A wrong suggestion is ignorable in a prediction row; a
wrong symbol in a sentence the user is about to speak is not.

### Punctuation

A punctuation span resolves through a direct map from mark to id, checked before history and before
the dictionary:

| Mark | `!` | `?` | `.` | `,` | `:` | `'` |
| ---- | --- | --- | --- | --- | --- | --- |
| Id | 1 | 3 | 4 | 5 | 6 | 7 |

The map is used instead of the gloss lookup because the glosses collide: `period` is a sense of
id 426, `limited time, interval, period, awhile, for a while`, and of id 2001,
`menstruation, menstrual period, period`. A mark
outside the map, such as a dash or an ellipsis, resolves to nothing and is drawn as text.
Contractions were expanded during parsing, so no apostrophe survives from one.

### What the module exports

| Export | Returns | Called by |
| ------ | ------- | --------- |
| `findGlossEntry` | The entry one of whose senses is the key | Bliss sentences, `resolveWordPayload` |
| `glossPayload` | A payload for a found symbol, labelled with the word looked up | Bliss sentences, `resolveWordPayload` |
| `resolveWordPayload` | The three-rung resolution, reporting which rung hit | Word prediction |
| `normalizeSense` | One sense lowercased, trimmed, parenthetical dropped | `findGlossEntry`; exported for its tests |

## Apply an indicator

A span may carry one Bliss indicator:

| Indicator | Id | Applied when |
| --------- | -- | ------------ |
| Past | 92 | the verb's tense is `PastTense` |
| Future | 87 | the verb's tense is `FutureTense` |
| Imperative | 907 | the verb's form is `imperative` and no pronoun precedes it |
| Plural | 99 | the term is tagged `Plural`, or an n-gram matched only once singularized |

The present tense adds none. An action entry's own indicator 81 is already the unmarked present;
928 is the marked form, and adding it would say more than the sentence does.

Imperative is tested before tense, because compromise tags an imperative `PresentTense` as well and
a tense-first order would never reach it. `form === "imperative"` is not on its own evidence of a
command: compromise reports it for the bare verb of a modal question too, so `Can you help me?`
would be marked as an order. A subject pronoun ahead of the verb rules that out, and no real
imperative has one.

That scan reaches only into the verb's own sentence. compromise parses however many sentences it is
handed at once, so `Please help me.` is still an order when `I am tired.` comes ahead of it.

### How an indicator is attached

The indicator is overlaid on the symbol with the word-level separator `;;`:

```text
to come + past      ->  [1440, ";;", 92]
ice cream + plural  ->  [1843, ";;", 99]
```

`bliss-svg-builder` resolves `;;` itself: it finds the word's head glyph, places the indicator
there, and hides the head's own character-level indicators while the overlay exists. So id 1440,
`to come`, whose composition already carries indicator 81, renders with 92 in its place. The overlay
takes the bare symbol id rather than the composition, so the library has a head glyph to find, which
is what `userSelectedSymbolId` is for. No composition surgery is needed anywhere.

Three cases leave a payload from history exactly as the user built it:

- **it already carries an indicator** — they chose that one for this word themselves, and theirs
  wins;
- **it carries modifiers** — the overlay replaces the composition, which would drop the modifiers
  from what is drawn while `modifierInfo` still claimed they were there;
- **it has no `userSelectedSymbolId`** — a symbol the user composed themselves has no bare id for
  the library to hang the indicator on.

## Render

[`BlissSentence.ts`](../../src/client/features/telegraphic-translation/BlissSentence.ts) draws one
slot per span:

- a slot with a payload becomes a `BlissSymbol`, labelled with the span's English text, so a reader
  can see which words it accounted for;
- a slot without one becomes a plain text span.

The slots are memoized on the sentence, because `SentenceChoices` re-renders on every keystroke in
its text box and re-parsing every candidate per keystroke is wasteful.

The whole row is `aria-hidden`: it sits inside the sentence choice button, and its labels would
otherwise be read as part of that button's name. The button carries the English sentence as its
`aria-label` instead.

## Failure and limits

There is no network call, so the pipeline cannot fail as a unit. A span that resolves to nothing is
the normal path rather than an error: it is drawn as text, and the rest of the row is unaffected.

If compromise throws on some input, `blissSlots()` logs it and returns the whole sentence as a
single text slot, so a sentence choice is never lost. A blank sentence returns no slots at all.

`toSingular()` memoizes what it has conjugated. Building a compromise document costs about a
millisecond, and the n-gram scan asks for the same word once per candidate length, for every
sentence the model offered.

Deliberately not handled:

- passive, conditional and continuous forms carry no indicator;
- a skipped do-support takes its tense with it: `Did you eat?` reads as the present;
- a punctuation mark with no Bliss symbol, such as a dash or an ellipsis, is drawn as text.

## Where the code lives

| File | Owns |
| ---- | ---- |
| [`features/telegraphic-translation/BlissSentenceUtils.ts`](../../src/client/features/telegraphic-translation/BlissSentenceUtils.ts) | Parsing, segmentation, keys, indicators. Exports `blissSlots()` and `sentenceSpans()` |
| [`features/telegraphic-translation/BlissSentence.ts`](../../src/client/features/telegraphic-translation/BlissSentence.ts) | The row component |
| [`utils/GlossLookupUtils.ts`](../../src/client/utils/GlossLookupUtils.ts) | The gloss lookup, shared with word prediction |
