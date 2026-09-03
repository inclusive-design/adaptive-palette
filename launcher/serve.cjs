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
 * The desktop launcher: a static server for the built app, and the few pieces of
 * operating-system glue around it.
 *
 * CommonJS because Node's single-executable-application feature runs the embedded main
 * script under CommonJS only.
 *
 * Nothing here runs on import. `main.cjs` is the entry point.
 *
 * The one rule this file exists to keep: it writes nothing, anywhere. No log, no cache,
 * no port file. That is what makes deleting the app a complete uninstall.
 */
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

// Fixed, with no fallback. The port is the origin IndexedDB scopes the tester's saved
// messages to, so moving to another port would look exactly like losing them.
const PORT = 3210;

// Loopback only. The message log is private speech and does not go on the LAN.
const HOST = "127.0.0.1";

// What `/health` answers with, so a second launch can tell our server from a stranger's.
const HEALTH_APP = "adaptive-palette";

// The only `Origin` and `Host` values `POST /quit` accepts. Built from the constants above
// so the two spellings of loopback cannot drift away from the port.
const QUIT_ORIGINS = [`http://localhost:${PORT}`, `http://${HOST}:${PORT}`];
const QUIT_HOSTS = [`localhost:${PORT}`, `${HOST}:${PORT}`];

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

/**
 * The file a request path names, or `null` when it names nothing we may serve.
 *
 * Containment is checked on the resolved path rather than on the text of the URL: that
 * is the only form in which `..`, percent-encoded `..`, and a Windows backslash all look
 * the same.
 * @param {string} root - The directory being served.
 * @param {string} urlPath - The path part of the request URL.
 * @returns {string|null}
 */
function resolveInRoot (root, urlPath) {
  const rootDir = path.resolve(root);
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    // A malformed escape. Nothing valid looks like this.
    return null;
  }
  // Normalized relative to root (no leading slash), so a leading ".." that tries to
  // climb above root stays visible in the result instead of being silently absorbed the
  // way `path.posix.normalize` would absorb it on an absolute-looking string.
  const asPosix = decoded.replace(/\\/g, "/").replace(/^\/+/, "");
  const normalized = path.posix.normalize(asPosix);
  if (normalized === ".." || normalized.startsWith("../")) {
    return null;
  }
  const candidate = path.resolve(rootDir, normalized);
  if (candidate !== rootDir && !candidate.startsWith(rootDir + path.sep)) {
    return null;
  }
  return candidate;
}

/**
 * Serve one file, or answer 404.
 * @param {string} file - Absolute path of the file to serve.
 * @param {http.ServerResponse} response - The response to write to.
 * @returns {void}
 */
function sendFile (file, response) {
  let stats;
  try {
    stats = fs.statSync(file);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const target = stats.isDirectory() ? path.join(file, "index.html") : file;
  if (stats.isDirectory() && !fs.existsSync(target)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const type = CONTENT_TYPES[path.extname(target).toLowerCase()] || "application/octet-stream";
  response.writeHead(200, { "content-type": type });
  const stream = fs.createReadStream(target);
  // A read that fails after the headers have gone out can only be abandoned.
  stream.on("error", () => response.destroy());
  stream.pipe(response);
}

/**
 * The server for the built app.
 * @param {string} root - The `dist` directory to serve.
 * @param {Function} onQuit - Called after `POST /quit` has been answered.
 * @returns {http.Server}
 */
function createPaletteServer (root, onQuit) {
  const rootDir = path.resolve(root);
  return http.createServer((request, response) => {
    const urlPath = (request.url || "/").split("?")[0];

    if (urlPath === "/health") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ app: HEALTH_APP }));
      return;
    }

    if (urlPath === "/quit") {
      if (request.method !== "POST") {
        response.writeHead(405, { "allow": "POST" });
        response.end();
        return;
      }
      // The method is no defence on its own: a cross-origin POST with no custom headers is
      // a CORS *simple* request, which the browser sends without a preflight, so any page
      // the tester has open in another tab could otherwise shut their device down
      // mid-conversation. These two headers are what decide it.
      //
      // An ABSENT `Origin` is allowed, deliberately. Browsers always send it on a POST, so
      // its absence means a non-browser client, and `curl -X POST http://127.0.0.1:3210/quit`
      // is the documented way to stop the app from a terminal. A local process that can run
      // curl can already do anything to this machine; the threat here is a web page, and a
      // web page cannot suppress `Origin`. Do not "tighten" this into requiring the header:
      // it would break the documented command and buy nothing.
      const origin = request.headers.origin;
      // The `Host` check closes DNS rebinding, where an attacker's hostname resolves to
      // 127.0.0.1 and the browser sends that hostname here as `Host`.
      const host = request.headers.host;
      if ((origin !== undefined && !QUIT_ORIGINS.includes(origin)) || !QUIT_HOSTS.includes(host)) {
        response.writeHead(403);
        response.end();
        return;
      }
      response.writeHead(204);
      // Answered first, so the page sees the result before the server goes away.
      response.end(() => onQuit());
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { "allow": "GET, HEAD" });
      response.end();
      return;
    }

    const file = resolveInRoot(rootDir, urlPath === "/" ? "/index.html" : urlPath);
    if (file === null) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    sendFile(file, response);
  });
}

