import { describe, expect, it, vi } from "vitest";

vi.mock("xlsx", () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    aoa_to_sheet: vi.fn(() => ({})),
  },
  writeFile: vi.fn(),
}));

import * as XLSX from "xlsx";
import { downloadTripExcel } from "./exportTripExcel";

describe("downloadTripExcel", () => {
  it("loads xlsx dynamically and writes the expected filename", async () => {
    await downloadTripExcel(
      {
        id: "t1",
        name: "Test Trip",
        participants: ["Ava", "Liam"],
        participantLinks: {},
        settlementMethod: "greedy",
      },
      [],
      [],
    );

    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "Test-Trip-trip-export.xlsx",
    );
  });
});
