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
 * Response Time Test: times the Make Sentence model call on this computer, cold and warm,
 * and prints one tab-separated line for the shared spreadsheet. See docs/ResponseTimeTest.md.
 */

const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline/promises");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");

// The Ollama release downloaded when none is running. Must be one that can run the model in
// `config.json`. Raise it when that model needs a newer Ollama.
const OLLAMA_VERSION = "0.40.18";
const EXISTING_HOST = "http://127.0.0.1:11434";
// A port of its own, so the Ollama this tool starts never meets one the tester runs.
const OWN_ADDRESS = "127.0.0.1:11435";
const WORK_DIR = path.join(os.tmpdir(), "adaptive-palette-response-test");
const MIN_FREE_GB = 12;
// `ollama serve` makes this folder on first start (a key pair and a cache). The marker, kept in
// WORK_DIR so an interrupted run still knows, records that this test made it.
const USER_OLLAMA_DIR = path.join(os.homedir(), ".ollama");
const MADE_USER_OLLAMA_DIR = path.join(WORK_DIR, "made-user-ollama-folder");
const OWN_USER_OLLAMA_FILES = ["id_ed25519", "id_ed25519.pub", "cache"];
// Cold, warm 1, warm 2. Different messages: Ollama answers a repeated prompt from its cache.
const DEFAULT_MESSAGES = ["want drink water", "go park tomorrow", "mother come home"];

// The `ollama serve` this tool started, stopped when the tool exits however it exits.
let server;

// The labels of the results shown on screen. `resultValues()` returns one value per label, in
// this order.
const COLUMNS = [
  "OS", "CPU", "Cores", "RAM (GB)", "GPU", "VRAM (GB)", "GPU use", "Load (s)", "Cold total (s)",
  "Warm total (s)", "Prompt tok/s", "Output tok/s", "Ollama", "Tool version"
];

// The spreadsheet's header row. `spreadsheetRow()` returns one cell per column, in this order.
const ROW_COLUMNS = [
  "Computer", "GPU use", "Load (s)", "Cold total (s)", "Warm total (s)", "Prompt tok/s", "Output tok/s", "Versions"
];

// ponytail: copies of `renderTemplate()` and `renderPromptLines()` in
// `src/client/utils/PromptUtils.ts`, which a .cjs file cannot import. The test checks they agree.
function renderTemplate (template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (placeholder, name) => (name in values ? values[name] : placeholder));
}

function renderPromptLines (template, values) {
  return template
    .split("\n")
    .filter((line) => {
      const placeholders = [...line.matchAll(/\{\{(\w+)\}\}/g)];
      return placeholders.length === 0 || !placeholders.every(
        ([, name]) => name in values && values[name].trim().length === 0
      );
    })
    .map((line) => renderTemplate(line, values))
    .join("\n");
}

/**
 * The messages the app sends for Make Sentence in English, with no attributes and an empty
 * About Me.
 * @param {object} section - `telegraphicTranslation` from `config.json`.
 * @param {string} message - The telegraphic message.
 * @returns {{role: string, content: string}[]}
 */
function chatMessages (section, message) {
  const pick = (prompt) => (typeof prompt === "string" ? prompt : prompt.en);
  const values = {
    numSentences: String(section.numSentences), telegraphicMessage: message, attributes: "", aboutMe: ""
  };
  return [
    { role: "system", content: renderTemplate(pick(section.systemPrompt), values) },
    { role: "user", content: renderPromptLines(pick(section.userPrompt), values) }
  ];
}

const oneDecimal = (number) => String(Math.round(number * 10) / 10);

/**
 * GB from a size such as "8 GB" or "1536 MB", or `undefined` when there is none.
 * @param {string|undefined} text - The size.
 * @returns {string|undefined}
 */
function sizeGb (text) {
  const match = /([\d.]+)\s*(GB|MB)/i.exec(text ?? "");
  if (!match) {
    return undefined;
  }
  return oneDecimal(match[2].toUpperCase() === "GB" ? Number(match[1]) : Number(match[1]) / 1024);
}

