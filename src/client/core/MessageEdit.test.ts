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

import { changeEncodingContents } from "../state/GlobalData";
import { editMessage, setEditGuard } from "./MessageEdit";
import type { ContentSignalDataType } from "../index.d";

describe("editMessage()", (): void => {

  const contents = (label: string): ContentSignalDataType => ({
    payloads: [{ label, composition: [124], modifierInfo: [] }],
    caretPosition: 0
  });

  beforeEach((): void => {
    setEditGuard(null);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  afterEach((): void => {
    setEditGuard(null);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("With no guard registered the edit is published", (): void => {
    const next = contents("me");
    editMessage(next);
    expect(changeEncodingContents.value).toBe(next);
  });

  test("An edit the guard allows is published", (): void => {
    setEditGuard(() => false);
    editMessage(contents("me"));
    expect(changeEncodingContents.value.payloads[0].label).toBe("me");
  });

  test("An edit the guard holds is not published", (): void => {
    editMessage(contents("me"));
    setEditGuard(() => true);
    editMessage(contents("later"));
    expect(changeEncodingContents.value.payloads[0].label).toBe("me");
  });

  test("The guard is offered the edit it is deciding about", (): void => {
    const seen: string[] = [];
    setEditGuard((next): boolean => {
      seen.push(next.payloads[0].label);
      return true;
    });
    editMessage(contents("later"));
    expect(seen).toEqual(["later"]);
  });

  // The guard may keep a held edit and apply it when the user agrees, so it has to be frozen
  // before the guard sees it, not after the write.
  test("A held edit is frozen too", (): void => {
    let held: ContentSignalDataType | null = null;
    setEditGuard((next): boolean => {
      held = next;
      return true;
    });
    editMessage(contents("later"));
    expect(Object.isFrozen(held)).toBe(true);
  });

  test("The published symbols cannot be replaced in place", (): void => {
    editMessage(contents("me"));
    const { payloads } = changeEncodingContents.value;
    expect(() => {
      payloads[0] = { label: "you", composition: [125], modifierInfo: [] };
    }).toThrow();
  });

  test("A published symbol cannot be edited in place", (): void => {
    editMessage(contents("me"));
    const payload = changeEncodingContents.value.payloads[0];
    expect(() => {
      payload.label = "you";
    }).toThrow();
  });

  test("A published modifier cannot be edited in place", (): void => {
    editMessage({
      payloads: [{
        label: "big me",
        composition: [124],
        modifierInfo: [{ modifierId: [130], modifierGloss: "big", isPrepended: true }]
      }],
      caretPosition: 0
    });
    const modifier = changeEncodingContents.value.payloads[0].modifierInfo?.[0];
    expect(() => {
      modifier!.modifierGloss = "small";
    }).toThrow();
  });

  test("A published symbol's modifiers cannot be added to in place", (): void => {
    editMessage(contents("me"));
    const payload = changeEncodingContents.value.payloads[0];
    expect(() => {
      payload.modifierInfo?.push({ modifierId: [130], modifierGloss: "big", isPrepended: true });
    }).toThrow();
  });

  // Every writer copies a composition before changing it, and the frozen payload already
  // refuses `payload.composition = ...`, so freezing it as well buys nothing.
  test("A published symbol's composition is left unfrozen", (): void => {
    editMessage(contents("me"));
    expect(Object.isFrozen(changeEncodingContents.value.payloads[0].composition)).toBe(false);
  });

  // What a guard does when the user agrees to a held edit: offer it again. It was frozen the
  // first time through, and freezing it a second time must not throw.
  test("An edit that has already been through the gate can be published", (): void => {
    let held: ContentSignalDataType | null = null;
    setEditGuard((next): boolean => {
      held = next;
      return true;
    });
    editMessage(contents("later"));
    setEditGuard(null);

    editMessage(held as unknown as ContentSignalDataType);

    expect(changeEncodingContents.value.payloads[0].label).toBe("later");
  });

  test("Registering a guard replaces the one before it", (): void => {
    const asked: string[] = [];
    setEditGuard((): boolean => {
      asked.push("first");
      return true;
    });
    setEditGuard((): boolean => {
      asked.push("second");
      return true;
    });
    editMessage(contents("me"));
    expect(asked).toEqual(["second"]);
  });
});
