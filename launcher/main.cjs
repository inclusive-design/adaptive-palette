/*
 * Copyright The Adaptive Palette copyright holders
 * See the AUTHORS.md file at the top-level directory of this distribution and at
 * https://github.com/inclusive-design/adaptive-palette/raw/main/AUTHORS.md.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

/*
 * What runs when the tester double-clicks the app. Everything it uses is in `serve.cjs`.
 */
const {
  PORT, findDist, openBrowser, probeInstance, showError, startPaletteServer
} = require("./serve.cjs");

const url = `http://localhost:${PORT}`;

async function main () {
  const occupant = await probeInstance();

  // A second double-click brings the running app forward rather than starting a rival.
  if (occupant === "ours") {
    openBrowser(url);
    return;
  }

  if (occupant === "taken") {
    showError(
      `Adaptive Palette needs port ${PORT}, and another program is using it. ` +
      "Close that program and try again."
    );
    process.exitCode = 1;
    return;
  }

  const root = findDist(process.execPath, __dirname);
  if (root === null) {
    showError("Adaptive Palette is missing its files. Download it again.");
    process.exitCode = 1;
    return;
  }

  // `startPaletteServer` owns the port and the loopback-only bind, so neither constant is
  // spelled out here where nothing would test it.
  const server = await startPaletteServer(root, () => {
    server.close(() => process.exit(0));
  });

  // Anything the server reports after it is up. A failure to start rejects instead, and is
  // caught below.
  server.on("error", (error) => {
    showError(`Adaptive Palette could not start: ${error.message}`);
    process.exit(1);
  });

  openBrowser(url);
}

// Without this a rejection would be an unhandled one: Node would abort, writing a stack
// trace to a stderr that a double-clicked app has nobody reading. The tester would see a
// launch that simply did nothing.
void main().catch((error) => {
  showError(
    `Adaptive Palette could not start: ${error.message}. ` +
    "Restart your computer and try opening it again."
  );
  process.exitCode = 1;
});
