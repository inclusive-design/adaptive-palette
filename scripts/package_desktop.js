/*
 * Build the desktop bundle for whichever platform this is running on.
 *
 * The result is one zip in `dist-desktop`, holding a Node runtime, the launcher, and the
 * built app. There is no installer: the whole point is that deleting the folder is a
 * complete uninstall, so nothing may be written outside it.
 *
 * This ships a Node binary as a plain file and runs the launcher from an entry script,
 * rather than injecting a single-executable-application blob into the binary
 * (`node --experimental-sea-config` + `postject`). Two problems rule the SEA route out:
 *
 * 1. A SEA main script may only `require()` Node builtins -- `launcher/main.cjs`
 *    requiring `./serve.cjs`, a plain project file, fails at runtime with
 *    `ERR_UNKNOWN_BUILTIN_MODULE` even when the blob injects cleanly. Making it work
 *    would mean bundling `launcher/` into one file before every package, for a feature
 *    (a single physical file) this project has no other use for.
 * 2. On this project's development machine, the default (Homebrew) Node binary carries
 *    no `NODE_SEA_FUSE` sentinel at all -- postject has nothing to find -- and is
 *    dynamically linked against Homebrew's own library tree, so even a copy of it is not
 *    portable to another machine. An official Node.js build (e.g. what `actions/setup-node`
 *    installs in CI) has neither problem, but problem 1 still stands regardless of which
 *    Node built the bundle.
 *
 * Shipping the binary and the launcher as plain files has no dependency on either
 * issue and is what was actually verified end to end (see docs/devDoc/Deployment.md).
 *
 * The macOS path downloads both official builds for Apple Silicon and Intel core, and
 * merges them with `lipo`. Windows keeps `process.execPath`.
 *
 * Run `npm run package:desktop`, which builds `dist/` first.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist-desktop");

// The macOS architectures the bundle covers: Node's own download name on the left, the name
// `lipo` and `otool` use on the right.
const MAC_ARCHS = { arm64: "arm64", x64: "x86_64" };

// Downloaded Node binaries live here. Already ignored by git, and `npm ci` wiping it costs
// only a re-download: CI has no cache to lose either way.
const NODE_CACHE = path.join(root, "node_modules", ".cache", "adaptive-palette-node");

const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: "inherit", cwd: root, ...options });

/**
 * The first library in `otool -L` output that will not exist on someone else's Mac, or
 * `null` when every one of them is part of macOS.
 * @param {string} output - `otool -L` output for one binary or one slice of one.
 * @returns {string|null}
 */
function findNonSystemLib (output) {
  // The first line is the binary's own path, not a linked library.
  return output.split("\n").slice(1)
    .map((line) => line.trim().split(" ")[0])
    .find((lib) => lib && !lib.startsWith("/usr/lib/") && !lib.startsWith("/System/")) ?? null;
}

/**
 * Fail loudly if either slice of the packaged Node binary links against anything outside
 * macOS itself.
 *
 * An official nodejs.org build links only against `/usr/lib` and `/System`, so it runs on
 * any Mac. One linked against its own dylib tree at fixed paths (`@rpath/...`,
 * `/usr/local/opt/...`) runs only where that tree exists, and fails on a tester's machine
 * after the download, where nobody can fix it.
 *
 * Per slice, not once: `otool -L` on a universal binary reports only the slice native to
 * the machine running it, so a single call would leave the other architecture unchecked.
 * @param {string} binaryPath - The Node binary to check.
 * @returns {void}
 */
function checkPortable (binaryPath) {
  for (const arch of Object.values(MAC_ARCHS)) {
    const output = execFileSync("otool", ["-arch", arch, "-L", binaryPath], { encoding: "utf8" });
    const offender = findNonSystemLib(output);
    if (offender) {
      throw new Error(
        `The ${arch} slice of the Node binary being packaged links against ${offender}, ` +
        "outside macOS itself, so it will not run on a tester's Mac. Either that " +
        "architecture's nodejs.org tarball is no longer self-contained, or the cached copy " +
        "in `node_modules/.cache/adaptive-palette-node` is not one this script downloaded. " +
        "Delete that directory and package again."
      );
    }
  }
}

/**
 * The official nodejs.org binary for one macOS architecture, downloaded on first use and
 * kept in `NODE_CACHE` afterwards.
 * @param {string} version - The Node version, without a leading `v`.
 * @param {string} nodeArch - `arm64` or `x64`, as nodejs.org spells it.
 * @returns {string} - Path to the cached binary.
 */
