import {
  isCombined,
  moveCursor,
  deleteAtCaret,
  combineContent,
  uncombineContent
} from "./CursorActions";

import { combineSymbolId } from "./GlobalData";
import type { ContentSignalDataType, SymbolEncodingType } from "./index.d";

const testSymbolA = { id: "a", label: "A", composition: 1 };
const testSymbolB = { id: "b", label: "B", composition: 2 };
const testSymbolC = { id: "c", label: "C", composition: 3 };
const combineSymbol = { id: "combine", label: "combine", composition: 233 };

const testInput = (
  payloads: SymbolEncodingType[],
  caretPosition: number
): ContentSignalDataType => ({ payloads, caretPosition });

describe("isCombined", () => {
  it("returns false for empty payloads", () => {
    expect(isCombined([], combineSymbolId)).toBe(false);
  });

  it("returns false for a single combine symbol", () => {
    expect(isCombined([combineSymbol], combineSymbolId)).toBe(false);
  });

  it("returns false for unwrapped combine symbol", () => {
    expect(isCombined([combineSymbol, testSymbolA], combineSymbolId)).toBe(false);
  });

  it("returns true for an array of symbols wrapped in combine symbols", () => {
    expect(isCombined([combineSymbol, testSymbolA, combineSymbol], combineSymbolId)).toBe(true);
  });
});

describe("moveCursor", () => {
  describe("with no combine symbols in payloads", () => {
    it("increments by 1", () => {
      const result = moveCursor(1, testInput([testSymbolA, testSymbolB], -1), combineSymbolId);
      expect(result.caretPosition).toBe(0);
    });

    it("clamps at the upper bound", () => {
      const upperBoundInput = testInput([testSymbolA, testSymbolB], 1);
      const result = moveCursor(1, upperBoundInput, combineSymbolId);
      expect(result).toBe(upperBoundInput);
    });

    it("clamps at the lower bound", () => {
      const result = moveCursor(-1, testInput([testSymbolA, testSymbolB], 0), combineSymbolId);
      expect(result.caretPosition).toBe(-1);
    });

    it("returns the same reference when no movement happens", () => {
      const emptyInput = testInput([], -1);
      expect(moveCursor(1, emptyInput, combineSymbolId)).toBe(emptyInput);
    });
  });

  describe("with a combine symbol in the middle", () => {
    it("goes past it when incrementing", () => {
      const result = moveCursor(1, testInput([testSymbolA, combineSymbol, testSymbolB], 0), combineSymbolId);
      expect(result.caretPosition).toBe(2);
    });

    it("goes past it when decrementing", () => {
      const result = moveCursor(-1, testInput([testSymbolA, combineSymbol, testSymbolB], 2), combineSymbolId);
      expect(result.caretPosition).toBe(0);
    });

    it("goes past multiple consecutive combine symbols", () => {
      const result = moveCursor(1, testInput([testSymbolA, combineSymbol, combineSymbol, testSymbolB], 0), combineSymbolId);
      expect(result.caretPosition).toBe(3);
    });
  });

  describe("in a pair of combine symbols", () => {
    it("disallows the caret from going out of the leading combine", () => {
      const combinedInput = testInput([combineSymbol, testSymbolA, combineSymbol], 1);
      const result = moveCursor(-1, combinedInput, combineSymbolId);
      expect(result).toBe(combinedInput);
    });
			
    it("disallows the caret from going out of the trailing combine", () => {
      const combinedInput = testInput([combineSymbol, testSymbolA, combineSymbol], 1);
      const result = moveCursor(1, combinedInput, combineSymbolId);
      expect(result).toBe(combinedInput);
    });

    it("move normally inside of the combine symbols", () => {
      const result = moveCursor(1, testInput([combineSymbol, testSymbolA, testSymbolB, combineSymbol], 1), combineSymbolId);
      expect(result.caretPosition).toBe(2);
    });
  });
});

