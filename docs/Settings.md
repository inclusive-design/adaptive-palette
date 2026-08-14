# Adjust Settings

The **Adjust Settings** button, at the right of the row above the input area, opens a dialog for
changing how the palette behaves. The choices are saved in the browser and are used the next time
the page loads, so nothing has to be rebuilt or edited by hand.

## What can be changed

Settings defined in `public/config.json` except these fields: `model`, `systemPrompt`, and `userPrompt`.

| Group | Setting | Needs Ollama |
| ----- | ------- | ------------ |
| General | Speak each symbol as I add it | |
| General | Messages to keep | |
| Symbol entry | Show "Add Symbol to Message" | |
| Symbol entry | Show SVG-builder string entry | |
| Word prediction | Enable word suggestion | |
| Word prediction | Suggestions to show | |
| Word prediction | Ask the AI model for suggestions | yes |
| Sentences | Sentence choices to offer | yes |
| Indicator labels | Ask the AI model when no label is found | yes |

The prompts sent to the model, and which model is asked, are not adjustable here. They stay in
`public/config.json`.

**Enable word suggestion** is the switch for its whole group. Turning it off switches off the two
settings under it, which carry the note "Turn on \"Enable word suggestion\" to use this." until it is
turned back on.

## Settings that need a model

The three marked above do nothing without a model Ollama can serve. When Ollama is not up and running,
they are still shown but in diabled state, and carry the note "Start Ollama to use this."
Their saved values are kept, so starting Ollama later brings them back as they were.

## Saving

**Save and close** first warns that saving reloads the page, which loses the message being written.
Messages already saved are kept. Answering **No** returns to the dialog with the changes still
there; **Yes, save** saves and reloads.

**Close**, the ✕, and Escape all leave without saving.

## Where the choices are kept

In local storage, under the key `Settings`, and only the settings that differ from
`public/config.json`. Anything left alone keeps following the file, so a later change to a default
still reaches everyone who has saved. "Clear all saved data" removes these choices along with
everything else, returning the app to the file's settings.

See [Runtime Configuration](devDoc/Config.md) for the file itself and every field in it.
