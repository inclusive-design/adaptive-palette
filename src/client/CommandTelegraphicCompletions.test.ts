/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { render, screen } from "@testing-library/preact";
import "@testing-library/jest-dom";
import { html } from "htm/preact";

import {
  CommandTelegraphicCompletions, TELEGRPAHIC_BUTTON_LABEL, CANCEL_BUTTON_LABEL
} from "./CommandTelegraphicCompletions";

describe("CommandTelegraphicCompletions component", (): void => {

  test("Render telegraphic buttons", async(): Promise<void> => {
    render(html`
      <${CommandTelegraphicCompletions} model="llama3.1:latest" stream=false />`
    );
    const triggerButton = await screen.findByText(TELEGRPAHIC_BUTTON_LABEL);
    expect(triggerButton).toBeInTheDocument();
    expect(triggerButton).toBeInstanceOf(HTMLButtonElement);

    const cancelButton = await screen.findByText(CANCEL_BUTTON_LABEL);
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toBeInstanceOf(HTMLButtonElement);
  });
});
