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
 * Global message handler
 * 
 * Provides API for:
 * 1. Dispatching messages with defined type and payload.
 * 2. Subscribing to handler functions for specific message types.
 */

import { signal, effect } from "@preact/signals";

type MessageType = {
  type: string,
  payload: any
};

const msgSignal = signal<MessageType>(undefined);

const listeners = new Map<string, Array<(payload: any) => void>>();

effect(() => {
  const msg = msgSignal.value;
  
  const callbacks = listeners.get(msg?.type);
  if(callbacks) {
    callbacks.forEach(callback => {
      callback(msg.payload);
    });
  }
});

// API to dispatch a message with payload
export const dispatchMessage = (type: string, payload: any) => {
  msgSignal.value = {
    type,
    payload
  };
};

// API to subscribe the call back function for a message type
export const onMessage = (type: string, callback: (payload: any) => void) => {
  const callbacks = listeners.get(type);
  if(callbacks) {
    callbacks.push(callback);
  } else {
    listeners.set(type, [callback]);
  }
};
