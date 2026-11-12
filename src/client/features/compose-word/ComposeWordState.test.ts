import type { SymbolEncodingType } from "../../index.d";
import { changeEncodingContents, wordBuildSignal } from "../../state/GlobalData";
import { editMessage, insertWord, setEditGuard } from "../../core/MessageEdit";
import { COMMA_PART, SPACE_PART } from "../../utils/SymbolEncodingUtils";
import {
  cancelBuilding, chooseMatch, chooseName, insertComma, insertSpace, requestFinish, setCombine, splitAtCaret,
  startBuilding, wordDialogSignal
} from "./ComposeWordState";

const word = (label: string, composition: number): SymbolEncodingType => ({ label, composition, modifierInfo: [] });
const I = word("I", 1840);
const see = word("see", 2340);
const cat = word("cat", 126);
const colour = word("colour", 1161);
const night = word("night", 470);
const labels = (): string[] => changeEncodingContents.value.payloads.map((payload) => payload.label);

describe("ComposeWordState", (): void => {

  beforeEach((): void => {
    setEditGuard(null);
    wordBuildSignal.value = null;
    wordDialogSignal.value = null;
    changeEncodingContents.value = { payloads: [I, see], caretPosition: 1 };
  });

  test("starting a word sets the message aside and empties the input area", (): void => {
    startBuilding();
    expect(wordBuildSignal.value).toEqual({ message: { payloads: [I, see], caretPosition: 1 }, combine: false });
    expect(changeEncodingContents.value).toEqual({ payloads: [], caretPosition: -1 });
  });

  test("Cancel puts the message back as it was", (): void => {
    startBuilding();
    insertWord(cat);
    cancelBuilding();
    expect(changeEncodingContents.value).toEqual({ payloads: [I, see], caretPosition: 1 });
    expect(wordBuildSignal.value).toBeNull();
  });

  test("words added before the marker stay joined; the next one gets a comma", (): void => {
    startBuilding();
    insertWord(cat);
    insertWord(colour);
    setCombine(true);
    insertWord(night);
    expect(changeEncodingContents.value.payloads).toEqual([cat, colour, COMMA_PART, night]);
  });

  test("Space adds a space after the caret", (): void => {
    // Scenario 8: cat and colour joined, night after a comma, then a space added after cat.
    startBuilding();
    insertWord(cat);
    insertWord(colour);
    setCombine(true);
    insertWord(night);
    editMessage({ payloads: changeEncodingContents.value.payloads, caretPosition: 0 });
    insertSpace();
    expect(changeEncodingContents.value).toEqual({
      payloads: [cat, SPACE_PART, colour, COMMA_PART, night], caretPosition: 1
    });
  });

  test("turning the marker off keeps the commas", (): void => {
    startBuilding();
    setCombine(true);
    insertWord(cat);
    insertWord(colour);
    insertWord(night);
    setCombine(false);
    expect(changeEncodingContents.value).toEqual({
      payloads: [cat, COMMA_PART, colour, COMMA_PART, night], caretPosition: 4
    });
    expect(wordBuildSignal.value?.combine).toBe(false);
  });

  test("Space adds a space without the combine marker", (): void => {
    startBuilding();
    insertWord(cat);
    insertSpace();
    insertWord(night);
    expect(changeEncodingContents.value.payloads).toEqual([cat, SPACE_PART, night]);
  });

  test("Split puts the characters in place of the part, with the caret on the last", (): void => {
    startBuilding();
    insertWord(word("teacher", 2559));
    splitAtCaret();
    expect(labels()).toEqual(["person", "giving", "knowledge"]);
    expect(changeEncodingContents.value.caretPosition).toBe(2);
  });

  test("Split with the marker on puts a comma between the characters", (): void => {
    startBuilding();
    setCombine(true);
    insertWord(word("teacher", 2559));
    splitAtCaret();
    expect(labels()).toEqual(["person", ",", "giving", ",", "knowledge"]);
    expect(changeEncodingContents.value.caretPosition).toBe(4);
  });

  test("Done with the marker on joins words and commas a quarter space apart", (): void => {
    startBuilding();
    setCombine(true);
    insertWord(word("woman", 710));
    insertWord(word("knowledge", 412));
    requestFinish();
    expect(wordDialogSignal.value?.composition).toEqual([233, "/", 710, "/", 5, "/", 412, "/", 233]);
  });

  test("Comma adds a comma after the caret", (): void => {
    startBuilding();
    insertWord(cat);
    insertComma();
    expect(changeEncodingContents.value).toEqual({ payloads: [cat, COMMA_PART], caretPosition: 1 });
  });

  test("Done offers the words' labels as the name", (): void => {
    startBuilding();
    [word("woman", 710), word("giving", 949), word("knowledge", 412)].forEach((part) => insertWord(part));
    requestFinish();
    expect(wordDialogSignal.value).toEqual({
      composition: [710, "/", 949, "/", 412],
      offeredName: "woman giving knowledge",
      partLabels: ["woman", "giving", "knowledge"]
    });
  });

  test("Done on a vocabulary word offers that word", (): void => {
    startBuilding();
    [word("person", 513), word("giving", 949), word("knowledge", 412)].forEach((part) => insertWord(part));
    requestFinish();
    expect(wordDialogSignal.value?.match).toEqual({ id: 2559, label: "teacher", composition: [513, "/", 949, "/", 412] });
  });

  test("Done does nothing while the word has no symbol", (): void => {
    startBuilding();
    requestFinish();
    expect(wordDialogSignal.value).toBeNull();
  });

  test("a chosen name puts the word in after where the caret was", (): void => {
    changeEncodingContents.value = { payloads: [I, see], caretPosition: 0 };
    startBuilding();
    [word("woman", 710), word("giving", 949)].forEach((part) => insertWord(part));
    requestFinish();
    chooseName("female giver");
    expect(changeEncodingContents.value).toEqual({
      payloads: [I, { label: "female giver", composition: [710, "/", 949], modifierInfo: [], isComposedWord: true }, see],
      caretPosition: 1
    });
    expect(wordBuildSignal.value).toBeNull();
    expect(wordDialogSignal.value).toBeNull();
  });

  test("choosing the match puts the vocabulary word in", (): void => {
    startBuilding();
    [word("person", 513), word("giving", 949), word("knowledge", 412)].forEach((part) => insertWord(part));
    requestFinish();
    chooseMatch();
    expect(changeEncodingContents.value.payloads[2]).toEqual({
      label: "teacher", composition: [513, "/", 949, "/", 412], userSelectedSymbolId: 2559, modifierInfo: []
    });
  });

  test("Done waits for a part's label being worked out, then offers the new one", (): void => {
    startBuilding();
    insertWord(word("woman", 710));
    insertWord({ ...word("opposite of cold", 1436), pendingLabel: "key" });
    requestFinish();
    expect(wordDialogSignal.value).toBeNull();

    // The model's label arrives.
    const [woman] = changeEncodingContents.value.payloads;
    editMessage({ payloads: [woman, word("hot", 1436)], caretPosition: 1 });
    expect(wordDialogSignal.value?.partLabels).toEqual(["woman", "hot"]);
  });
});