/**
 * GPU names and the largest dedicated memory from `system_profiler SPDisplaysDataType -json`.
 * Apple Silicon and Intel integrated graphics share the computer's memory: "shared".
 * @param {string} json - The command's output.
 * @returns {{gpu: string, vram: string}}
 */
function parseMacGpu (json) {
  const cards = JSON.parse(json).SPDisplaysDataType ?? [];
  const sizes = cards.map((card) => sizeGb(card.spdisplays_vram)).filter((size) => size !== undefined).map(Number);
  return {
    gpu: cards.map((card) => card.sppci_model).filter(Boolean).join(" + ") || "unknown",
    vram: sizes.length > 0 ? String(Math.max(...sizes)) : "shared"
  };
}

/**
 * GPU names and memory from PowerShell's `Win32_VideoController` as JSON: an object for one
 * GPU, an array for several. `AdapterRAM` stops at 4 GB, so prefer `parseNvidiaSmi()`.
 * @param {string} json - The command's output.
 * @returns {{gpu: string, vram: string}}
 */
function parseWindowsGpu (json) {
  const parsed = JSON.parse(json);
  const cards = Array.isArray(parsed) ? parsed : [parsed];
  const largest = Math.max(0, ...cards.map((card) => card.AdapterRAM ?? 0));
  return {
    gpu: cards.map((card) => card.Name).filter(Boolean).join(" + ") || "unknown",
    vram: largest > 0 ? oneDecimal(largest / 1024 ** 3) : "unknown"
  };
}

/**
 * The first GPU from `nvidia-smi --query-gpu=name,memory.total --format=csv,noheader`.
 * @param {string} csv - The command's output, such as "NVIDIA GeForce RTX 3060, 12288 MiB".
 * @returns {{gpu: string, vram: string}}
 */
function parseNvidiaSmi (csv) {
  const [name, memory] = csv.trim().split("\n")[0].split(",").map((part) => part.trim());
  const mib = parseInt(memory, 10);
  return { gpu: name, vram: Number.isFinite(mib) ? oneDecimal(mib / 1024) : "unknown" };
}

/**
 * The name in `available` that is `wanted`, where a name without a tag means ":latest".
 * ponytail: a copy of `installedName()` in `src/client/core/OllamaApi.ts`, which a .cjs file
 * cannot import.
 * @param {string[]} available - The model names Ollama reports.
 * @param {string} wanted - The model name from `config.json`.
 * @returns {string|undefined}
 */
function installedName (available, wanted) {
  const withTag = wanted.includes(":") ? wanted : `${wanted}:latest`;
  return available.find((candidate) => candidate === wanted || candidate === withTag);
}

/**
 * How much of the loaded model sits in GPU memory, from Ollama's `/api/ps`.
 * @param {object} ps - The `/api/ps` reply.
 * @param {string} model - The model name.
 * @returns {string} - Such as "100% GPU", or "unknown".
 */
function gpuUse (ps, model) {
  const name = installedName(ps.models?.map((entry) => entry.name) ?? [], model);
  const loaded = ps.models?.find((entry) => entry.name === name);
  return loaded?.size ? `${Math.round(loaded.size_vram / loaded.size * 100)}% GPU` : "unknown";
}

/**
 * The Ollama release files this computer needs, in the order to unpack them.
 * @param {string} platform - `process.platform`.
 * @param {string} arch - `process.arch`.
 * @param {string} gpu - The GPU names from the specs.
 * @returns {string[]}
 */
function ollamaAssets (platform, arch, gpu) {
  if (platform === "darwin") {
    return ["ollama-darwin.tgz"];
  }
  if (platform === "win32" && arch === "arm64") {
    return ["ollama-windows-arm64.zip"];
  }
  if (platform === "win32") {
    // Ollama's docs: AMD GPUs need the ROCm files unpacked over the main archive.
    return ["ollama-windows-amd64.zip", ...(/AMD|Radeon/i.test(gpu) ? ["ollama-windows-amd64-rocm.zip"] : [])];
  }
  throw new Error(`This test runs on Windows and macOS only, not ${platform}.`);
}

/**
 * The result row's values, one per entry in `COLUMNS`.
 * @param {object} result - `specs` from `collectSpecs()`, `gpuUse`, `runs` (the three
 *                          `/api/chat` replies, cold first, or `undefined` when they
 *                          failed), `ollama` and `toolVersion`.
 * @returns {string[]}
 */
