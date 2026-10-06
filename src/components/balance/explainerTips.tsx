import { InfoTip } from "@/components/InfoTip";

export function BalancesExplainer({ open }: { open?: boolean }) {
  return (
    <InfoTip
      term="your balance"
      title="Gets back and owes"
      body="“Gets back” is money that should come back to you. “Owes” is money you still need to pay. Both come from what everyone paid, minus their fair share."
      defaultOpen={open}
    />
  );
}

export function SuggestedPaymentsExplainer({ open }: { open?: boolean }) {
  return (
    <InfoTip
      term="suggested payments"
      title="Why so few payments?"
      body="TripShare looks at everyone's final balance instead of repaying each expense one by one, so debts in opposite directions cancel out."
      defaultOpen={open}
    />
  );
}

export function MarkPaidExplainer({ open }: { open?: boolean }) {
  return (
    <InfoTip
      term="mark as paid"
      title="Mark as paid"
      body="Records this payment so balances update."
      defaultOpen={open}
    />
  );
}
