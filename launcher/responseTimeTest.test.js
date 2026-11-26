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
import { describe, expect, test } from "vitest";
import { renderPromptLines, renderTemplate } from "../src/client/utils/PromptUtils.ts";
import {
  COLUMNS, ROW_COLUMNS, chatMessages, gpuUse, installedName, ollamaAssets, parseMacGpu, parseNvidiaSmi, parseWindowsGpu,
  resultValues, spreadsheetRow
} from "./responseTimeTest.cjs";

const config = JSON.parse(fs.readFileSync(new URL("../public/config.json", import.meta.url), "utf8"));
const section = config.telegraphicTranslation;

describe("chatMessages", () => {
  test("renders the Make Sentence prompts as the app does", () => {
    const values = {
      numSentences: String(section.numSentences), telegraphicMessage: "want drink water",
      attributes: "", aboutMe: ""
    };
    expect(chatMessages(section, "want drink water")).toEqual([
      { role: "system", content: renderTemplate(section.systemPrompt.en, values) },
      { role: "user", content: renderPromptLines(section.userPrompt.en, values) }
    ]);
  });

  test("drops the empty attributes and About Me lines", () => {
    expect(chatMessages(section, "want drink water")[1].content).toBe("Telegraphic message: want drink water");
  });
});

describe("parseMacGpu", () => {
  test("reports shared memory on Apple Silicon", () => {
    const json = JSON.stringify({ SPDisplaysDataType: [{ sppci_model: "Apple M2 Pro" }] });
    expect(parseMacGpu(json)).toEqual({ gpu: "Apple M2 Pro", vram: "shared" });
  });

  test("lists every GPU and takes the dedicated memory", () => {
    const json = JSON.stringify({
      SPDisplaysDataType: [
        { sppci_model: "Intel UHD Graphics 630", spdisplays_vram_shared: "1536 MB" },
        { sppci_model: "AMD Radeon Pro 5500M", spdisplays_vram: "8 GB" }
      ]
    });
    expect(parseMacGpu(json)).toEqual({ gpu: "Intel UHD Graphics 630 + AMD Radeon Pro 5500M", vram: "8" });
  });

  test("takes the largest memory, whichever GPU is listed first", () => {
    const json = JSON.stringify({
      SPDisplaysDataType: [
        { sppci_model: "Intel UHD Graphics 630", spdisplays_vram: "1536 MB" },
        { sppci_model: "AMD Radeon Pro 5500M", spdisplays_vram: "8 GB" }
      ]
    });
    expect(parseMacGpu(json).vram).toBe("8");
  });

  test("converts MB to GB", () => {
    const json = JSON.stringify({ SPDisplaysDataType: [{ sppci_model: "Radeon", spdisplays_vram: "2048 MB" }] });
    expect(parseMacGpu(json).vram).toBe("2");
  });
});

describe("parseWindowsGpu", () => {
  test("reads one GPU, which PowerShell prints as an object", () => {
    const json = JSON.stringify({ Name: "Intel(R) UHD Graphics", AdapterRAM: 1073741824 });
    expect(parseWindowsGpu(json)).toEqual({ gpu: "Intel(R) UHD Graphics", vram: "1" });
  });

  test("lists every GPU and takes the largest memory", () => {
    const json = JSON.stringify([
      { Name: "Intel(R) UHD Graphics", AdapterRAM: 1073741824 },
      { Name: "AMD Radeon RX 6600", AdapterRAM: 4293918720 }
    ]);
    expect(parseWindowsGpu(json)).toEqual({ gpu: "Intel(R) UHD Graphics + AMD Radeon RX 6600", vram: "4" });
  });

  test("reports unknown memory when none is given", () => {
    expect(parseWindowsGpu(JSON.stringify({ Name: "Basic Display", AdapterRAM: null })).vram).toBe("unknown");
  });
});

describe("parseNvidiaSmi", () => {
  test("reads the first GPU's name and memory", () => {
    expect(parseNvidiaSmi("NVIDIA GeForce RTX 3060, 12288 MiB\n")).toEqual({ gpu: "NVIDIA GeForce RTX 3060", vram: "12" });
  });

  test("reports unknown memory when nvidia-smi gives none", () => {
    expect(parseNvidiaSmi("NVIDIA GeForce MX150, [N/A]\n").vram).toBe("unknown");
  });
});

describe("installedName", () => {
  test("matches a name without a tag to its :latest", () => {
    expect(installedName(["gemma4:latest"], "gemma4")).toBe("gemma4:latest");
  });

  test("matches the exact name, and nothing else", () => {
    expect(installedName(["gemma4:12b"], "gemma4:12b")).toBe("gemma4:12b");
    expect(installedName(["gemma4:12b"], "gemma4")).toBeUndefined();
  });
});

