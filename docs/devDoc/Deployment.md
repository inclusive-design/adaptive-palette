# Packaging the Desktop Build

How the desktop bundle is built, how to test one before releasing it, and the checklist a
human runs before a release ships. For the tester-facing install guide, see
[Install on Your Computer](../Deployment.md).

## How it is built

`npm run package:desktop` builds the bundle for whichever system it runs
on: `npm run build` produces `dist/`, then `scripts/package_desktop.js` builds a Node
runtime and copies it with `launcher/` into a bundle, puts `dist/` beside them, and zips the
result into `dist-desktop/`. On macOS that runtime is a universal binary downloaded from
nodejs.org and merged with `lipo`; on Windows it is a copy of the running `node.exe`.

Node's single-executable-application feature was tried first, but its embedded main script
may only `require()` Node builtins, so `launcher/main.cjs` could not `require("./serve.cjs")`.
Shipping a plain Node binary and running the launcher as plain CommonJS files avoids that
limitation, at the cost of a full Node runtime instead of one file — two of them, merged, on
macOS.

- **macOS** — `Adaptive Palette.app/Contents/MacOS/` holds a universal `node` binary merged
  with `lipo`, `launcher/`, and `adaptive-palette`, the bundle's `CFBundleExecutable`. That
  script preflights by requiring `launcher/serve.cjs` and resolving `launcher/main.cjs`, so a
  `node` the kernel refuses to run — which would otherwise do nothing at all — shows an
  `osascript` dialog instead; on success it `exec`s the launcher, so no shell process outlives
  it. `dist/` sits in `Contents/Resources/`. The app is ad-hoc signed
  (`codesign --sign - --force --deep`) — not a paid certificate, which is why testers see
  the Gatekeeper warning above — and zipped with `ditto` to keep the signature intact.
- **Windows** — `AdaptivePalette\` holds `node.exe`, `launcher\`, `dist\`, and
  `AdaptivePalette.bat`, the entry point.

The zips are `dist-desktop/AdaptivePalette-macos.zip` and
`dist-desktop/AdaptivePalette-windows.zip`.

On macOS, the local Node is never copied into the bundle: `scripts/package_desktop.js`
downloads both official nodejs.org builds for `process.versions.node`, caches them under
`node_modules/.cache/adaptive-palette-node/`, and merges them with `lipo`. So the Node you
package with only decides the **version**, not the binary — the first macOS package
downloads roughly 110 MB, and later packages for the same version reuse the cache. The cache
sits under `node_modules/`, so `npm ci` wipes it and the next package downloads again.

The macOS version floor comes with those binaries rather than from anything here: the
Node 26.0.0 builds CI packages with declare `minos 13.5`, which is what [Install on Your
Computer](../Deployment.md) states. Raising `node-version` can raise that floor without
anything failing, so check `otool -l` for `minos` after a version bump and update the
install guide to match.

The old warning about a package-manager Node still applies to **Windows**, which does copy
`process.execPath`: `packageWindows()` bundles whatever `node.exe` is running the script, so
package with an official build from [nodejs.org](https://nodejs.org/) — the kind
`actions/setup-node` installs in CI — not one from a package manager. A package manager's
Node can be linked against library paths specific to the machine that installed it, and
would not run on a tester's computer.

### Testing a build without releasing

Package locally, then exercise the bundle the way a tester would:

```bash
npm run package:desktop
open "dist-desktop/Adaptive Palette.app"
curl -s http://127.0.0.1:3210/health          # {"app":"adaptive-palette"}
curl -X POST http://127.0.0.1:3210/quit       # 204, and the process exits
```

To see what a tester sees, unzip somewhere outside the checkout and mark it as downloaded,
which is what triggers Gatekeeper:

```bash
cd /tmp && unzip -q ~/Development/adaptive-palette/dist-desktop/AdaptivePalette-macos.zip
xattr -w com.apple.quarantine "0081;00000000;Safari;" "/tmp/Adaptive Palette.app"
```

Double-clicking it now gives the "unidentified developer" warning the tester sees. A second
macOS user account, with no checkout and no Node installed, is the closest local stand-in
for a clean machine; Windows needs a real machine or a VM.

`.github/workflows/package.yml` runs the same packaging on `macos-latest` and
`windows-latest` when a release is published, and attaches both zips to it. Release assets
live outside the git object store, so no binary enters the repository's history.

The launcher serves `dist/` on `127.0.0.1:3210` and opens the default browser. The port is
fixed and has no fallback: it is the origin that IndexedDB scopes the saved messages to, so
moving to another port would look exactly like losing them. If something else holds the
port, the launcher says so and exits rather than starting somewhere else.

To stop a running app from a terminal: `curl -X POST http://127.0.0.1:3210/quit`. That endpoint
refuses any request carrying a foreign `Origin` or `Host`, so a web page the tester happens to
have open cannot use it; a request with no `Origin` at all, which is what curl sends, is allowed.

## Release checklist

Before a release ships, one person runs this once on a machine that has never run this
build — a clean install, not a developer's own machine with a checkout already on it.

1. Download the zip for that platform, unzip it, and open the app past the Gatekeeper
   (macOS) or SmartScreen (Windows) warning.
2. Confirm the browser opens the palette.
3. With Ollama quit, choose **Continue without AI features** in the setup box. Confirm the
   palette is usable: compose a message with the symbols and save it. Nothing may block.
4. Start Ollama and reload the page. Confirm the setup box offers the configured model;
   download it, and confirm the page reloads with the AI features on.
5. Compose and save a message. Stop the app — on Windows, close its console window; on
   macOS, restart the computer, which is the only way — then open the app again; confirm
   the message is still there.
6. Settings → **Erase all app data and quit**. Confirm the saved messages are gone.
7. Delete the app.
8. Confirm nothing the app created remains outside the deleted folder.

On macOS, before step 1: `lipo -archs "Adaptive Palette.app/Contents/MacOS/node"` on the
downloaded bundle must report both `x86_64` and `arm64`. A bundle short an architecture does
nothing at all when double-clicked on a Mac of that kind.

Steps 2, 3, 5 and 8 are the project's four release success criteria, in that order: a
non-technical tester reaches a working palette with no terminal; a tester with no Ollama
still reaches a usable palette, with the AI features off; saved messages survive quitting and
relaunching; and after the documented uninstall, nothing the app created remains outside the
deleted folder.

Record what happened at each step.
