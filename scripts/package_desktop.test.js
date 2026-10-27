/*
 * Tests `findNonSystemLib`: deciding whether a line of `otool` output names a library that
 * will not exist on someone else's Mac. Also `isShipped`, which leaves personal palette sets out,
 * and `includedSets` and `bundleConfig`, which make a bundle for one user's sets.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, expect, test } from "vitest";
import { bundleConfig, findNonSystemLib, includedSets, isShipped } from "./package_desktop.js";

// Real `otool -L` shape: the first line is the binary's own path, every later line is a
// library followed by its version information. The trailing newline is deliberate -- it
// makes `split("\n")` produce a trailing empty string, which is what exercises the `lib &&`
// guard in `findNonSystemLib`. Keep it when editing these fixtures.
const systemOnly = `/tmp/bundle/node:
	/usr/lib/libc++.1.dylib (compatibility version 1.0.0, current version 1800.101.0)
	/System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation (compatibility version 150.0.0, current version 1775.118.101)
	/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1351.0.0)
`;

test("linkage against macOS itself has no offender", () => {
  expect(findNonSystemLib(systemOnly)).toBe(null);
});

test("a package-manager dylib is an offender", () => {
  const homebrew = `/tmp/bundle/node:
	/usr/local/opt/icu4c/lib/libicui18n.77.dylib (compatibility version 77.0.0, current version 77.1.0)
	/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1351.0.0)
`;
  expect(findNonSystemLib(homebrew)).toBe("/usr/local/opt/icu4c/lib/libicui18n.77.dylib");
});

test("an @rpath dependency is an offender", () => {
  const shared = `/tmp/bundle/node:
	@rpath/libnode.147.dylib (compatibility version 0.0.0, current version 0.0.0)
	/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1351.0.0)
`;
  expect(findNonSystemLib(shared)).toBe("@rpath/libnode.147.dylib");
});

test("the binary's own path on the first line is never the offender", () => {
  const ownPathOutside = `/usr/local/bin/node:
	/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1351.0.0)
`;
  expect(findNonSystemLib(ownPathOutside)).toBe(null);
});

test("a palette set not named to ship is left out, and everything else is copied", () => {
  const built = path.join("/repo", "dist");
  const shipped = new Set(["standardBlissChart"]);
  const sets = path.join(built, "palette-sets");
  expect(isShipped(path.join(sets, "standardBlissChart"), built, shipped)).toBe(true);
  expect(isShipped(path.join(sets, "petterBlissChart"), built, shipped)).toBe(false);
  expect(isShipped(sets, built, shipped)).toBe(true);
  expect(isShipped(path.join(built, "index.html"), built, shipped)).toBe(true);
});

// A built `palette-sets` folder for the tests below to add sets to.
const setsDir = fs.mkdtempSync(path.join(os.tmpdir(), "palette-sets-"));
afterAll(() => fs.rmSync(setsDir, { recursive: true, force: true }));

/**
 * Add a set to `setsDir` whose start palette is in `language`, or names none.
 * @param {string} name - The set's folder name.
 * @param {string} [language] - The start palette's `language`.
 * @returns {string} - The set's folder.
 */
function writeSet (name, language) {
  const dir = path.join(setsDir, name);
  fs.mkdirSync(path.join(dir, "palettes"), { recursive: true });
  fs.writeFileSync(path.join(dir, "palette_set.json"), JSON.stringify({
    formatVersion: 1, startPalette: "Start", palettes: { Start: "palettes/start.json" }
  }));
  fs.writeFileSync(path.join(dir, "palettes", "start.json"), JSON.stringify({ name: "Start", language, cells: {} }));
  return dir;
}

test("an unset or empty INCLUDE_SETS names no sets", () => {
  expect(includedSets(undefined, setsDir)).toEqual([]);
  expect(includedSets(" , ", setsDir)).toEqual([]);
});

test("INCLUDE_SETS names are trimmed and kept in order", () => {
  writeSet("second");
  writeSet("first");
  expect(includedSets(" second, first ", setsDir)).toEqual(["second", "first"]);
});

test("a set missing from the build stops packaging, naming it", () => {
  expect(() => includedSets("missingSet", setsDir)).toThrow("\"missingSet\" is not in dist/palette-sets");
});

test("a name that is not a folder name stops packaging, naming it", () => {
  expect(() => includedSets("../x", setsDir)).toThrow("\"../x\" is not a palette set name");
});

test("the bundle opens on the set, in its start palette's language, and keeps the rest", () => {
  const config = bundleConfig({ language: "en", maxRecalledRecords: 9 }, writeSet("swedish", "sv"));
  expect(config).toEqual({ language: "sv", maxRecalledRecords: 9, paletteSet: "swedish" });
});

test("a start palette with no language or an unsupported one gives English", () => {
  expect(bundleConfig({ language: "sv" }, writeSet("unmarked")).language).toBe("en");
  expect(bundleConfig({ language: "sv" }, writeSet("german", "de")).language).toBe("en");
});