function resultValues ({ specs, gpuUse: use, runs, ollama, toolVersion }) {
  const seconds = (ns) => oneDecimal(ns / 1e9);
  const rate = (count, ns) => count / (ns / 1e9);
  let timings = ["failed", "failed", "failed", "failed", "failed"];
  if (runs) {
    const [cold, ...warm] = runs;
    const average = (pick) => warm.reduce((sum, run) => sum + pick(run), 0) / warm.length;
    timings = [
      seconds(cold.load_duration),
      seconds(cold.total_duration),
      seconds(average((run) => run.total_duration)),
      // The cold run reads the whole prompt; warm runs reuse the cached system prompt.
      String(Math.round(rate(cold.prompt_eval_count, cold.prompt_eval_duration))),
      String(Math.round(average((run) => rate(run.eval_count, run.eval_duration))))
    ];
  }
  return [specs.os, specs.cpu, specs.cores, specs.ram, specs.gpu, specs.vram, use, ...timings, ollama, toolVersion]
    .map((value) => String(value).replace(/[\t\n]/g, " "));
}

/**
 * The text to paste into the spreadsheet: one tab-separated cell per entry in `ROW_COLUMNS`.
 * The specs share one cell, a line per spec; the timings keep cells of their own to sort by.
 * The specs cell is quoted, as a spreadsheet expects of a pasted cell with line breaks.
 * @param {string[]} values - From `resultValues()`.
 * @returns {string}
 */
function spreadsheetRow (values) {
  const computer = COLUMNS.slice(0, 6).map((column, index) => `${column}: ${values[index]}`).join("\n");
  const [use, load, cold, warm, promptRate, outputRate, ollama, toolVersion] = values.slice(6);
  return [
    `"${computer.replaceAll("\"", "\"\"")}"`,
    use, load, cold, warm, promptRate, outputRate, `Ollama ${ollama}, tool ${toolVersion}`
  ].join("\t");
}

/**
 * Put `text` on the clipboard.
 * @param {string} text - What to copy.
 * @returns {boolean} - Whether it worked.
 */
