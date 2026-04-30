/*
 * Copyright 2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { generateGridStyle, clamp } from "./GlobalUtils";

describe("Test global utility functions", (): void => {

  test("Test generateGridStyle()", (): void => {
    // All values provided
    expect(generateGridStyle(2, 1, 3, 2)).toBe("grid-column: 2 / span 1;grid-row: 3 / span 2;");
    
    // All values explicitly undefined. Expect an empty string
    expect(generateGridStyle(undefined, undefined, undefined, undefined)).toBe("");
    
    // No values provided because parameters are optional
    expect(generateGridStyle()).toBe("");

    // Only columnStart provided
    expect(generateGridStyle(2, undefined, undefined, undefined)).toBe("grid-column: 2;");

    // Only columnSpan provided
    expect(generateGridStyle(undefined, 3, undefined, undefined)).toBe("grid-column: span 3;");

    // Only rowStart provided
    expect(generateGridStyle(undefined, undefined, 4, undefined)).toBe("grid-row: 4;");

    // Only rowSpan provided
    expect(generateGridStyle(undefined, undefined, undefined, 5)).toBe("grid-row: span 5;");

    // Mixed variations (e.g., columnStart and rowSpan only)
    expect(generateGridStyle(2, undefined, undefined, 5)).toBe("grid-column: 2;grid-row: span 5;");

    // Mixed variations (e.g., columnSpan and rowStart only)
    expect(generateGridStyle(undefined, 3, 4, undefined)).toBe("grid-column: span 3;grid-row: 4;");
  });

  test("Test clamp function where value is below min", (): void => {
    expect(clamp(-1, 0, 1)).toBe(0);
  });

  test("Test clamp function where value is above max", (): void => {
    expect(clamp(2, 0, 1)).toBe(1);
  });

  test("Test clamp function where value is in range", (): void => {
    expect(clamp(1, 0, 2)).toBe(1);
  });
});
