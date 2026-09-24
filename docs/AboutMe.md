# About Me

The **About Me** button, at the right of the row above the input area beside **Adjust
Settings**, keeps short
notes about you: your family, your background, what you like, and how you like to talk. Sentence
choices and word suggestions use them. For example, if About Me says you have a dog named Rex,
"dog walk" can become "I'm taking Rex for a walk."

The button is in the desktop version only. The public website has no AI model, so nothing there
would read what you wrote.

## The dialog

- **Your notes** — facts you type in. Pick a category, type the note and choose **Add note**. Each
  note can be edited or deleted.
- **What the system has learnt** — facts the AI model suggested and you accepted. They can be
  deleted but not edited. A deleted fact is not suggested again.
- **Suggestions you turned down** — everything you rejected or deleted. Nothing is thrown away:
  what was wrong once may be right later, so each one has an **Add back** button that moves it
  into "What the system has learnt".

Every fact belongs to one of five categories: Family, Background, Preferences, Communication style,
and Other. Both sections group what they show under those headings.

## Suggest updates

In the desktop version, **Suggest updates** asks the AI model to read the messages it has not
read yet and suggest new facts. It reads up to `messagesPerRun` messages each time, oldest
first, so every message is read once. When more are waiting, the dialog says so; choose
**Suggest updates** again to read the next ones. The line under the button shows the date of
the last message read.

Each suggestion has two buttons:

1. **Accept** adds it to "What the system has learnt".
2. **Reject** moves it to "Suggestions you turned down". It is not suggested again unless you add
   it back.

Nothing is added until you accept it. Suggestions you have not answered stay in the dialog until
you do, even after it is closed. Anything About Me already holds, and anything you have
already rejected or deleted, is left out of the suggestions.

The button is not shown when `config.json` has no `aboutMe` section.

## Where it is kept

About Me is saved on this computer with your messages and settings. "Clear all saved data"
removes it along with everything else.

## Configuring

The `aboutMe` section of `public/config.json` holds the model and the prompts used by
**Suggest updates**. See [Config.md](devDoc/Config.md).
