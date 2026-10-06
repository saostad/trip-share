import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAddedIds } from "./useAddedIds";

describe("useAddedIds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("flags new ids and clears them after ~1.3s", () => {
    const { result, rerender } = renderHook(
      ({ items }) => useAddedIds(items),
      { initialProps: { items: [{ id: "a" }] } },
    );
    expect(result.current.size).toBe(0);

    rerender({ items: [{ id: "a" }, { id: "b" }] });
    expect(result.current.has("b")).toBe(true);

    act(() => vi.advanceTimersByTime(1300));
    expect(result.current.size).toBe(0);
  });

  it("still clears when a same-id array arrives before the timer fires", () => {
    const { result, rerender } = renderHook(
      ({ items }) => useAddedIds(items),
      { initialProps: { items: [{ id: "a" }] } },
    );
    rerender({ items: [{ id: "a" }, { id: "b" }] });
    expect(result.current.has("b")).toBe(true);

    // Firestore re-sends the same ids as a new array (local snapshot,
    // then the server-confirmed one).
    rerender({ items: [{ id: "a" }, { id: "b" }] });

    act(() => vi.advanceTimersByTime(1300));
    expect(result.current.size).toBe(0);
  });
});