/**
 * Create the server and put it on the port.
 *
 * The `listen` lives here, beside the constants and inside the tested file, rather than in
 * `main.cjs`: binding `HOST` is the one line that keeps the message log off the LAN, and a
 * line nothing tests is a line a later refactor can drop unnoticed.
 * @param {string} root - The `dist` directory to serve.
 * @param {Function} onQuit - Called after `POST /quit` has been answered.
 * @returns {Promise<http.Server>} - The server, once it is listening.
 */
function startPaletteServer (root, onQuit) {
  const server = createPaletteServer(root, onQuit);
  return new Promise((resolve, reject) => {
    // A port taken between the probe and here arrives as an `error` event, not a throw.
    server.once("error", reject);
    server.listen(PORT, HOST, () => resolve(server));
  });
}

/**
 * Who, if anyone, is on the port.
 * @param {number} [port] - The port to probe. Only a test passes anything but the real one.
 * @returns {Promise<string>} - `"free"`, `"ours"`, or `"taken"`.
 */
async function probeInstance (port = PORT) {
  let response;
  try {
    // Node's `fetch` has no default timeout, and something that accepts the connection and
    // never answers would leave the double-click doing nothing at all: no browser, no
    // dialog, and no log to look at.
    response = await fetch(`http://${HOST}:${port}/health`, { signal: AbortSignal.timeout(2000) });
  } catch (error) {
    // A timeout means something IS on the port, just not answering. Reported as taken, so
    // the tester gets the accurate "another program is using it" dialog rather than a
    // second server failing on EADDRINUSE.
    if (error && error.name === "TimeoutError") {
      return "taken";
    }
    // Nothing accepted the connection.
    return "free";
  }
  try {
    const body = await response.json();
    return body && body.app === HEALTH_APP ? "ours" : "taken";
  } catch {
    // Something is listening, but it is not us.
    return "taken";
  }
}

/**
 * Where the built app is, for each of the shapes it ships in.
 * @param {string} execPath - `process.execPath`.
 * @param {string} moduleDir - `__dirname` of the entry point.
 * @returns {string|null} - The `dist` directory, or `null` when there is none.
 */
function findDist (execPath, moduleDir) {
  const binDir = path.dirname(execPath);
  const candidates = [
    // macOS: Adaptive Palette.app/Contents/MacOS/<binary>
    path.resolve(binDir, "..", "Resources", "dist"),
    // Windows: AdaptivePalette\AdaptivePalette.exe
    path.resolve(binDir, "dist"),
    // A checkout, run as `node launcher/main.cjs`.
    path.resolve(moduleDir, "..", "dist")
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

/**
 * Open a URL in whatever browser the tester has set as their default -- the one their
 * screen reader, switch access or eye-gaze setup is already working in.
 * @param {string} url - The URL to open.
 * @returns {void}
 */
function openBrowser (url) {
  const [command, args] = process.platform === "darwin"
    ? ["open", [url]]
    : process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : ["xdg-open", [url]];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => showError(`Open ${url} in your browser.`));
  child.unref();
}

/**
 * Tell the tester something went wrong.
 *
 * A double-clicked application has no terminal, so stderr alone would be silence. Both
 * dialogs are fire-and-forget: if the dialog itself fails there is nowhere left to report
 * it to.
 * @param {string} message - What to say. Kept free of quotes by the callers.
 * @returns {void}
 */
function showError (message) {
  console.error(message);
  // A spawn that cannot find its binary reports it asynchronously, so an `error` listener
  // is what keeps a missing dialog from taking the process down. There is nowhere left to
  // report to, hence the empty handler.
  const dialog = (command, args) => {
    try {
      spawn(command, args, { detached: true, stdio: "ignore" }).on("error", () => {}).unref();
    } catch {
      // stderr above is all that is left.
    }
  };
  if (process.platform === "darwin") {
    dialog("osascript", ["-e", `display dialog ${JSON.stringify(message)} buttons {"OK"}`]);
  } else if (process.platform === "win32") {
    dialog("powershell", [
      "-NoProfile", "-Command",
      `Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show(${JSON.stringify(message)})`
    ]);
  }
}

module.exports = {
  HEALTH_APP,
  HOST,
  PORT,
  createPaletteServer,
  findDist,
  openBrowser,
  probeInstance,
  resolveInRoot,
  showError,
  startPaletteServer
};