function copyToClipboard (text) {
  try {
    execFileSync(process.platform === "win32" ? "clip" : "pbcopy", { input: text, stdio: ["pipe", "ignore", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

/**
 * A command's output, or `undefined` when it is missing or fails.
 * @param {string} command - The program.
 * @param {string[]} args - Its arguments.
 * @returns {string|undefined}
 */
function output (command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 30000 });
  } catch {
    return undefined;
  }
}

/**
 * This computer's specs. A field that cannot be read is "unknown".
 * @returns {{os: string, cpu: string, cores: number, ram: string, gpu: string, vram: string}}
 */
function collectSpecs () {
  let gpu = { gpu: "unknown", vram: "unknown" };
  try {
    if (process.platform === "darwin") {
      gpu = parseMacGpu(output("system_profiler", ["SPDisplaysDataType", "-json"]));
    } else if (process.platform === "win32") {
      const smi = output("nvidia-smi", ["--query-gpu=name,memory.total", "--format=csv,noheader"]);
      gpu = smi ? parseNvidiaSmi(smi) : parseWindowsGpu(output("powershell", [
        "-NoProfile", "-Command", "Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Json"
      ]));
    }
  } catch {
    // Unreadable output: the GPU stays "unknown".
  }
  const macVersion = process.platform === "darwin" ? output("sw_vers", ["-productVersion"])?.trim() : undefined;
  return {
    os: macVersion ? `macOS ${macVersion}` : `${os.type()} ${os.release()}`,
    cpu: os.cpus()[0]?.model.trim() ?? "unknown",
    cores: os.cpus().length,
    ram: oneDecimal(os.totalmem() / 1024 ** 3),
    ...gpu
  };
}

/**
 * Call the Ollama API. A GET without `body`, a POST with one.
 * @param {string} host - Such as "http://127.0.0.1:11434".
 * @param {string} endpoint - Such as "chat".
 * @param {object} [body] - The JSON body.
 * @param {number} [timeoutMs] - Give up after this long.
 * @returns {Promise<object>} - The JSON reply.
 */
function api (host, endpoint, body, timeoutMs) {
  // `node:http`, not `fetch`: with `stream: false` Ollama sends no headers until the answer is
  // done, and fetch gives up after 300 s of waiting for them.
  return new Promise((resolve, reject) => {
    const request = http.request(`${host}/api/${endpoint}`, { method: body === undefined ? "GET" : "POST" }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        text += chunk;
      });
      response.on("error", reject);
      response.on("end", () => {
        let reply;
        try {
          reply = JSON.parse(text);
        } catch {
          reply = {};
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(reply.error ?? `Ollama answered ${response.statusCode}.`));
        } else {
          resolve(reply);
        }
      });
    });
    request.on("error", reject);
    if (timeoutMs) {
      request.setTimeout(timeoutMs, () => request.destroy(new Error("Ollama did not answer in time.")));
    }
    request.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

/**
 * Print a percentage on one line, only when it changes.
 * @returns {function(number, number): void} - Takes the amount done and the total.
 */
function progress () {
  let shown = -1;
  return (done, total) => {
    const percent = Math.floor(done / total * 100);
    if (total > 0 && percent !== shown) {
      shown = percent;
      process.stdout.write(`\r  ${percent}%`);
    }
  };
}

/**
 * The Ollama already running here, when it has the model.
 * @param {string} model - The model name.
 * @returns {Promise<{host: string, label: string}|undefined>}
 */
async function existingOllama (model) {
  try {
    const { models } = await api(EXISTING_HOST, "tags", undefined, 2000);
    if (!installedName(models.map((entry) => entry.name), model)) {
      return undefined;
    }
    const { version } = await api(EXISTING_HOST, "version", undefined, 2000);
    return { host: EXISTING_HOST, label: `existing ${version}` };
  } catch {
    return undefined;
  }
}

/**
 * Download `url` to `file`, showing progress.
 * @param {string} url - What to download.
 * @param {string} file - Where to save it.
 * @returns {Promise<void>}
 */
async function download (url, file) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download ${url} (${response.status}).`);
  }
  const total = Number(response.headers.get("content-length"));
  const show = progress();
  let done = 0;
  const body = Readable.fromWeb(response.body);
  body.on("data", (chunk) => {
    done += chunk.length;
    show(done, total);
  });
  await pipeline(body, fs.createWriteStream(file));
  process.stdout.write("\n");
}

/**
 * Download Ollama into `WORK_DIR`, unless an earlier run already did, and start it on
 * `OWN_ADDRESS`.
 * @param {string} gpu - The GPU names from the specs, to pick the right download.
 * @returns {Promise<{host: string, label: string}>}
 */
async function startOwnOllama (gpu) {
  // ponytail: the space check runs only on a first run; a rerun after an interrupted
  // download trusts the earlier check.
  if (!fs.existsSync(WORK_DIR)) {
    fs.mkdirSync(WORK_DIR, { recursive: true });
    const stats = fs.statfsSync(WORK_DIR);
    const freeGb = stats.bavail * stats.bsize / 1024 ** 3;
    if (freeGb < MIN_FREE_GB) {
      fs.rmSync(WORK_DIR, { recursive: true, force: true });
      throw new Error(`This test needs ${MIN_FREE_GB} GB of free disk space. ${Math.floor(freeGb)} GB is free.`);
    }
  }
  const ollamaDir = path.join(WORK_DIR, `ollama-${OLLAMA_VERSION}`);
  const binary = path.join(ollamaDir, process.platform === "win32" ? "ollama.exe" : "ollama");
  if (!fs.existsSync(binary)) {
    // Unpack beside it and rename into place, so a half-unpacked folder is never trusted.
    const staging = `${ollamaDir}.partial`;
    fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging);
    for (const asset of ollamaAssets(process.platform, process.arch, gpu)) {
      console.log(`Downloading ${asset} (Ollama ${OLLAMA_VERSION})...`);
      const archive = path.join(WORK_DIR, asset);
      await download(`https://github.com/ollama/ollama/releases/download/v${OLLAMA_VERSION}/${asset}`, archive);
      // `tar` ships with macOS and with Windows 10 and later, and unpacks both .tgz and .zip.
      // On Windows use the system tar by full path: a GNU tar on PATH cannot unpack .zip.
      const tar = process.platform === "win32"
        ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar";
      execFileSync(tar, ["-xf", archive, "-C", staging]);
      fs.rmSync(archive);
    }
    if (!fs.existsSync(path.join(staging, path.basename(binary)))) {
      throw new Error(`The Ollama download has no ${path.basename(binary)} at its top level.`);
    }
    fs.renameSync(staging, ollamaDir);
  }

  const host = `http://${OWN_ADDRESS}`;
  if (await api(host, "version", undefined, 1000).then(() => true, () => false)) {
    // Most likely an Ollama left running by an earlier test that was closed mid-run.
    throw new Error(`Something is already using ${OWN_ADDRESS}. Restart the computer and run the test again.`);
  }
  if (!fs.existsSync(USER_OLLAMA_DIR)) {
    fs.writeFileSync(MADE_USER_OLLAMA_DIR, "");
  }
  let failure;
  server = spawn(binary, ["serve"], {
    env: { ...process.env, OLLAMA_HOST: OWN_ADDRESS, OLLAMA_MODELS: path.join(WORK_DIR, "models") },
    stdio: "ignore"
  });
  server.on("error", (error) => {
    failure = error;
  });
  server.on("exit", (code, signal) => {
    failure ??= new Error(`Ollama stopped as it started (${code ?? signal}).`);
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (failure) {
      throw failure;
    }
    try {
      await api(host, "version", undefined, 1000);
      return { host, label: OLLAMA_VERSION };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("Ollama did not start.");
}

/**
 * Download the model into the Ollama at `host`, showing progress.
 * @param {string} host - The Ollama to pull into.
 * @param {string} model - The model name.
 * @returns {Promise<void>}
 */
async function pull (host, model) {
  const response = await fetch(`${host}/api/pull`, { method: "POST", body: JSON.stringify({ model }) });
  if (!response.ok) {
    throw new Error(`Could not download ${model} (${response.status}).`);
  }
  const show = progress();
  let buffered = "";
  for await (const text of response.body.pipeThrough(new TextDecoderStream())) {
    const lines = (buffered + text).split("\n");
    buffered = lines.pop();
    for (const line of lines.filter(Boolean)) {
      const step = JSON.parse(line);
      if (step.error) {
        throw new Error(step.error);
      }
      if (step.total) {
        show(step.completed ?? 0, step.total);
      }
    }
  }
  process.stdout.write("\n");
}

/**
 * Stop the `ollama serve` this tool started, and wait until it has gone, so its files can be
 * deleted on Windows.
 * @returns {Promise<void>}
 */
async function stopServer () {
  if (server && server.exitCode === null && server.signalCode === null) {
    await new Promise((resolve) => {
      server.once("exit", resolve);
      server.kill();
    });
  }
}

/**
 * Ask a question in the console.
 * @param {string} question - The question.
 * @returns {Promise<string>} - The answer.
 */
async function ask (question) {
  const lines = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await lines.question(question);
  lines.close();
  return answer;
}

const read = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));