function officialNode (version, nodeArch) {
  const cached = path.join(NODE_CACHE, version, nodeArch, "node");
  if (fs.existsSync(cached)) {
    return cached;
  }
  const dir = path.dirname(cached);
  fs.mkdirSync(dir, { recursive: true });
  const base = `https://nodejs.org/dist/v${version}`;
  const tarName = `node-v${version}-darwin-${nodeArch}.tar.gz`;
  const tarball = path.join(dir, tarName);
  // `--retry`: a release package run is ~110 MB over two downloads, and a transient network
  // failure should retry rather than fail the build.
  run("curl", ["-fsSL", "--retry", "3", "--retry-connrefused", "-o", tarball, `${base}/${tarName}`]);
  // Catches a truncated or corrupted download. The checksums come from the same origin over
  // the same TLS connection as the tarball itself, so this is not a supply-chain guarantee
  // and must not be described as one.
  const sums = execFileSync(
    "curl", ["-fsSL", "--retry", "3", "--retry-connrefused", `${base}/SHASUMS256.txt`], { encoding: "utf8" }
  );
  const expected = sums.split("\n").find((line) => line.endsWith(`  ${tarName}`))?.split(" ")[0];
  if (!expected) {
    throw new Error(
      `${tarName} is not listed in ${base}/SHASUMS256.txt, so nodejs.org's download layout has changed.`
    );
  }
  const actual = createHash("sha256").update(fs.readFileSync(tarball)).digest("hex");
  if (expected !== actual) {
    throw new Error(
      `${tarName} does not match its published SHA-256. Expected ${expected}, got ${actual}.`
    );
  }
  // Extract to a staging directory and rename into place. `cached` existing is the only
  // thing a later run checks, so it must not appear until it is complete: a run interrupted
  // mid-extraction would otherwise leave a truncated binary that every later run trusts,
  // and `lipo`, `codesign` and `otool` all accept one without complaint.
  const staging = path.join(dir, "unpack");
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging);
  // `--strip-components=2` drops `node-v<version>-darwin-<arch>/bin/`, leaving `node` in `staging`.
  run("tar", ["-xzf", tarball, "-C", staging, "--strip-components=2", `node-v${version}-darwin-${nodeArch}/bin/node`]);
  fs.renameSync(path.join(staging, "node"), cached);
  fs.rmSync(staging, { recursive: true, force: true });
  fs.rmSync(tarball, { force: true });
  return cached;
}

/**
 * Build the bundle's `node`: one universal binary holding both macOS architectures.
 *
 * Not a copy of `process.execPath`. A release built on GitHub's `macos-latest` runner
 * (Apple Silicon) shipped an arm64 Node that no Intel Mac could run, and Rosetta translates
 * x64 to arm64, not the reverse. The version tracks whatever Node is running this script,
 * so the Node running it is the only thing that decides it: `node-version` in
 * `.github/workflows/package.yml` for a release, `.nvmrc` locally.
 * @param {string} nodeTarget - Where to write the merged binary.
 * @returns {void}
 */
function buildUniversalNode (nodeTarget) {
  const version = process.versions.node;
  const slices = Object.keys(MAC_ARCHS).map((nodeArch) => officialNode(version, nodeArch));
  run("lipo", ["-create", ...slices, "-output", nodeTarget]);

  const archs = execFileSync("lipo", ["-archs", nodeTarget], { encoding: "utf8" }).trim().split(/\s+/);
  const missing = Object.values(MAC_ARCHS).filter((arch) => !archs.includes(arch));
  if (missing.length > 0) {
    throw new Error(
      `The packaged Node binary covers ${archs.join(", ")} and is missing ${missing.join(", ")}. ` +
      "A bundle short an architecture does nothing at all when double-clicked on a Mac of that kind."
    );
  }
}

/**
 * Copy the launcher and a Node binary into `target`, so an entry script placed alongside
 * them can run one against the other.
 * @param {string} target - Directory to copy into.
 * @param {string} nodeName - Filename to give the Node binary.
 * @returns {void}
 */
function copyRuntime (target, nodeName) {
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(path.join(root, "launcher"), path.join(target, "launcher"), {
    recursive: true,
    // Test files have no place in a shipped bundle.
    filter: (src) => !/\.test\.[cm]?js$/.test(src)
  });
  const nodeTarget = path.join(target, nodeName);
  if (process.platform === "darwin") {
    buildUniversalNode(nodeTarget);
    checkPortable(nodeTarget);
  } else {
    fs.copyFileSync(process.execPath, nodeTarget);
  }
  fs.chmodSync(nodeTarget, 0o755);
}

