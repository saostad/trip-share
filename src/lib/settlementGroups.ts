import type { SettlementGroup } from "@/types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** New group id (browser / node safe). */
export function newSettlementGroupId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Sanitize groups against the current participant list.
 * - Drop unknown members
 * - Ensure representative is in members (fallback: first member)
 * - Drop empty groups / blank names
 * - A person may belong to at most one group (first wins)
 */
export function sanitizeSettlementGroups(
  groups: SettlementGroup[] | null | undefined,
  participants: string[],
): SettlementGroup[] {
  if (!groups?.length) return [];
  const participantSet = new Set(participants);
  const claimed = new Set<string>();
  const result: SettlementGroup[] = [];

  for (const g of groups) {
    const name = (g.name ?? "").trim();
    if (!name) continue;

    const members: string[] = [];
    for (const m of g.members ?? []) {
      if (!participantSet.has(m)) continue;
      if (claimed.has(m)) continue;
      claimed.add(m);
      members.push(m);
    }
    if (members.length === 0) continue;

    let representative = g.representative;
    if (!members.includes(representative)) {
      representative = members[0];
    }

    result.push({
      id: g.id || newSettlementGroupId(),
      name,
      members,
      representative,
    });
  }

  return result;
}

export function hasUsableSettlementGroups(
  groups: SettlementGroup[] | null | undefined,
): boolean {
  return (groups?.length ?? 0) > 0;
}

/** Map participant name → representative (or self if ungrouped). */
export function buildRepresentativeMap(
  groups: SettlementGroup[],
  participants: string[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of participants) map[p] = p;
  for (const g of groups) {
    for (const m of g.members) {
      map[m] = g.representative;
    }
  }
  return map;
}

/** Map representative → group (if any). */
export function buildGroupByRepresentative(
  groups: SettlementGroup[],
): Record<string, SettlementGroup> {
  const map: Record<string, SettlementGroup> = {};
  for (const g of groups) {
    map[g.representative] = g;
  }
  return map;
}

/**
 * Collapse individual net balances into group representatives.
 * Ungrouped people keep their own balance under their own name.
 */
export function collapseBalancesForGroups(
  balances: Record<string, number>,
  groups: SettlementGroup[],
): Record<string, number> {
  if (!groups.length) return { ...balances };

  const collapsed: Record<string, number> = {};
  const memberOf = new Map<string, SettlementGroup>();
  for (const g of groups) {
    for (const m of g.members) memberOf.set(m, g);
  }

  for (const [name, bal] of Object.entries(balances)) {
    const g = memberOf.get(name);
    const key = g ? g.representative : name;
    collapsed[key] = round2((collapsed[key] ?? 0) + bal);
  }

  return collapsed;
}

/**
 * Remap pairwise (or any) transfers onto representatives and net
 * opposite edges between the same pair.
 */
export function collapseTransfersToRepresentatives(
  transfers: { from: string; to: string; amount: number }[],
  repMap: Record<string, string>,
): { from: string; to: string; amount: number }[] {
  const THRESHOLD = 0.01;
  /** Canonical key a|b with a < b; positive means a pays b */
  const net = new Map<string, number>();

  function add(from: string, to: string, amount: number) {
    if (!from || !to || from === to || amount <= 0) return;
    const a = from < to ? from : to;
    const b = from < to ? to : from;
    const sign = from < to ? 1 : -1;
    const key = `${a}\0${b}`;
    net.set(key, (net.get(key) ?? 0) + sign * amount);
  }

  for (const t of transfers) {
    const from = repMap[t.from] ?? t.from;
    const to = repMap[t.to] ?? t.to;
    add(from, to, t.amount);
  }

  const out: { from: string; to: string; amount: number }[] = [];
  for (const [key, raw] of net.entries()) {
    const amount = round2(raw);
    if (Math.abs(amount) < THRESHOLD) continue;
    const [a, b] = key.split("\0");
    if (amount > 0) out.push({ from: a, to: b, amount: Math.abs(amount) });
    else out.push({ from: b, to: a, amount: Math.abs(amount) });
  }

  out.sort((x, y) => y.amount - x.amount || x.from.localeCompare(y.from));
  return out;
}

export function groupLabelForPerson(
  person: string,
  groups: SettlementGroup[],
): string | null {
  for (const g of groups) {
    if (g.members.includes(person) || g.representative === person) {
      return g.name;
    }
  }
  return null;
}