async function main () {
  const section = read("public/config.json").telegraphicTranslation;
  const model = section.model;
  const toolVersion = read("package.json").version;
  // Replaceable on the command line, for comparing with the app's own labels.
  const given = process.argv.length >= 5 ? process.argv.slice(2, 5) : [];
  if (given.length === 0 && process.argv.length > 2) {
    console.log("Give three messages (cold, warm 1, warm 2) or none. Using the defaults.");
  }
  const messages = given.length ? given : DEFAULT_MESSAGES;

  console.log("Adaptive Palette response time test\n");
  console.log("Reading this computer's specs...");
  const specs = collectSpecs();

  let ollama = await existingOllama(model);
  if (ollama) {
    console.log(`Using the Ollama already running here (${ollama.label}).`);
  } else {
    const running = await api(EXISTING_HOST, "version", undefined, 2000).then(() => true, () => false);
    if (running) {
      console.log(`Ollama is running here without ${model}; using a separate copy.`);
    }
    ollama = await startOwnOllama(specs.gpu);
    console.log(`Downloading ${model} (about 8 GB)...`);
    await pull(ollama.host, model);
  }

  let runs;
  let use = "unknown";
  try {
    await api(ollama.host, "generate", { model, keep_alive: 0 });
    runs = [];
    for (const [index, message] of messages.entries()) {
      console.log(index === 0 ? "Cold run (loads the model first)..." : `Warm run ${index}...`);
      // Exactly what the app's `queryChat()` sends.
      const run = await api(ollama.host, "chat", { model, messages: chatMessages(section, message), think: false, stream: false });
      console.log(`  ${(run.total_duration / 1e9).toFixed(1)} s, ${run.prompt_eval_count} prompt tokens`);
      runs.push(run);
    }
    use = gpuUse(await api(ollama.host, "ps"), model);
  } catch (error) {
    runs = undefined;
    console.log(`\nThe model could not answer: ${error.message}`);
  }

  const values = resultValues({ specs, gpuUse: use, runs, ollama: ollama.label, toolVersion });
  console.log("\nResults\n");
  COLUMNS.forEach((column, index) => console.log(`  ${column}: ${values[index]}`));
  const row = spreadsheetRow(values);
  if (copyToClipboard(row)) {
    console.log("\nThe result is copied. Paste it into the first empty row of the spreadsheet.\n");
  } else {
    console.log("\nCopy the text below, from the first quote mark to the end, and paste it into the first empty");
    console.log("row of the spreadsheet:\n");
    console.log(row);
    console.log("");
  }
}

