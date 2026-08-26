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

import { effect } from "@preact/signals";
import {
  selectedAttributesSignal, toggleAttribute, clearAttributes, attributesPromptText,
  isAttributeSelected
} from "./MessageAttributesState";

describe("MessageAttributesState", (): void => {

  const question = { category: "Intent", label: "question", composition: 553 };
  const urgent = { category: "Priority", label: "urgent", composition: 4310 };
  const angry = { category: "Feeling", label: "angry", composition: 1198 };

  beforeEach((): void => {
    clearAttributes();
  });

  test("nothing is selected to begin with", (): void => {
    expect(selectedAttributesSignal.value).toEqual([]);
    expect(attributesPromptText()).toBe("");
  });

  test("toggling an attribute on adds it, and off removes it", (): void => {
    toggleAttribute(question);
    expect(selectedAttributesSignal.value).toEqual([question]);

    toggleAttribute(question);
    expect(selectedAttributesSignal.value).toEqual([]);
  });

  test("an attribute is matched by category and label, not by object identity", (): void => {
    toggleAttribute(question);
    toggleAttribute({ category: "Intent", label: "question", composition: 553 });
    expect(selectedAttributesSignal.value).toEqual([]);
  });

  test("several attributes from one category are allowed", (): void => {
    toggleAttribute(angry);
    toggleAttribute({ category: "Feeling", label: "tired", composition: 2605 });
    expect(selectedAttributesSignal.value.map((attribute) => attribute.label))
      .toEqual(["angry", "tired"]);
  });

  test("clearing removes everything", (): void => {
    toggleAttribute(question);
    toggleAttribute(urgent);
    clearAttributes();
    expect(selectedAttributesSignal.value).toEqual([]);
  });

  test("an attribute reports selected only while it is set", (): void => {
    expect(isAttributeSelected(question)).toBe(false);
    toggleAttribute(question);
    expect(isAttributeSelected({ ...question })).toBe(true);
  });

  test("toggling one attribute off leaves the others in their original order", (): void => {
    toggleAttribute(question);
    toggleAttribute(angry);
    toggleAttribute(urgent);
    toggleAttribute(angry);
    expect(selectedAttributesSignal.value).toEqual([question, urgent]);
  });

  test("the prompt text groups by category, in palette order", (): void => {
    // Selected out of palette order to prove the output is not selection order.
    toggleAttribute(urgent);
    toggleAttribute(angry);
    toggleAttribute(question);
    expect(attributesPromptText()).toBe("Intent: question; Feeling: angry; Priority: urgent");
  });

  test("several attributes in one category are joined with a comma", (): void => {
    toggleAttribute(angry);
    toggleAttribute({ category: "Feeling", label: "tired", composition: 2605 });
    expect(attributesPromptText()).toBe("Feeling: angry, tired");
  });

  test("a category the palette does not list is reported after the ones it does", (): void => {
    toggleAttribute(question);
    toggleAttribute({ category: "Invented", label: "made up", composition: 553 });
    expect(attributesPromptText()).toBe("Intent: question; Invented: made up");
  });

  test("clearing when nothing is selected does not wake subscribers", (): void => {
    let runs = 0;
    const stop = effect((): void => {
      const current = selectedAttributesSignal.value;
      if (current.length >= 0) {
        runs++;
      }
    });
    clearAttributes();
    expect(runs).toBe(1);
    // A real change must wake it, or the assertion above would also pass for an effect
    // that never subscribed.
    toggleAttribute(question);
    expect(runs).toBe(2);
    stop();
  });
});
