/*
 * Tests `findNonSystemLib`: deciding whether a line of `otool` output names a library that
 * will not exist on someone else's Mac.
 */
import { expect, test } from "vitest";
import { findNonSystemLib } from "./package_desktop.js";

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
