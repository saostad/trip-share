import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_SETTLEMENT_METHOD,
  SETTLEMENT_METHODS,
  settlementMethodDescription,
  settlementMethodLabel,
} from "@/lib/balances";
import { cn } from "@/lib/utils";
import type { SettlementMethod } from "@/types";
import { MethodExplainer } from "./settlementExplainers";

export interface SettlementMethodPickerProps {
  value: SettlementMethod;
  onChange: (method: SettlementMethod) => void;
  name?: string;
}

export function SettlementMethodPicker({
  value,
  onChange,
  name = "settlement-method",
}: SettlementMethodPickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-1 text-sm font-medium leading-none">
        How payments are suggested
        <MethodExplainer />
      </legend>
      <div className="space-y-2">
        {SETTLEMENT_METHODS.map((method) => (
          <label
            key={method}
            className={cn(
              "flex cursor-pointer gap-3 rounded-lg border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              value === method
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/40",
            )}
          >
            <input
              type="radio"
              name={name}
              value={method}
              checked={value === method}
              onChange={() => onChange(method)}
              className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-none"
            />
            <span>
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {settlementMethodLabel(method)}
                {method === DEFAULT_SETTLEMENT_METHOD && (
                  <Badge variant="primary">Recommended</Badge>
                )}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {settlementMethodDescription(method)}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
