# Testing

How the test suite is set up and how to run it.

## Real browsers, three times each

Tests run in real browsers through Vitest browser mode, which drives Playwright. The
[`vitest.config.ts`](../../vitest.config.ts) project lists three instances — Chromium, Firefox and
WebKit — so every test file runs three times, once per browser. A test that passes in one browser
and fails in another is a real difference, not flakiness.

Browsers must be installed before the first run:

```bash
npx playwright install
```

Browsers run headless, but audio may still play.

## Running

```bash
npm test                                          # everything
npm test -- src/client/cells/ActionCodeCell.test.ts   # one file
npm test -- --watch                               # watch mode, off by default
```

Anything after `--` goes to Vitest. See its
[CLI reference](https://vitest.dev/guide/cli.html) for the rest.

## Where tests live

A test sits beside its source as `<Module>.test.ts`, and Vitest picks up
`src/client/**/*.test.ts`. A feature slice keeps its tests inside the slice folder.

`src/client/__screenshots__/` holds screenshots Vitest writes when a browser test fails. It is
gitignored and safe to delete; nothing asserts against those images.

## Writing tests

Components are rendered with `@testing-library/preact`, and interactions driven with
`@testing-library/user-event`.

Tests use the real globals rather than a mocked singleton: a suite that touches
`adaptivePaletteGlobals` calls `await initAdaptivePaletteGlobals()` in `beforeAll`, then sets
whatever configuration or palette it needs. What does get mocked with `vi.mock` is the layer that
would reach outside the browser, `core/OllamaApi.ts` above all. See [State.md](State.md) for what
start-up puts in place.

### Naming

A `describe` names the unit under test and nothing else. For example, `ActionCodeCell`, `normalizeComposition()`.

Nested `describe` blocks group behaviors, as `core/MessageLog.test.ts` does with `recording messages` and
`recording translations`.

A test name states one observable behavior, subject first:

```ts
test("renders at its grid position", ...)
test("stays unavailable when the symbol has no modifier", ...)
```

No `should`, no `Test`/`Check` prefix, and no repeating the component name the `describe` already
carries. Capitalize only when the subject is a proper name or a UI label — `Close asks the dialog to
dismiss` and `Home is unavailable when the stack is empty` are correct as written.

### Shared Utilities

`src/client/testUtils/` holds shared utility functions for tests.

### The message log's storage

A test that reads or writes the message log calls `resetMessageLog()` from
`testUtils/MessageLogTestUtils.ts` in `beforeEach`, after setting `adaptivePaletteGlobals.config`:
how much is read back into the log comes from `maxRecalledRecords`. `seedMessageLog()` and
`readStoredMessages()` are there for seeding the store directly and reading back what is actually
in it, as opposed to what the app has cached. These three are the only place a test reaches into
the message log's storage.

`core/IndexedDbStorage.test.ts` is the one test file that touches a real database, opening one
with a name of its own per test so nothing waits on `deleteDatabase` unblocking behind a
connection another test left open. See [Storage.md](Storage.md).