/**
 * Stop the Ollama this tool started and offer to delete what it downloaded. Runs after a
 * failed run too, so nothing is left behind.
 * @returns {Promise<void>}
 */
async function cleanUp () {
  if (server) {
    // Unloading the model makes Ollama stop its runner process, which holds files open on Windows.
    const { model } = read("public/config.json").telegraphicTranslation;
    await api(`http://${OWN_ADDRESS}`, "generate", { model, keep_alive: 0 }).catch(() => {});
  }
  await stopServer();
  if (!fs.existsSync(WORK_DIR)) {
    return;
  }
  const answer = await ask("Delete the Ollama and model this test downloaded (up to 10 GB)? [Y/n] ");
  if (/^n/i.test(answer.trim())) {
    return;
  }
  try {
    if (fs.existsSync(MADE_USER_OLLAMA_DIR) && ownsUserOllamaDir()) {
      for (const file of OWN_USER_OLLAMA_FILES) {
        fs.rmSync(path.join(USER_OLLAMA_DIR, file), { recursive: true, force: true });
      }
      fs.rmdirSync(USER_OLLAMA_DIR);
    }
    fs.rmSync(WORK_DIR, { recursive: true, force: true });
    console.log("Deleted.");
  } catch (error) {
    console.log(`Could not delete ${WORK_DIR}: ${error.message}. Delete it by hand.`);
  }
}

/**
 * Whether `~/.ollama` holds only what this test's `ollama serve` made. An Ollama installed since
 * adds to it (models, logs) and reuses the key pair, so then it is left alone.
 * @returns {boolean}
 */
function ownsUserOllamaDir () {
  try {
    return fs.readdirSync(USER_OLLAMA_DIR).every((file) => OWN_USER_OLLAMA_FILES.includes(file));
  } catch {
    return false;
  }
}

module.exports = {
  COLUMNS, ROW_COLUMNS, chatMessages, gpuUse, installedName, ollamaAssets, parseMacGpu, parseNvidiaSmi, parseWindowsGpu,
  resultValues, spreadsheetRow
};

if (require.main === module) {
  process.on("exit", () => server?.kill());
  process.on("SIGINT", () => process.exit(130));
  main()
    .catch((error) => {
      console.log(`\nThe test stopped: ${error.cause?.message ?? error.message}`);
      console.log("Run the test again. If it stops at the same place, send this message to the Adaptive Palette team.");
      process.exitCode = 1;
    })
    .finally(async () => {
      await cleanUp().catch((error) => console.log(`Could not clean up: ${error.message}`));
      await ask("\nPress Enter to close.");
    });
}
