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

import { vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { html } from "htm/preact";

import { MatchType } from "../index.d";
import { GlossSearchResults } from "./GlossSearchResults";

// Real entries from `public/data/bliss_symbol_explanations.json`, so the symbols
// actually render. "dog" has no `composition` of its own, which exercises the
// `match.composition ?? match.id` fallback in the component.
const MATCHES: MatchType[] = [
  { id: 124, bciAvId: 12380, label: "dog, canine (animal), canid" },
  { id: 1828, bciAvId: 14902, label: "hot dog, frankfurter", composition: [570, "/", 329, "/", 122, "/", 420] },
  { id: 3177, bciAvId: 21874, label: "dog sled", composition: [598, "/", 124] }
];

describe("GlossSearchResults", () => {

  afterEach(() => {
    cleanup();
  });

  test("renders one button per match, labelled by its gloss", () => {
    render(html`
      <${GlossSearchResults} matches=${MATCHES} selectedId=${null} onSelect=${() => {}} />
    `);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("button", { name: /dog sled/ })).toBeInTheDocument();
  });

  test("renders nothing but an empty grid when there are no matches", () => {
    render(html`
      <${GlossSearchResults} matches=${[]} selectedId=${null} onSelect=${() => {}} />
    `);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  test("marks only the selected match as pressed", () => {
    render(html`
      <${GlossSearchResults} matches=${MATCHES} selectedId=${1828} onSelect=${() => {}} />
    `);
    const selected = screen.getByRole("button", { name: /hot dog/ });
    const other = screen.getByRole("button", { name: /dog sled/ });

    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(other).toHaveAttribute("aria-pressed", "false");
  });

  test("clicking a match reports it to the parent", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(html`
      <${GlossSearchResults} matches=${MATCHES} selectedId=${null} onSelect=${onSelect} />
    `);

    await user.click(screen.getByRole("button", { name: /hot dog/ }));
    expect(onSelect).toHaveBeenCalledWith(MATCHES[1]);
  });

  // The search dialog clears the selection after each add, so clicking a result that is
  // currently marked must still report. A short-circuit on `isSelected` would break that.
  test("clicking an already-selected match still reports it", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(html`
      <${GlossSearchResults} matches=${MATCHES} selectedId=${1828} onSelect=${onSelect} />
    `);

    await user.click(screen.getByRole("button", { name: /hot dog/ }));
    expect(onSelect).toHaveBeenCalledWith(MATCHES[1]);
  });
});