/**
 * Copy the built app in beside the binary.
 * @param {string} target - The directory `dist` goes into.
 * @returns {void}
 */
function copyDist (target) {
  const built = path.join(root, "dist");
  if (!fs.existsSync(built)) {
    throw new Error("There is no `dist` to package. Run `npm run build` first.");
  }
  fs.cpSync(built, path.join(target, "dist"), { recursive: true });
}

function packageMac () {
  const app = path.join(outDir, "Adaptive Palette.app");
  fs.rmSync(app, { recursive: true, force: true });
  const contents = path.join(app, "Contents");
  const macOS = path.join(contents, "MacOS");
  copyRuntime(macOS, "node");
  const launcherScript = path.join(macOS, "adaptive-palette");

  // Preflight before `exec`: catches binaries Node cannot start (wrong arch, missing dylib),
  // plus missing/corrupt `serve.cjs` or `main.cjs`, which would otherwise bypass `main.cjs`
  // error handling and make double-click appear to do nothing. `serve.cjs` is safe to require;
  // resolve `main.cjs` because requiring it runs the app.
  // `exec` remains so the shell is replaced exactly as before.
  // Pass errors to `osascript` as argv, not AppleScript source, so quotes/backslashes are safe.
  // Use `head`: Node prints the diagnosis before the stack trace, unlike `tail`.
  fs.writeFileSync(launcherScript, `#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! err=$(./node -e 'require("./launcher/serve.cjs"); require.resolve("./launcher/main.cjs")' 2>&1); then
  osascript -e 'on run argv' \\
    -e 'display dialog "Adaptive Palette could not start." & return & return & (item 1 of argv) buttons {"OK"} with icon caution' \\
    -e 'end run' -- "$(printf '%s' "$err" | head -c 500)" >/dev/null
  exit 1
fi
exec ./node launcher/main.cjs
`);
  fs.chmodSync(launcherScript, 0o755);
  copyDist(path.join(contents, "Resources"));
  // LSUIElement keeps a process with no window out of the Dock, where its icon could
  // only ever be a dead end -- quitting is done from inside the app.
  fs.writeFileSync(path.join(contents, "Info.plist"), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>adaptive-palette</string>
  <key>CFBundleIdentifier</key><string>org.inclusive-design.adaptive-palette</string>
  <key>CFBundleName</key><string>Adaptive Palette</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${version()}</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
`);
  // Ad-hoc, not a real certificate. Testers still see the Gatekeeper warning, which
  // `docs/Deployment.md` walks them through.
  // `--deep`: the bundle carries a second executable, the copied `node` -- without it
  // only the entry script gets signed, and Apple Silicon refuses to run an unsigned
  // executable no matter how it's launched.
  run("codesign", ["--sign", "-", "--force", "--deep", app]);
  const zip = path.join(outDir, "AdaptivePalette-macos.zip");
  fs.rmSync(zip, { force: true });
  // `ditto`, not `zip`: it is what keeps a bundle's structure and its signature intact.
  run("ditto", ["-c", "-k", "--keepParent", app, zip]);
  return zip;
}

function packageWindows () {
  const folder = path.join(outDir, "AdaptivePalette");
  fs.rmSync(folder, { recursive: true, force: true });
  copyRuntime(folder, "node.exe");
  fs.writeFileSync(
    path.join(folder, "AdaptivePalette.bat"),
    "@echo off\r\n\"%~dp0node.exe\" \"%~dp0launcher\\main.cjs\"\r\n"
  );
  copyDist(folder);
  const zip = path.join(outDir, "AdaptivePalette-windows.zip");
  fs.rmSync(zip, { force: true });
  run("powershell", [
    "-NoProfile", "-Command",
    `Compress-Archive -Path '${folder}' -DestinationPath '${zip}'`
  ]);
  return zip;
}

function version () {
  return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
}

// Only when run as `node scripts/package_desktop.js`. A test imports this file for the one
// pure function it exports, and importing it must not build, sign, or zip anything.
if (import.meta.main) {
  fs.mkdirSync(outDir, { recursive: true });
  const zip = process.platform === "darwin"
    ? packageMac()
    : process.platform === "win32"
      ? packageWindows()
      : (() => { throw new Error(`No desktop bundle is built for ${process.platform}.`); })();
  console.log(`Packaged ${path.relative(root, zip)}`);
}

export { findNonSystemLib };
