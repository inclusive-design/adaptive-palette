/*
 * Build the desktop bundle for whichever platform this is running on.
 *
 * The result is one zip in `dist-desktop`, holding a Node runtime, the launcher, and the
 * built app. There is no installer: the whole point is that deleting the folder is a
 * complete uninstall, so nothing may be written outside it.
 *
 * This copies the running Node binary in as-is and runs the launcher from a two-line
 * script, rather than injecting a single-executable-application blob into the binary
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
 * Copying the binary and running the launcher as plain files has no dependency on either
 * issue and is what was actually verified end to end (see docs/Deployment.md).
 *
 * Run `npm run package:desktop`, which builds `dist/` first.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist-desktop");

const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: "inherit", cwd: root, ...options });

/**
 * Fail loudly if the copied Node binary links against anything outside macOS itself.
 *
 * A package-manager Node (Homebrew, MacPorts, ...) is typically linked against its own
 * dylib tree at fixed paths (e.g. `/usr/local/opt/...`) rather than built statically. A
 * copy of it keeps those same link paths, so it runs here -- where that tree still
 * exists -- and fails silently on any other machine. The launcher writes no logs, and the
 * person double-clicking it is not a developer with a terminal, so that failure would be
 * undiagnosable. An official nodejs.org build (what `actions/setup-node` installs in CI)
 * has no such dependency.
 * @param {string} binaryPath - The copied Node binary to check.
 * @returns {void}
 */
function checkPortable (binaryPath) {
  const output = execFileSync("otool", ["-L", binaryPath], { encoding: "utf8" });
  // The first line is the binary's own path, not a linked library.
  const offender = output.split("\n").slice(1)
    .map((line) => line.trim().split(" ")[0])
    .find((lib) => lib && !lib.startsWith("/usr/lib/") && !lib.startsWith("/System/"));
  if (offender) {
    throw new Error(
      `The Node binary being packaged links against ${offender}, outside macOS itself. ` +
      "That means it is a package-manager build (Homebrew, MacPorts, ...), not an " +
      "official one, and a copy of it will not run on any machine but this one. Package " +
      "with an official nodejs.org build instead -- the kind actions/setup-node installs."
    );
  }
}

/**
 * Copy the launcher and a copy of the running Node binary into `target`, so an entry
 * script placed alongside them can run one against the other.
 * @param {string} target - Directory to copy into.
 * @param {string} nodeName - Filename to give the copied Node binary.
 * @returns {void}
 */
function copyRuntime (target, nodeName) {
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(path.join(root, "launcher"), path.join(target, "launcher"), {
    recursive: true,
    // The test file has no place in a shipped bundle.
    filter: (src) => !src.endsWith(".test.js")
  });
  const nodeCopy = path.join(target, nodeName);
  fs.copyFileSync(process.execPath, nodeCopy);
  fs.chmodSync(nodeCopy, 0o755);
  if (process.platform === "darwin") {
    checkPortable(nodeCopy);
  }
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
  fs.writeFileSync(launcherScript, "#!/bin/sh\ncd \"$(dirname \"$0\")\" && exec ./node launcher/main.cjs\n");
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

fs.mkdirSync(outDir, { recursive: true });
const zip = process.platform === "darwin"
  ? packageMac()
  : process.platform === "win32"
    ? packageWindows()
    : (() => { throw new Error(`No desktop bundle is built for ${process.platform}.`); })();
console.log(`Packaged ${path.relative(root, zip)}`);
