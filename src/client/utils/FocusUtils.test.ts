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

import { firstOwnControl } from "./FocusUtils";

describe("firstOwnControl", (): void => {
  let page: HTMLElement;

  beforeEach((): void => {
    page = document.createElement("div");
    page.innerHTML = `
      <div data-palettename="Screen">
        <div class="paletteInclude"><button>header</button></div>
        <button inert>covered</button>
        <button>own</button>
      </div>`;
    document.body.append(page);
  });

  afterEach((): void => {
    page.remove();
  });

  test("skips the included palettes and the cells under the sentence layer", (): void => {
    expect(firstOwnControl("Screen")?.textContent).toBe("own");
  });

  test("finds nothing for a palette that is not on the page", (): void => {
    expect(firstOwnControl("Nowhere")).toBeNull();
  });
});