describe("deleteAtCaret", () => {
  it("removes the symbol at the caret and move caret back by 1", () => {
    const result = deleteAtCaret(testInput([testSymbolA, testSymbolB, testSymbolC], 1), combineSymbolId);
    expect(result.payloads).toEqual([testSymbolA, testSymbolC]);
    expect(result.caretPosition).toBe(0);
  });

  it("deletes the first symbol and lands the caret at -1", () => {
    const result = deleteAtCaret(testInput([testSymbolA, testSymbolB], 0), combineSymbolId);
    expect(result.payloads).toEqual([testSymbolB]);
    expect(result.caretPosition).toBe(-1);
  });

  it("no effect to the payloads at -1", () => {
    const boundaryInput = testInput([testSymbolA], -1);
    expect(deleteAtCaret(boundaryInput, combineSymbolId)).toBe(boundaryInput);
  });

  it("no effect when payloads is empty", () => {
    const emptyInput = testInput([], -1);
    expect(deleteAtCaret(emptyInput, combineSymbolId)).toBe(emptyInput);
  });

  it("moves the caret back past a single combine symbol", () => {
    const result = deleteAtCaret(testInput([testSymbolA, combineSymbol, testSymbolB], 2), combineSymbolId);
    expect(result.payloads).toEqual([testSymbolA, combineSymbol]);
    expect(result.caretPosition).toBe(0);
  });

  it("move the caret back past multiple combine symbols", () => {
    const result = deleteAtCaret(testInput([testSymbolA, combineSymbol, combineSymbol, testSymbolB], 3), combineSymbolId);
    expect(result.payloads).toEqual([testSymbolA, combineSymbol, combineSymbol]);
    expect(result.caretPosition).toBe(0);
  });

  describe("inside a pair of combines", () => {
    it("moves the caret onto the next symbol when the previous symbol is the combine symbol", () => {
      const result = deleteAtCaret(testInput([combineSymbol, testSymbolA, testSymbolB, combineSymbol], 1), combineSymbolId);
      expect(result.payloads).toEqual([combineSymbol, testSymbolB, combineSymbol]);
      expect(result.caretPosition).toBe(1);
    });

    it("strips the combine entirely when delete empties it", () => {
      const result = deleteAtCaret(testInput([combineSymbol, testSymbolA, combineSymbol], 1), combineSymbolId);
      expect(result.payloads).toEqual([]);
      expect(result.caretPosition).toBe(-1);
    });
  });
});

describe("combineContent", () => {
  it("combines a single symbol and shifts the caret right by 1", () => {
    const result = combineContent(testInput([testSymbolA], 0), combineSymbol);
    expect(result.payloads).toEqual([combineSymbol, testSymbolA, combineSymbol]);
    expect(result.caretPosition).toBe(1);
  });

  it("pulls a caret at -1 inside the combine onto the first symbol", () => {
    const result = combineContent(testInput([testSymbolA], -1), combineSymbol);
    expect(result.payloads).toEqual([combineSymbol, testSymbolA, combineSymbol]);
    expect(result.caretPosition).toBe(1);
  });

  it("no effect on empty payloads", () => {
    const emptyInput = testInput([], -1);
    expect(combineContent(emptyInput, combineSymbol)).toBe(emptyInput);
  });
});

describe("uncombineContent", () => {
  it("removes the boundary combine symbols and shifts the caret back by 1", () => {
    const result = uncombineContent(testInput([combineSymbol, testSymbolA, testSymbolB, combineSymbol], 2), combineSymbolId);
    expect(result.payloads).toEqual([testSymbolA, testSymbolB]);
    expect(result.caretPosition).toBe(1);
  });

  it("no effect when there are no combine symbols", () => {
    const uncombinedInput = testInput([testSymbolA, testSymbolB], 0);
    expect(uncombineContent(uncombinedInput, combineSymbolId)).toBe(uncombinedInput);
  });
});