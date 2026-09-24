# Storage

Where the app's data lives.

## The interface

[`src/client/core/StorageBackend.ts`](../../src/client/core/StorageBackend.ts) defines
`AdaptivePaletteStorage`, the interface every backend storage implements. Which one a page
gets is decided in one place: `installStorage()` in `InitGlobals.ts`.

```ts
export type StoredMessage = MessageRecordType & { id: number };

export interface AdaptivePaletteStorage {
  open (): Promise<void>;
  readSettings (): Promise<Record<string, unknown>>;
  writeSettings (overrides: Record<string, unknown>): Promise<void>;
  readAboutMe (): Promise<AboutMeType>;
  writeAboutMe (aboutMe: AboutMeType): Promise<void>;
  readMessages (limit: number): Promise<StoredMessage[]>;
  readMessagesAfter (afterId: number | undefined, limit: number): Promise<StoredMessage[]>;
  addMessage (record: MessageRecordType): Promise<StoredMessage>;
  updateMessage (id: number, record: MessageRecordType): Promise<void>;
  clearAll (): Promise<void>;
  destroy (): Promise<void>;
}
```

The interface names the app's own operations rather than generic get/set, so each backend can
use what its store is good at: a cursor in IndexedDB, a real table in SQL. `readMessages(limit)`
returns the newest `limit` records, oldest first. `readMessagesAfter(afterId, limit)`
returns up to `limit` records with an id greater than `afterId`, oldest first; "Suggest
updates" uses it to read each message once.

`destroy()` removes the store itself rather than emptying it. `clearAll()` is what "Clear all saved
data" uses: the app keeps running, and its database stays in place. `destroy()` is what "Erase all
app data and quit" uses, where the point is that nothing of the app's is left in the browser
afterwards. A destroyed store can be opened again, empty.

[`src/client/core/IndexedDbStorage.ts`](../../src/client/core/IndexedDbStorage.ts) is the
implementation for a page served from this computer: one database, version 1, with three object
stores created in `onupgradeneeded`:

- `messages` — key path `id`, `autoIncrement: true`. Insertion order is id order, so the newest
  messages are the tail and `readMessages()` is a cursor opened in reverse rather than a sort.
- `settings` — a single record holding the overrides object.
- `aboutMe` — a single record holding the About Me facts: `facts`; `dismissed`, the
  `{ category, text }` pairs the user turned down; `pending`, suggestions not answered yet; and
  `learntUpTo`, the id and timestamp of the last message "Suggest updates" read. See
  [AboutMe.md](../AboutMe.md).

## Which backend a page gets

A page served from `localhost`, `127.0.0.1` or `[::1]` — the desktop bundle, the Vite dev server, the
test runner — installs `IndexedDbStorage`, and the user's messages, settings and About Me facts survive a
reload.

Anywhere else is the hosted site, which may be running on a public or shared computer. There the app
installs [`core/MemoryStorage.ts`](../../src/client/core/MemoryStorage.ts) and puts nothing in the
browser at all: messages, settings and About Me facts live for as long as the tab does, and a reload
clears them. The status line says so.

Settings go into memory along with the messages. They carry nothing personal, but keeping them would
mean a backend that is half one thing and half the other, and a database created on a public computer
anyway.

`installStorage(isLocal)` in [`core/InitGlobals.ts`](../../src/client/core/InitGlobals.ts) makes the
choice, from `isLocalHost()` — the same guard that decides whether the app may contact Ollama. It takes
the answer as an argument rather than reading the hostname, because under the test runner the hostname
is always `localhost` and the hosted branch could not otherwise be tested.

On a hosted page it also calls `removeLegacyDatabase()`, which deletes the app's IndexedDB database.
The hosted site used to save messages there, so visitors from before this change still have them in
their browser — on the very machines where that is the problem. The delete is not awaited, and runs on
every hosted load: deleting a database that is not there succeeds, so it needs no flag, and a load
blocked by another tab is retried by the next one.

## Installing a backend

`setStorage()` installs the backend the app uses; `getStorage()` returns it, throwing when none
is installed. Both live in `StorageBackend.ts`.

`initAdaptivePaletteGlobals()` in [`core/InitGlobals.ts`](../../src/client/core/InitGlobals.ts)
is the only place that installs one outside a test: `installStorage(isLocalHost())` runs
before the store is opened, so that even a browser that refuses a database leaves every later
call with somewhere to fail, rather than nowhere to call. Nothing installs a backend at module
scope, so a test is free to install its own.

`getStorage()` throws when nothing is installed. Every caller reaches it from inside an `async`
function or a `try`, so the throw becomes a rejected promise that is logged rather than an error
thrown into the UI.

## Why the message log is cached

`readMessageLog()` is called synchronously during render, by
[`features/word-prediction/PredictedWords.ts`](../../src/client/features/word-prediction/PredictedWords.ts)
and
[`features/telegraphic-translation/BlissSentence.ts`](../../src/client/features/telegraphic-translation/BlissSentence.ts).
IndexedDB has no synchronous read, so [`MessageLog.ts`](../../src/client/core/MessageLog.ts)
keeps a module-level cache and reads off that instead:

