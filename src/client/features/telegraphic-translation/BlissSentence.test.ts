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

import { render } from "@testing-library/preact";
import { html } from "htm/preact";
import { BlissSentence } from "./BlissSentence";
import { saveMessageRecord } from "../../core/MessageLog";
import { initSvgCompositeDefinitions } from "../../utils/SvgUtils";
import { resetMessageLog } from "../../testUtils/MessageLogTestUtils";
import { testPicture } from "../../testUtils/CellTestUtils";

describe("BlissSentence", (): void => {

  beforeAll((): void => {
    initSvgCompositeDefinitions();
  });

  beforeEach(async (): Promise<void> => {
    await resetMessageLog();
  });

  test("draws the picture of a picture word the user has used before", (): void => {
    saveMessageRecord([{ label: "bread", picture: testPicture(), modifierInfo: [] }]);

    const { container } = render(html`<${BlissSentence} sentence="I want bread" language="en" />`);

    const slot = [...container.querySelectorAll(".blissSentenceSlot")].find((s) => s.textContent === "bread");
    expect(slot?.querySelector("img")?.getAttribute("src")).toBe(testPicture());
  });
});
