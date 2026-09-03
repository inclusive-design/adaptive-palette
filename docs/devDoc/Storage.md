# Storage

Where the app's data lives.

## The interface

[`src/client/core/StorageBackend.ts`](../../src/client/core/StorageBackend.ts) defines
`AdaptivePaletteStorage`, the interface every backend storage implements. Changing a
backend storage implementation changes only the line in `InitGlobals.ts` that calls
`setStorage()`.

```ts
export type StoredMessage = MessageRecordType & { id: number };

export interface AdaptivePaletteStorage {
  open (): Promise<void>;
  readSettings (): Promise<Record<string, unknown>>;
  writeSettings (overrides: Record<string, unknown>): Promise<void>;
  readMessages (limit: number): Promise<StoredMessage[]>;
  addMessage (record: MessageRecordType): Promise<StoredMessage>;
  updateMessage (id: number, record: MessageRecordType): Promise<void>;
  clearAll (): Promise<void>;
  destroy (): Promise<void>;
}
```

The interface names the app's own operations rather than generic get/set, so each backend can
use what its store is good at: a cursor in IndexedDB, a real table in SQL. `readMessages(limit)`
returns the newest `limit` records, oldest first.

`destroy()` removes the store itself rather than emptying it. `clearAll()` is what "Clear all saved
data" uses: the app keeps running, and its database stays in place. `destroy()` is what "Erase all
app data and quit" uses, where the point is that nothing of the app's is left in the browser
afterwards. A destroyed store can be opened again, empty.

[`src/client/core/IndexedDbStorage.ts`](../../src/client/core/IndexedDbStorage.ts) is the web
implementation: one database, version 1, with two object stores created in `onupgradeneeded`:

- `messages` — key path `id`, `autoIncrement: true`. Insertion order is id order, so the newest
  messages are the tail and `readMessages()` is a cursor opened in reverse rather than a sort.
- `settings` — a single record holding the overrides object.

## Installing a backend

`setStorage()` installs the backend the app uses; `getStorage()` returns it, throwing when none
is installed. Both live in `StorageBackend.ts`.

`initAdaptivePaletteGlobals()` in [`core/InitGlobals.ts`](../../src/client/core/InitGlobals.ts)
is the only place that installs one outside a test: `setStorage(new IndexedDbStorage())` runs
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
| `writeSettings` rejects | `saveSettings()` resolves `false`; the dialog shows its existing failure message. |
| `clearAll` rejects | `clearSavedData()` resolves `false`; the existing failure dialog shows and the page is not reloaded. |

`clearSavedData()` in
[`cells/CommandClearSavedData.ts`](../../src/client/cells/CommandClearSavedData.ts) calls
`clearAll()` and then empties the cache by calling `hydrateMessageLog()` again. `clearAll()`
empties both object stores in one transaction, so a failure on either leaves both as they
were rather than half the data gone.

## Testing

`FakeStorage` ([`testUtils/FakeStorage.ts`](../../src/client/testUtils/FakeStorage.ts)) is an
in-memory implementation of the interface, used by every test but one: it is quick, leaves
nothing behind for the next test to find, and avoids the `deleteDatabase` slowness that makes
Firefox and WebKit tests flaky.

`core/IndexedDbStorage.test.ts` is the one test that touches a real database. Each test uses a
database name of its own, so nothing ever waits on `deleteDatabase` unblocking behind a
connection another test left open.

[`testUtils/StorageContract.ts`](../../src/client/testUtils/StorageContract.ts) exports
`runStorageContractTests()`, the behaviour suite both backends must pass — settings
round-tripping, messages read back oldest first, a limit returning the newest records,
`updateMessage` replacing a record, `clearAll` emptying both stores. It is what makes "the
backend is swappable" a tested claim rather than a hope.

Tests that touch the message log use
[`testUtils/MessageLogTestUtils.ts`](../../src/client/testUtils/MessageLogTestUtils.ts) —
`resetMessageLog()`, `seedMessageLog()`, `readStoredMessages()` — the only place a test reaches
into the message log's storage. A test that only needs settings, such as
`SettingsSchema.test.ts`, installs a `FakeStorage` directly. See [Testing.md](Testing.md).