describe("gpuUse", () => {
  test("is the share of the model in GPU memory", () => {
    const ps = { models: [{ name: "gemma4:12b", size: 10e9, size_vram: 4e9 }] };
    expect(gpuUse(ps, "gemma4:12b")).toBe("40% GPU");
  });

  test("finds a model named without a tag", () => {
    expect(gpuUse({ models: [{ name: "gemma4:latest", size: 10e9, size_vram: 10e9 }] }, "gemma4")).toBe("100% GPU");
  });

  test("is unknown when the model is not loaded", () => {
    expect(gpuUse({ models: [] }, "gemma4:12b")).toBe("unknown");
  });
});

describe("ollamaAssets", () => {
  test("picks the macOS archive", () => {
    expect(ollamaAssets("darwin", "arm64", "Apple M2")).toEqual(["ollama-darwin.tgz"]);
  });

  test("adds ROCm for an AMD GPU on Windows", () => {
    expect(ollamaAssets("win32", "x64", "AMD Radeon RX 6600"))
      .toEqual(["ollama-windows-amd64.zip", "ollama-windows-amd64-rocm.zip"]);
  });

  test("picks the plain Windows archive otherwise", () => {
    expect(ollamaAssets("win32", "x64", "NVIDIA GeForce RTX 3060")).toEqual(["ollama-windows-amd64.zip"]);
    expect(ollamaAssets("win32", "arm64", "Qualcomm Adreno")).toEqual(["ollama-windows-arm64.zip"]);
  });

  test("refuses other platforms", () => {
    expect(() => ollamaAssets("linux", "x64", "")).toThrow();
  });
});

describe("resultValues", () => {
  const specs = { os: "macOS 15.6", cpu: "Apple M2 Pro", cores: 12, ram: 32, gpu: "Apple M2 Pro", vram: "shared" };
  const cold = {
    load_duration: 9.84e9, total_duration: 12.3e9, prompt_eval_count: 450, prompt_eval_duration: 1e9,
    eval_count: 70, eval_duration: 2e9
  };
  const warm1 = { total_duration: 2e9, eval_count: 70, eval_duration: 2e9 };
  const warm2 = { total_duration: 1.8e9, eval_count: 70, eval_duration: 1.75e9 };

  test("has one value per column, in order", () => {
    const values = resultValues({ specs, gpuUse: "100% GPU", runs: [cold, warm1, warm2], ollama: "0.40.18", toolVersion: "0.4.1" });
    expect(values).toEqual([
      "macOS 15.6", "Apple M2 Pro", "12", "32", "Apple M2 Pro", "shared", "100% GPU",
      "9.8", "12.3", "1.9", "450", "38", "0.40.18", "0.4.1"
    ]);
    expect(values).toHaveLength(COLUMNS.length);
  });

  test("marks the timings failed when the model could not answer", () => {
    const values = resultValues({ specs, gpuUse: "unknown", runs: undefined, ollama: "0.40.18", toolVersion: "0.4.1" });
    expect(values.slice(7, 12)).toEqual(["failed", "failed", "failed", "failed", "failed"]);
  });

  test("keeps tabs and newlines out of a value", () => {
    const values = resultValues({
      specs: { ...specs, gpu: "A\tB\nC" }, gpuUse: "unknown", runs: undefined, ollama: "x", toolVersion: "y"
    });
    expect(values[4]).toBe("A B C");
  });
});

describe("spreadsheetRow", () => {
  const values = [
    "macOS 15.8.3", "Intel Core i7", "12", "32", "Radeon Pro Vega 16", "4", "0% GPU",
    "18.1", "37.9", "18.6", "16", "7", "0.40.18", "0.4.1"
  ];

  test("puts the specs in one quoted cell, a line each, and the timings in their own", () => {
    const cells = spreadsheetRow(values).split("\t");
    expect(cells).toEqual([
      "\"OS: macOS 15.8.3\nCPU: Intel Core i7\nCores: 12\nRAM (GB): 32\nGPU: Radeon Pro Vega 16\nVRAM (GB): 4\"",
      "0% GPU", "18.1", "37.9", "18.6", "16", "7", "Ollama 0.40.18, tool 0.4.1"
    ]);
    expect(cells).toHaveLength(ROW_COLUMNS.length);
  });

  test("doubles a quote mark inside the specs cell", () => {
    expect(spreadsheetRow(values.with(1, "Intel \"Core\""))).toContain("CPU: Intel \"\"Core\"\"");
  });
});
