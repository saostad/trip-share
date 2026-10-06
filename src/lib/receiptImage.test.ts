import { describe, expect, it } from "vitest";
import { targetSize } from "./receiptImage";

describe("targetSize", () => {
  it("scales a landscape photo to a 1600px long side", () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
  });

  it("scales a portrait photo to a 1600px long side", () => {
    expect(targetSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it("leaves smaller images unchanged", () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(targetSize(1600, 1200)).toEqual({ width: 1600, height: 1200 });
  });

  it("returns zero for degenerate input", () => {
    expect(targetSize(0, 100)).toEqual({ width: 0, height: 0 });
    expect(targetSize(-5, 100)).toEqual({ width: 0, height: 0 });
    expect(targetSize(100, 100, 0)).toEqual({ width: 0, height: 0 });
  });
});
