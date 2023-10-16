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

/**
 * Global message handler: pass and handle messages among components
 * 
 * This handler defines an internal Preact signal `msgSignal` to register one message
 * at a time. It also defines a map structure `msgListeners` to track the mapping
 * between every message type and their callback functions. When the value of `msgSignal`
 * changes, the function subscribed via `effect()` finds all call back functions for 
 * the given type and execute them.
 * 
 * Provided API::
 * 1. dispatchMessage: Dispatching messages with defined type and payload.
 * 2. onMessage: Subscribing to handler functions for specific message types.
 */

import { signal, effect } from "@preact/signals";

// The data structure of the message defined in typescript
type MessageType = {
  type: string,
  payload: any
};

// The message signal with its intiial value `undefined`
const msgSignal = signal<MessageType>(undefined);

// The map that tracks the mapping between every message type and their callback functions
const msgListeners = new Map<string, Array<(payload: any) => void>>();

// Call effect() to subscribe a handler function when the value of `msgSignal` is changed
effect(() => {
  const msg = msgSignal.value;
  
  const callbacks = msgListeners.get(msg?.type);
  if(callbacks) {
    callbacks.forEach(callback => {
      callback(msg.payload);
    });
  }
});

// API to dispatch a message with its type and payload
export const dispatchMessage = (type: string, payload: any) => {
  msgSignal.value = {
    type,
    payload
  };
};

// API to subscribe a callback function for a specific message type
export const onMessage = (type: string, callback: (payload: any) => void) => {
  const callbacks = msgListeners.get(type);
  if(callbacks) {
    callbacks.push(callback);
  } else {
    msgListeners.set(type, [callback]);
  }
};
