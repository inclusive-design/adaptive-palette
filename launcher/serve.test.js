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

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  HEALTH_APP, HOST, PORT, createPaletteServer, findDist, probeInstance, resolveInRoot,
  startPaletteServer
} from "./serve.cjs";

// A throwaway `dist` with one page in it, plus a secret alongside it that no request
// must be able to reach.
function makeRoot () {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "palette-launcher-"));
  fs.mkdirSync(path.join(base, "dist"));
  fs.writeFileSync(path.join(base, "dist", "index.html"), "<h1>palette</h1>");
  fs.writeFileSync(path.join(base, "secret.txt"), "do not serve me");
  return base;
}

/**
 * A `POST /quit` with exactly the headers under test.
 *
 * Raw `http.request` rather than `fetch`: `Origin` and `Host` are the whole of what is
 * being tested, and a higher-level client may decide to set or refuse them itself.
 * @param {object} headers - Headers to send. `Host` defaults to the real one.
 * @returns {Promise<number>} - The status code.
 */
function postQuit (headers = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { host: HOST, port: PORT, path: "/quit", method: "POST", headers },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode));
      }
    );
    request.on("error", reject);
    request.end();
  });
}

// Start a server on an arbitrary free port and hand back its base URL.
function listen (server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

describe("launcher", () => {

  let base;
  let root;
  let servers;

  beforeEach(() => {
    base = makeRoot();
    root = path.join(base, "dist");
    servers = [];
  });

  afterEach(async () => {
    for (const server of servers) {
      await new Promise((resolve) => server.close(resolve));
    }
    fs.rmSync(base, { recursive: true, force: true });
  });

  const start = async (onQuit = () => {}) => {
    const server = createPaletteServer(root, onQuit);
    servers.push(server);
    return await listen(server);
  };

  // `/quit` insists on the fixed port's own `Host`, so its tests start where the real app
  // starts. The launcher project runs its files one at a time for exactly this reason.
  const startForReal = async (onQuit = () => {}) => {
    const server = await startPaletteServer(root, onQuit);
    servers.push(server);
    return server;
  };

  describe("resolveInRoot", () => {
    test("maps a plain path inside the root", () => {
      expect(resolveInRoot(root, "/index.html")).toBe(path.join(root, "index.html"));
    });

    test("refuses to escape the root, however the dots are spelled", () => {
      expect(resolveInRoot(root, "/../secret.txt")).toBeNull();
      expect(resolveInRoot(root, "/..%2Fsecret.txt")).toBeNull();
      expect(resolveInRoot(root, "/%2e%2e%2fsecret.txt")).toBeNull();
      expect(resolveInRoot(root, "/..\\secret.txt")).toBeNull();
    });

    // On Windows a drive letter resolves outside the root and is refused outright; on
    // POSIX "C:" is an ordinary directory name, so it stays inside the root and 404s
    // there. What matters on either is that it never names a file outside the root.
    test("refuses to leave the root by way of a Windows drive letter", () => {
      const resolved = resolveInRoot(root, "/C:/Windows/win.ini");
      expect(resolved === null || resolved.startsWith(root + path.sep)).toBe(true);
    });

    test("refuses a path that cannot be decoded", () => {
      expect(resolveInRoot(root, "/%")).toBeNull();
    });
  });

  describe("the server", () => {
    test("/health names the app", async () => {
      const url = await start();
      const response = await fetch(`${url}/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ app: HEALTH_APP });
    });

    test("/ serves index.html", async () => {
      const url = await start();
      const response = await fetch(url);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(await response.text()).toContain("palette");
    });

    test("an unknown path is a 404", async () => {
      const url = await start();
      expect((await fetch(`${url}/nowhere.html`)).status).toBe(404);
    });

    test("a traversal never reaches a file outside the root", async () => {
      const url = await start();
      const response = await fetch(`${url}/..%2Fsecret.txt`);
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain("do not serve me");
    });

    test("GET /quit is not a way to quit", async () => {
      const onQuit = vi.fn();
      const url = await start(onQuit);
      expect((await fetch(`${url}/quit`)).status).toBe(405);
      expect(onQuit).not.toHaveBeenCalled();
    });
  });

  // A cross-origin POST needs no preflight, so without these checks any page the tester
  // has open could shut the app down mid-conversation. Each case asserts on `onQuit`
  // itself, not merely on the status: the status is not what stops the machine.
  describe("POST /quit", () => {
    test("quits for the page the launcher itself serves", async () => {
      const onQuit = vi.fn();
      await startForReal(onQuit);
      expect(await postQuit({ origin: `http://localhost:${PORT}` })).toBe(204);
      await vi.waitFor(() => expect(onQuit).toHaveBeenCalledTimes(1));
    });

    test("quits for the same page reached by its address", async () => {
      const onQuit = vi.fn();
      await startForReal(onQuit);
      expect(await postQuit({ origin: `http://${HOST}:${PORT}` })).toBe(204);
      await vi.waitFor(() => expect(onQuit).toHaveBeenCalledTimes(1));
    });

    test("refuses another site's page, and does not quit", async () => {
      const onQuit = vi.fn();
      await startForReal(onQuit);
      expect(await postQuit({ origin: "http://evil.example" })).toBe(403);
      expect(onQuit).not.toHaveBeenCalled();
    });

    // Deliberate: browsers always send `Origin` on a POST, so no header means no browser --
    // the documented `curl -X POST` way of stopping the app from a terminal.
    test("quits for a client that sends no Origin at all", async () => {
      const onQuit = vi.fn();
      await startForReal(onQuit);
      expect(await postQuit()).toBe(204);
      await vi.waitFor(() => expect(onQuit).toHaveBeenCalledTimes(1));
    });

    // DNS rebinding: an attacker's hostname resolving to 127.0.0.1 arrives with its own
    // name in `Host`.
    test("refuses a request addressed to some other hostname, and does not quit", async () => {
      const onQuit = vi.fn();
      await startForReal(onQuit);
      expect(await postQuit({ host: `attacker.test:${PORT}` })).toBe(403);
      expect(onQuit).not.toHaveBeenCalled();
    });
  });

  describe("startPaletteServer", () => {
    // The one line keeping a disabled person's saved speech off the LAN. Nothing else in
    // this file tests it: every other case passes its own host in from the harness.
    test("listens on loopback only, on the fixed port", async () => {
      const server = await startForReal();
      expect(server.address().address).toBe(HOST);
      expect(server.address().port).toBe(PORT);
    });
  });

  describe("probeInstance", () => {
    // These bind the real fixed port, so they run one at a time and always close.
    test("reports the port free when nothing is listening", async () => {
      expect(await probeInstance()).toBe("free");
    });

    test("recognises our own server", async () => {
      const server = createPaletteServer(root, () => {});
      servers.push(server);
      await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
      expect(await probeInstance()).toBe("ours");
    });

    // A wedged instance, a proxy, a captive filter: something is there, so the tester gets
    // the "another program is using the port" dialog rather than a launch that hangs
    // forever showing nothing.
    test("reports the port taken when something accepts and never answers", async () => {
      // Accepts the connection, reads the request, and never answers it.
      const wedged = http.createServer(() => {});
      servers.push(wedged);
      await new Promise((resolve) => wedged.listen(0, "127.0.0.1", resolve));

      expect(await probeInstance(wedged.address().port)).toBe("taken");

      // The abandoned socket would otherwise keep `close()` waiting in the teardown.
      wedged.closeAllConnections();
    });

    test("reports a stranger on the port", async () => {
      const stranger = http.createServer((request, response) => {
        response.writeHead(200, { "content-type": "text/plain" });
        response.end("not the palette");
      });
      servers.push(stranger);
      await new Promise((resolve) => stranger.listen(PORT, "127.0.0.1", resolve));
      expect(await probeInstance()).toBe("taken");
    });
  });

  describe("findDist", () => {
    test("prefers the macOS bundle layout", () => {
      const contents = path.join(base, "Contents");
      fs.mkdirSync(path.join(contents, "MacOS"), { recursive: true });
      fs.mkdirSync(path.join(contents, "Resources", "dist"), { recursive: true });
      const found = findDist(path.join(contents, "MacOS", "adaptive-palette"), base);
      expect(found).toBe(path.join(contents, "Resources", "dist"));
    });

    test("finds the Windows layout beside the executable", () => {
      const found = findDist(path.join(base, "AdaptivePalette.exe"), base);
      expect(found).toBe(root);
    });

    test("falls back to the checkout layout", () => {
      const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "palette-elsewhere-"));
      const found = findDist(
        path.join(elsewhere, "node"), path.join(base, "launcher")
      );
      expect(found).toBe(root);
      fs.rmSync(elsewhere, { recursive: true, force: true });
    });

    test("returns null when there is no dist anywhere", () => {
      const empty = fs.mkdtempSync(path.join(os.tmpdir(), "palette-empty-"));
      expect(findDist(path.join(empty, "node"), empty)).toBeNull();
      fs.rmSync(empty, { recursive: true, force: true });
    });
  });
});
