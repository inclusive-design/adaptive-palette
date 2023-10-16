/*
 * Copyright 2023 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { dispatchMessage, onMessage } from "./GlobalMessageHandler";

test("The message handler can dispatch, receive and handle non-undefined messages correctly", async () => {
  dispatchMessage("testMsg", {
    count: 0
  });

  onMessage("testMsg", (payload) => {
    expect(payload).toEqual({count: 0});
    payload.count++;
    expect(payload.value).toBe(1);
  });
});

test("The message handler can dispatch and receive null messages correctly", async () => {
  dispatchMessage("nullMsg", null);

  onMessage("nullMsg", (payload) => {
    expect(payload).toEqual(null);
  });
});