- `hydrateMessageLog()` fills the cache from storage before the first render.
- `saveMessageRecord()` and `saveTranslation()` update the cache immediately, then persist
  behind it with a fire-and-forget write (`persistNew(record)` /
  `void persistChange(record)`). A read straight after a save always sees the change, whether
  or not the write has resolved yet.
- A record's `id` only arrives when its `addMessage` resolves, so `persistNew()` keeps that
  write in a `WeakMap` keyed by the record and `persistChange()` waits on it. A translation
  saved in that gap is written against the id rather than dropped.

## What is kept versus what is read

Nothing is ever deleted from storage. Every message is kept — the archive is wanted as a
research and training corpus, and exporting it is future work, not implemented yet.
`maxRecalledRecords` caps only how many of the newest messages `hydrateMessageLog()` reads back
into the in-memory log. The log is trimmed once it grows past that cap; the store never is.

This is why the setting is named `maxRecalledRecords` rather than something implying a storage
cap: it never controlled what was kept, only what is read back. `0` still turns the history off
entirely — nothing is read at start-up and nothing is written.

One consequence worth naming: `findLatestTranslation()` searches the in-memory log, not the
store, so it only finds translations for messages within the recall window. A translation for a
message older than that is still in storage, but nothing surfaces it.

## What happens when storage fails

The in-memory cache is what the UI reads, so a browser that refuses IndexedDB — Firefox private
browsing, a locked-down WebKit — leaves the app fully usable for the session with nothing
persisted. No fallback backend is needed.

| Failure | Result |
| --- | --- |
| `open()` rejects | Logged. Later calls reject and are logged. The session works; nothing persists. Includes a blocked upgrade, which rejects rather than leaving start-up waiting. |
| Hydration rejects | Empty log, app starts normally — the same as a first run. |
| `addMessage` rejects | Logged. The record stays in the cache for the session and gets no `id`; a later `saveTranslation` on it skips the write and logs, rather than failing silently. |
| `updateMessage` rejects | Logged. The cache keeps the translation for the session. |
| `readSettings` rejects | `{}`, so the values from `config.json` stand — today's `readOverrides` behaviour. |
| `readAboutMe` rejects | Logged. About Me starts empty and the app runs without it. |
| `writeAboutMe` rejects | Logged. The change still applies for the session; it is not saved. |
| `writeSettings` rejects | `saveSettings()` resolves `false`; the dialog shows its existing failure message. |
| `clearAll` rejects | `clearSavedData()` resolves `false`; the existing failure dialog shows and the page is not reloaded. |

`clearSavedData()` in
[`cells/CommandClearSavedData.ts`](../../src/client/cells/CommandClearSavedData.ts) calls
`clearAll()` and then empties the cache by calling `hydrateMessageLog()` again. `clearAll()`
empties every object store in one transaction, so a failure on any of them leaves all three as
they were rather than half the data gone.

## Testing

`MemoryStorage` ([`core/MemoryStorage.ts`](../../src/client/core/MemoryStorage.ts)) is what almost
every test stores into: it is quick, leaves nothing behind for the next test to find, and avoids
the `deleteDatabase` slowness that makes Firefox and WebKit tests flaky. It is the hosted site's
backend as well, so the tests run against the code the app runs, not a double that resembles it.

`core/IndexedDbStorage.test.ts` and `core/InitGlobals.test.ts` are the two that touch a real
database. Each test uses a database name of its own, so nothing ever waits on `deleteDatabase`
unblocking behind a connection another test left open.

`close()` is awaited in those tests rather than called and forgotten. An IndexedDB request's
`onsuccess` fires before its transaction commits, and in WebKit the connection is still counted
as open in that gap — so a delete straight after a close reported itself blocked by a tab that
was not there. `close()` waits out a no-op transaction before releasing, and `destroy()` is now
just that wait followed by `deleteDatabase`.

[`testUtils/StorageContract.ts`](../../src/client/testUtils/StorageContract.ts) exports
`runStorageContractTests()`, the behaviour suite both backends must pass — settings and the
About Me round-tripping, messages read back oldest first, a limit returning the newest records,
`readMessagesAfter` reading past an id, `updateMessage` replacing a record, `clearAll` emptying
every store. It is what makes "the backend is swappable" a tested claim rather than a hope — and
both backends it covers now ship.

Tests that touch the message log use
[`testUtils/MessageLogTestUtils.ts`](../../src/client/testUtils/MessageLogTestUtils.ts) —
`resetMessageLog()`, `seedMessageLog()`, `readStoredMessages()` — the only place a test reaches
into the message log's storage. A test that only needs settings, such as
`SettingsSchema.test.ts`, installs a `MemoryStorage` directly. See [Testing.md](Testing.md).
