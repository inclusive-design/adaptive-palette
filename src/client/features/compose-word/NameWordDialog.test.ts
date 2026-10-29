import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { userEvent as realUser } from "vitest/browser";
import { html } from "htm/preact";
import type { SymbolEncodingType } from "../../index.d";
import { initAdaptivePaletteGlobals } from "../../core/InitGlobals";
import { insertWord } from "../../core/MessageEdit";
import { queryChat } from "../../core/OllamaApi";
import { setTestConfig } from "../../testUtils/TestConfig";
import { adaptivePaletteGlobals, changeEncodingContents, wordBuildSignal } from "../../state/GlobalData";
import { en } from "../../i18n/en";
import { requestFinish, startBuilding, wordDialogSignal } from "./ComposeWordState";
import { NameWordDialog } from "./NameWordDialog";
import { MAX_SUGGESTED_NAMES } from "./WordNamingUtils";

vi.mock("../../utils/SpeechUtils");
vi.mock("../../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

describe("NameWordDialog", (): void => {

  const word = (label: string, composition: number): SymbolEncodingType => ({ label, composition, modifierInfo: [] });
  const I = word("I", 1840);
  const buildWord = (parts: SymbolEncodingType[]): void => {
    startBuilding();
    parts.forEach((part) => insertWord(part));
    requestFinish();
  };
  const labels = (): string[] => changeEncodingContents.value.payloads.map((payload) => payload.label);

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach((): void => {
    wordBuildSignal.value = null;
    wordDialogSignal.value = null;
    changeEncodingContents.value = { payloads: [I], caretPosition: 0 };
    render(html`<${NameWordDialog} />`);
  });

  test("the name offered puts the word in the message in one selection", async (): Promise<void> => {
    buildWord([word("woman", 710), word("giving", 949), word("knowledge", 412)]);
    const offered = await screen.findByRole("button", { name: `woman giving knowledge ${en.wordDefaultTag}` });
    await waitFor(() => expect(offered).toHaveFocus());
    await userEvent.click(offered);
    expect(labels()).toEqual(["I", "woman giving knowledge"]);
    expect(wordBuildSignal.value).toBeNull();
  });

  test("Use default name and close puts the name offered in the message", async (): Promise<void> => {
    buildWord([word("woman", 710), word("giving", 949)]);
    await userEvent.click(await screen.findByRole("button", { name: en.wordUseDefault }));
    expect(labels()).toEqual(["I", "woman giving"]);
    expect(wordBuildSignal.value).toBeNull();
  });

  test("with no name to offer, offers no default and the name field takes the focus", async (): Promise<void> => {
    buildWord([word("", 710), word("", 949)]);
    const field = await screen.findByLabelText(en.wordNameField);
    await waitFor(() => expect(field).toHaveFocus());
    expect(screen.queryByRole("button", { name: en.wordUseDefault })).toBeNull();
    expect(screen.queryByText(en.wordDefaultTag)).toBeNull();
  });

  test("a typed name is used instead", async (): Promise<void> => {
    buildWord([word("woman", 710), word("giving", 949), word("knowledge", 412)]);
    // Real input: user-event's simulated click can beat showModal()'s initial focus in WebKit.
    await realUser.fill(await screen.findByLabelText(en.wordNameField), "female teacher");
    await realUser.click(screen.getByRole("button", { name: en.wordNameUse }));
    expect(labels()).toEqual(["I", "female teacher"]);
  });

  test("a word already in the vocabulary is offered as that word", async (): Promise<void> => {
    buildWord([word("person", 513), word("giving", 949), word("knowledge", 412)]);
    expect(await screen.findByRole("heading", { name: "This is teacher" })).toBeInTheDocument();
    const useMatch = screen.getByRole("button", { name: "Use teacher" });
    await waitFor(() => expect(useMatch).toHaveFocus());
    await userEvent.click(useMatch);
    expect(changeEncodingContents.value.payloads[1]).toMatchObject({ label: "teacher", userSelectedSymbolId: 2559 });
  });

  test("Back to word closes the dialog and keeps the word", async (): Promise<void> => {
    buildWord([word("woman", 710), word("giving", 949)]);
    await userEvent.click(await screen.findByRole("button", { name: en.wordBack }));
    await waitFor(() => expect(wordDialogSignal.value).toBeNull());
    expect(wordBuildSignal.value).not.toBeNull();
    expect(labels()).toEqual(["woman", "giving"]);
  });

  describe("with a model for naming", (): void => {

    beforeEach((): void => {
      setTestConfig({ wordNaming: { model: "phony-model:12b", systemPrompt: "Name it.", userPrompt: "{{parts}}" } });
      adaptivePaletteGlobals.models = ["phony-model:12b"];
      vi.mocked(queryChat).mockReset();
    });

    afterEach((): void => {
      adaptivePaletteGlobals.models = [];
      setTestConfig();
    });

    test("asks for names when it opens, and offers them marked as AI suggestions", async (): Promise<void> => {
      let answer: (value: unknown) => void = () => {};
      vi.mocked(queryChat).mockReturnValue(new Promise((resolve) => { answer = resolve; }) as never);
      buildWord([word("woman", 710), word("giving", 949), word("knowledge", 412)]);

      expect(await screen.findByText(en.wordSuggesting)).toBeInTheDocument();
      expect(document.querySelectorAll(".namePlaceholder")).toHaveLength(MAX_SUGGESTED_NAMES);
      answer({ message: { content: "female teacher" } });
      await userEvent.click(await screen.findByRole("button", { name: "AI suggestion, female teacher" }));

      expect(changeEncodingContents.value.payloads[1]).toMatchObject({ label: "female teacher", isAiLabel: true });
    });

    test("a reply with fewer names leaves no placeholders", async (): Promise<void> => {
      vi.mocked(queryChat).mockResolvedValue({ message: { content: "female teacher" } } as never);
      buildWord([word("woman", 710), word("giving", 949), word("knowledge", 412)]);
      expect(await screen.findByRole("button", { name: "AI suggestion, female teacher" })).toBeInTheDocument();
      expect(document.querySelectorAll(".namePlaceholder")).toHaveLength(0);
      expect(screen.queryByText(en.wordSuggesting)).toBeNull();
    });

    test("closing the dialog stops the request", async (): Promise<void> => {
      vi.mocked(queryChat).mockReturnValue(new Promise(() => {}) as never);
      buildWord([word("woman", 710), word("giving", 949)]);
      await screen.findByText(en.wordSuggesting);
      const abortSignal = vi.mocked(queryChat).mock.calls[0][4] as AbortSignal;
      expect(abortSignal.aborted).toBe(false);

      await userEvent.click(screen.getByRole("button", { name: en.wordBack }));

      await waitFor(() => expect(abortSignal.aborted).toBe(true));
    });

    test("does not ask for names for a word already in the vocabulary", async (): Promise<void> => {
      buildWord([word("person", 513), word("giving", 949), word("knowledge", 412)]);
      expect(await screen.findByRole("heading", { name: "This is teacher" })).toBeInTheDocument();
      expect(queryChat).not.toHaveBeenCalled();
    });
  });
});
