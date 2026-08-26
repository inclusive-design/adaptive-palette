# Message Attributes

Tag the message being composed with what it is for, how it should sound, how you feel, and how
urgent it is. The tags go into the model prompts for [word suggestions](WordPrediction.md) and for
[making sentences](TelegraphicMessageTranslation.md), so both come back closer to what you meant.

Attributes only reach the model, so **Msg Style** is hidden when no model is available.

## Using it

1. Tap **Msg Style** in the command bar. The attributes palette opens.
2. Tap any attribute to set it. Tap it again to take it off. As many as you like, from as many
   rows as you like.
3. Tap **Back**. What you set shows as chips at the top left of the screen, opposite the
   symbol-entry buttons; tapping a chip takes that attribute off.

The attributes belong to the one message. They clear when the message clears — "Delete all", or
the "Done" button under the sentence choices. Tapping a sentence speaks and records it, and
pressing Speak does too; neither one clears the message, so either leaves the attributes set.

## The attributes

| Row | Attributes |
| --- | --- |
| Intent | question, request, help |
| Tone | friendly, polite, serious |
| Feeling | happy, sad, angry, worried |
| Priority | urgent, emergency |

Where Bliss has no symbol for the English word, the nearest one is used: "polite" shows the
*please* symbol and "urgent" shows *hurry*. "friendly" is *friend* with the description
indicator over it, which is how Bliss turns the noun into the manner.

Four of these symbols are also vocabulary cells elsewhere in the app: *angry*, *happy*, *sad*
and *friend*. The same picture means "put this word in the message" there and "tag the message
with it" here; only the cell border differs. Worth knowing when introducing the feature to
someone.

## What it does not do

Setting an attribute after tapping "Make Sentences" does not change the sentences already on
screen; tap it again to ask with the attribute set. Deleting symbols one at a time does not
clear the attributes either — unlike "Delete all" and "Done" — so the chips can be left set
above an empty input.

Attributes are not recorded in the message log and are not spoken: they are context sent to the
model, not words the user chose to say.

## Accessibility

Each attribute button's accessible name is `"<Category>: <label>"` (for example "Priority:
urgent"), with `aria-pressed` reflecting whether it is currently set. Each chip's accessible
name is `"Remove <Category>: <label>"`.

The announcement after tapping a cell — "Priority: urgent, on" or "off" — and after tapping a chip,
which always says "off", goes through
`announceIfEnabled()`, so it is silent when `announceSymbolOnInput` is turned off. See
[Config.md](devDoc/Config.md).

## How the attributes reach the model

Both `wordPrediction.userPrompt` and `telegraphicTranslation.userPrompt` in `public/config.json`
carry a line reading `Message attributes: {{attributes}}`. It is filled in with, for example,
`Intent: question; Feeling: angry`. When no attribute is set the whole line is dropped. Removing
the line from a prompt stops the attributes reaching that feature and breaks nothing else. See
[Config.md](devDoc/Config.md) for how the placeholder is rendered and validated.

Without Ollama running, neither feature queries a model — word prediction falls back to message
history alone and the Sentence button is hidden — so the attributes have nothing to reach. **Msg
Style** is hidden as well: `"requiresModel": true` on its cell in
`public/palettes/command_bar.json` tells [`Palette.ts`](devDoc/Palettes.md) to leave the cell out
and to close the command bar up over its column. The rest of the feature is untouched, so
restoring a model brings the button back with no other change.

## Adding an attribute

Edit `public/palettes/attributes.json`. Add a cell of type
[`ActionAttributeCell`](devDoc/CellTypes.md) with a `label`, a `category` matching its row
heading, and a `composition` — that symbol's `id` field from
`public/data/bliss_symbol_explanations.json`. See [Palettes.md](devDoc/Palettes.md) for the
layout fields and for the array form used to compose a symbol like "friendly"'s. No code changes.

The palette is five columns: the row heading plus four attributes. A row with four already has
no free column, and widening the grid makes every cell on the palette smaller, so prefer
swapping an attribute out to adding a column.

A category name lives in three places, and nothing ties them together:

1. the row's `ContentLabel` label in `attributes.json`;
2. the `category` field on every cell in that row;
3. `CATEGORY_ORDER` in `src/client/features/message-attributes/MessageAttributesState.ts`.

Change one and miss another and the heading disagrees with what is announced and sent to the
model; `AttributesPaletteConsistency.test.ts` catches that mismatch. A category absent from
`CATEGORY_ORDER` still works, but is reported to the model after the listed rows, in the order
it was selected rather than in palette order.
