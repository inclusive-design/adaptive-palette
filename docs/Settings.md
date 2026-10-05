# Adjust Settings

The **Adjust Settings** button, at the right of the row above the input area, opens a dialog for
changing how the palette behaves. The choices take effect as soon as they are saved, so nothing
has to be rebuilt or edited by hand.

## What can be changed

Settings defined in `public/config.json` except these fields: `model`, `systemPrompt`, `userPrompt`,
`aboutMe.messagesPerRun`, `switchScanning.moveKey` and `switchScanning.selectKey`.

| Group | Setting | Needs Ollama |
| ----- | ------- | ------------ |
| General | Language | |
| General | Speak each symbol as I add it | |
| General | Mark AI suggestions | yes |
| General | Go back with the backquote (`` ` ``) key | |
| General | Use two-switch row scanning | |
| General | Messages to remember | |
| Symbol entry | Show "Add Symbol to Message" | |
| Symbol entry | Show SVG-builder string entry | |
| Word prediction | Enable word suggestion | |
| Word prediction | Suggestions to show | |
| Word prediction | Ask the AI model for suggestions | yes |
| Sentences | Sentence choices to offer | yes |
| Sentences | Show Bliss symbols above each sentence | yes |
| Indicator labels | Ask the AI model when no label is found | yes |

The prompts sent to the model, and which model is asked, are not adjustable here. They stay in
`public/config.json`.

**Language** switches the app's text and speech between English and Svenska as soon as it is
saved. To open the app in Swedish without the dialog, add `?lang=sv` to the page address, for
example <https://adaptive-palette.pages.dev/?lang=sv>. The public website saves nothing, so this
is how it is kept in Swedish across reloads. `?lang=` changes only that page: saving the settings
keeps the saved language unless **Language** itself was changed. Symbol labels and symbol search
follow the language too. A palette with no labels in the chosen language shows its own, read in
their own voice. Model features answer in the selected language when `config.json` has prompts for it.

See [Access Methods](AccessMethods.md#switches) for switch scanning. Row scanning with two
switches is the only kind supported. Its keys are set in `public/config.json` only.

**Enable word suggestion** is the switch for its whole group. Turning it off switches off the two
settings under it, which carry the note "Turn on \"Enable word suggestion\" to use this." until it is
turned back on.

## Settings that need a model

The five marked above do nothing without a model Ollama can serve. When Ollama is not up and running,
they are still shown but in a disabled state, and carry the note "Start Ollama to use this."
On the public website they carry "AI features are available only in the desktop version." instead.
Their saved values are kept, so starting Ollama later brings them back as they were.

The model settings other than "Mark AI suggestions" are left out of the dialog altogether when
their section of `public/config.json` carries no prompts, since there would be nothing to ask the
model with.

## Saving

**Save and close** saves the choices and applies them at once. The page is not reloaded, so the
message being written and the messages already sent stay as they are. On the public website the
choices last until the page is reloaded or closed.

**Close**, the ✕, and Escape all leave without saving.

## Where the choices are kept

In the app's storage layer, and only the settings that differ from `public/config.json`.
Anything left alone keeps following the file, so a later change to a default still reaches
everyone who has saved. "Clear all saved data" removes these choices along with everything
else, returning the app to the config file's settings.

See [Runtime Configuration](devDoc/Config.md) for the file itself and every field in it.
