import type { SettlementViewMode } from "@/types";

interface ViewModeToggleProps {
  value: SettlementViewMode;
  onChange: (mode: SettlementViewMode) => void;
  ariaLabel: string;
}

/**
 * Segmented By group / By person control, shared by the Settle cards and
 * the Overview hero. The radios expand their tap area to 44 px tall via
 * an ::after overlay (the visible button is 24 px).
 */
export function ViewModeToggle({ value, onChange, ariaLabel }: ViewModeToggleProps) {
  return (
    <div
      className="inline-flex rounded-md border border-border p-0.5 text-xs"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === "group"}
        className={`relative rounded px-2.5 py-1 outline-none transition-colors after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring ${
          value === "group"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => onChange("group")}
      >
        By group
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "person"}
        className={`relative rounded px-2.5 py-1 outline-none transition-colors after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring ${
          value === "person"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => onChange("person")}
      >
        By person
      </button>
    </div>
  );
}
