import { describe, expect, it } from "vitest";
import type { SettlementGroup } from "@/types";
import {
  buildRepresentativeMap,
  collapseBalancesForGroups,
  collapseTransfersToRepresentatives,
  sanitizeSettlementGroups,
} from "./settlementGroups";
import { computeSettlements } from "./balances";
import { Timestamp } from "firebase/firestore";
import type { Expense } from "@/types";

const makeExpense = (
  overrides: Partial<Expense> & Pick<Expense, "amount" | "paidBy" | "sharedBy">,
): Expense => ({
  id: "e1",
  description: "Test",
  date: "2024-01-01",
  createdAt: Timestamp.now(),
  ...overrides,
});

describe("sanitizeSettlementGroups", () => {
  it("drops unknown members and fixes representative", () => {
    const groups: SettlementGroup[] = [
      {
        id: "g1",
        name: "Family",
        members: ["Saeid", "Wife", "Ghost"],
        representative: "Ghost",
      },
    ];
    const result = sanitizeSettlementGroups(groups, ["Saeid", "Wife", "Bob"]);
    expect(result).toHaveLength(1);
    expect(result[0].members).toEqual(["Saeid", "Wife"]);
    expect(result[0].representative).toBe("Saeid");
  });

  it("ensures a person is in at most one group", () => {
    const groups: SettlementGroup[] = [
      { id: "g1", name: "A", members: ["X", "Y"], representative: "X" },
      { id: "g2", name: "B", members: ["Y", "Z"], representative: "Z" },
    ];
    const result = sanitizeSettlementGroups(groups, ["X", "Y", "Z"]);
    expect(result[0].members).toEqual(["X", "Y"]);
    expect(result[1].members).toEqual(["Z"]);
  });
});

describe("collapseBalancesForGroups", () => {
  it("sums family members onto the representative", () => {
    const balances = { Saeid: 40, Wife: -10, Son: -5, Bob: -15, Carol: -10 };
    const groups: SettlementGroup[] = [
      {
        id: "g1",
        name: "Family",
        members: ["Saeid", "Wife", "Son"],
        representative: "Saeid",
      },
    ];
    const collapsed = collapseBalancesForGroups(balances, groups);
    expect(collapsed.Saeid).toBeCloseTo(25);
    expect(collapsed.Bob).toBeCloseTo(-15);
    expect(collapsed.Carol).toBeCloseTo(-10);
    expect(collapsed.Wife).toBeUndefined();
    expect(collapsed.Son).toBeUndefined();
  });
});

describe("collapseTransfersToRepresentatives", () => {
  it("nets opposite edges between the same reps", () => {
    const repMap = buildRepresentativeMap(
      [
        {
          id: "g1",
          name: "Family",
          members: ["Saeid", "Wife"],
          representative: "Saeid",
        },
      ],
      ["Saeid", "Wife", "Bob"],
    );
    const out = collapseTransfersToRepresentatives(
      [
        { from: "Bob", to: "Wife", amount: 20 },
        { from: "Wife", to: "Bob", amount: 5 },
      ],
      repMap,
    );
    expect(out).toHaveLength(1);
    expect(out[0].from).toBe("Bob");
    expect(out[0].to).toBe("Saeid");
    expect(out[0].amount).toBeCloseTo(15);
  });
});

describe("computeSettlements group mode", () => {
  it("settles outsiders only with the family representative", () => {
    const expenses = [
      makeExpense({
        amount: 100,
        paidBy: "Saeid",
        sharedBy: ["Saeid", "Wife", "Son", "Bob"],
      }),
    ];
    const groups: SettlementGroup[] = [
      {
        id: "g1",
        name: "Family",
        members: ["Saeid", "Wife", "Son"],
        representative: "Saeid",
      },
    ];
    const personMode = computeSettlements(
      "greedy",
      expenses,
      ["Saeid", "Wife", "Son", "Bob"],
      [],
      { groupMode: false, groups },
    );
    expect(personMode.length).toBeGreaterThan(1);

    const groupMode = computeSettlements(
      "greedy",
      expenses,
      ["Saeid", "Wife", "Son", "Bob"],
      [],
      { groupMode: true, groups },
    );
    expect(groupMode).toHaveLength(1);
    expect(groupMode[0].from).toBe("Bob");
    expect(groupMode[0].to).toBe("Saeid");
    expect(groupMode[0].amount).toBeCloseTo(25);
  });
});
