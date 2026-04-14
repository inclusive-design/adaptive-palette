/*
 * Copyright 2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { render, screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { html } from "htm/preact";

import { NO_BCI_AV_ID } from "./SentenceCompletionsPalette";
import { ActionTextCell } from "./ActionTextCell";
import { speak } from "./GlobalUtils";

// Mock the GlobalUtils module so we can spy on the `speak` function
jest.mock("./GlobalUtils", () => ({
  ...jest.requireActual("./GlobalUtils"),
  speak: jest.fn(),
}));

describe("ActionTextCell tests", (): void => {
  const testCell = {
    options: {
      label: "1. Some text to display", // Added a number to test the regex
      rowStart: "3",
      rowSpan: "2",
      columnStart: "2",
      columnSpan: "1",
      bciAvId: NO_BCI_AV_ID
    }
  };
  const TEST_CELL_ID = "unique-test-uuid";

  beforeEach(() => {
    jest.clearAllMocks(); // Reset mocks between tests
  });

  test("Renders correctly with expected attributes and styles", (): void => {
    render(html`
      <${ActionTextCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />
    `);

    // Use getByRole for synchronous renders
    const button = screen.getByRole("button", { name: testCell.options.label });

    // jest-dom specific assertions
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("id", TEST_CELL_ID);
    expect(button).toHaveClass("actionTextCell");

    // toHaveStyle handles CSS parsing better than direct object access
    expect(button).toHaveStyle({
      gridColumn: "2 / span 1",
      gridRow: "3 / span 2"
    });
  });

  test("Calls speak() with sanitized text when clicked", async (): Promise<void> => {
    // Setup userEvent
    const user = userEvent.setup();

    render(html`
      <${ActionTextCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />
    `);

    const button = screen.getByRole("button", { name: testCell.options.label });
    
    // Simulate a user clicking the button
    await user.click(button);

    // Verify speak was called, and that the leading "1. " was stripped out
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith("Some text to display");
  });
});
