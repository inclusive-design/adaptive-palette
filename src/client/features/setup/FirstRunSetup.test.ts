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

import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { html } from "htm/preact";
import { vi } from "vitest";

import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { makeDefaultConfig } from "../../core/Config";
import { getModelNames, pullModel } from "../../core/OllamaApi";
import {
  CANCEL_LABEL, CONTINUE_LABEL, DOWNLOAD_LABEL, FirstRunSetup, INSTALL_LABEL,
  MISSING_MODEL_TEXT, RETRY_LABEL
} from "./FirstRunSetup";
import { reloadPage, setupDismissedSignal } from "./SetupState";

vi.mock("../../core/OllamaApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../core/OllamaApi")>()),
  getModelNames: vi.fn(),
  pullModel: vi.fn(),
}));

// `window.location` is not configurable in every browser engine, so `reload()` cannot be
// stubbed on it directly; `SetupState.ts` breaks the call out into `reloadPage()` so this can
// stub that instead. A test cannot be allowed to actually reload the runner's own page.
vi.mock("./SetupState", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./SetupState")>()),
  reloadPage: vi.fn(),
}));

const mockedGetModelNames = vi.mocked(getModelNames);
const mockedPullModel = vi.mocked(pullModel);
const mockedReloadPage = vi.mocked(reloadPage);

// The config the tests run against: one model asked for, by every section that can.
function useConfigAskingFor (model: string): void {
  const config = makeDefaultConfig();
  config.indicatorLabelLookup.model = model;
  adaptivePaletteGlobals.config = config;
}

describe("FirstRunSetup", (): void => {

  beforeEach((): void => {
    setupDismissedSignal.value = false;
    useConfigAskingFor("gemma4:12b");
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  test("shows nothing when the model is already there", (): void => {
    adaptivePaletteGlobals.models = ["gemma4:12b"];
    render(html`<${FirstRunSetup} />`);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("offers to install Ollama when nothing answers", (): void => {
    adaptivePaletteGlobals.models = [];
    render(html`<${FirstRunSetup} />`);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: INSTALL_LABEL })).toHaveAttribute(
      "href", "https://ollama.com/download"
    );
    expect(screen.getByRole("button", { name: RETRY_LABEL })).toBeInTheDocument();
  });

  test("continuing without AI features closes it and leaves the app usable", async (): Promise<void> => {
    adaptivePaletteGlobals.models = [];
    render(html`<${FirstRunSetup} />`);

    await userEvent.click(screen.getByRole("button", { name: CONTINUE_LABEL }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mockedReloadPage).not.toHaveBeenCalled();
  });

  test("trying again reloads once Ollama is up", async (): Promise<void> => {
    adaptivePaletteGlobals.models = [];
    mockedGetModelNames.mockResolvedValue(["gemma4:12b"]);
    render(html`<${FirstRunSetup} />`);

    await userEvent.click(screen.getByRole("button", { name: RETRY_LABEL }));

    await waitFor(() => expect(mockedReloadPage).toHaveBeenCalledTimes(1));
  });

  test("trying again while Ollama is still down keeps the dialog up", async (): Promise<void> => {
    adaptivePaletteGlobals.models = [];
    mockedGetModelNames.mockResolvedValue([]);
    render(html`<${FirstRunSetup} />`);

    await userEvent.click(screen.getByRole("button", { name: RETRY_LABEL }));

    await waitFor(() => expect(mockedGetModelNames).toHaveBeenCalled());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mockedReloadPage).not.toHaveBeenCalled();
  });

  test("trying again shows the download offer once Ollama is up but missing the model", async (): Promise<void> => {
    adaptivePaletteGlobals.models = [];
    mockedGetModelNames.mockResolvedValue(["llama3:8b"]);
    render(html`<${FirstRunSetup} />`);

    await userEvent.click(screen.getByRole("button", { name: RETRY_LABEL }));

    await waitFor(() =>
      expect(screen.getByRole("dialog")).toMatchTextContent(MISSING_MODEL_TEXT(["gemma4:12b"]))
    );
    expect(screen.getByRole("button", { name: DOWNLOAD_LABEL })).toBeInTheDocument();
    expect(mockedReloadPage).not.toHaveBeenCalled();
  });

  test("names the missing model and offers to download it", (): void => {
    adaptivePaletteGlobals.models = ["llama3:8b"];
    render(html`<${FirstRunSetup} />`);

    expect(screen.getByRole("dialog")).toMatchTextContent("gemma4:12b");
    expect(screen.getByRole("button", { name: DOWNLOAD_LABEL })).toBeInTheDocument();
  });

  test("shows how far the download has got, then reloads", async (): Promise<void> => {
    adaptivePaletteGlobals.models = ["llama3:8b"];
    mockedPullModel.mockImplementation(async (model, onProgress) => {
      void model;
      onProgress({ completed: 25, total: 100 });
      await Promise.resolve();
    });
    mockedGetModelNames.mockResolvedValue(["gemma4:12b"]);
    render(html`<${FirstRunSetup} />`);

    await userEvent.click(screen.getByRole("button", { name: DOWNLOAD_LABEL }));

    await waitFor(() => expect(screen.getByRole("progressbar")).toHaveValue(25));
    await waitFor(() => expect(mockedReloadPage).toHaveBeenCalledTimes(1));
  });

  test("a failed download says so and leaves the dialog open", async (): Promise<void> => {
    adaptivePaletteGlobals.models = ["llama3:8b"];
    mockedPullModel.mockRejectedValue(new Error("Connection refused"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(html`<${FirstRunSetup} />`);

    await userEvent.click(screen.getByRole("button", { name: DOWNLOAD_LABEL }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mockedReloadPage).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  // The dialog must never block: the palette works without a model, and an AAC user cannot
  // be shut out of the device they talk with. Asserted here for the state a stuck tester is
  // most likely to be in, and for the one after a failure.
  test("still offers to continue without AI features while the download is running", async (): Promise<void> => {
    adaptivePaletteGlobals.models = ["llama3:8b"];
    // A pull that never settles: the dialog stays in its downloading state.
    mockedPullModel.mockImplementation(() => new Promise<void>(() => {}));
    render(html`<${FirstRunSetup} />`);

    await userEvent.click(screen.getByRole("button", { name: DOWNLOAD_LABEL }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: CANCEL_LABEL })).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: CONTINUE_LABEL })).toBeInTheDocument();
  });

  test("still offers to continue without AI features after a failed download", async (): Promise<void> => {
    adaptivePaletteGlobals.models = ["llama3:8b"];
    mockedPullModel.mockRejectedValue(new Error("Connection refused"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(html`<${FirstRunSetup} />`);

    await userEvent.click(screen.getByRole("button", { name: DOWNLOAD_LABEL }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: CONTINUE_LABEL })).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  test("a cancelled download is not reported as a failure", async (): Promise<void> => {
    adaptivePaletteGlobals.models = ["llama3:8b"];
    mockedPullModel.mockRejectedValue(
      new DOMException("The user aborted a request.", "AbortError")
    );
    render(html`<${FirstRunSetup} />`);

    await userEvent.click(screen.getByRole("button", { name: DOWNLOAD_LABEL }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: DOWNLOAD_LABEL })).toBeInTheDocument()
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
