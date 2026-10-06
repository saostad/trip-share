import { InfoTip } from "@/components/InfoTip";
import {
  SETTLEMENT_METHODS,
  settlementMethodDescription,
  settlementMethodLabel,
} from "@/lib/balances";

/** One line per method, shared by the picker legend and the People tab. */
export function MethodExplainer() {
  return (
    <InfoTip
      term="payment suggestions"
      title="How are payments suggested?"
      body={
        <span className="space-y-1">
          {SETTLEMENT_METHODS.map((method) => (
            <span key={method} className="block">
              <span className="font-medium text-foreground">
                {settlementMethodLabel(method)}:
              </span>{" "}
              {settlementMethodDescription(method)}
            </span>
          ))}
        </span>
      }
    />
  );
}

export function GroupsExplainer() {
  return (
    <InfoTip
      term="paying as a group"
      title="Paying as a group"
      body="People in a group settle as one. A couple or family pays or receives a single combined amount, shown under one name."
    />
  );
}
