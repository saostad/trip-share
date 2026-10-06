import { CircleHelp, FileText, Plus, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceSummary } from "@/components/balance/BalanceSummary";
import { PaymentList } from "@/components/balance/PaymentList";
import { SettlementList } from "@/components/balance/SettlementList";
import type {
  Expense,
  Payment,
  SettlementGroup,
  SettlementMethod,
} from "@/types";
import { useTripPage } from "../useTripPage";

export interface MarkPaidTransfer {
  from: string;
  to: string;
  amount: number;
}

export interface SettleTabViewProps {
  expenses: Expense[];
  participants: string[];
  payments: Payment[];
  tripName: string;
  settlementMethod?: SettlementMethod | string | null;
  settlementGroups?: SettlementGroup[];
  isArchived: boolean;
  onMarkPaid: (transfer: MarkPaidTransfer) => void;
  onAddPayment: () => void;
  onEditPayment: (payment: Payment) => void;
  onDeletePayment: (payment: Payment) => void;
  onOpenHelp: () => void;
  onOpenReport: () => void;
  onDownloadExcel: () => void;
}

export function SettleTabView({
  expenses,
  participants,
  payments,
  tripName,
  settlementMethod,
  settlementGroups,
  isArchived,
  onMarkPaid,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
  onOpenHelp,
  onOpenReport,
  onDownloadExcel,
}: SettleTabViewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <BalanceSummary
            expenses={expenses}
            participants={participants}
            payments={payments}
            settlementGroups={settlementGroups}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggested payments</CardTitle>
        </CardHeader>
        <CardContent>
          <SettlementList
            expenses={expenses}
            participants={participants}
            payments={payments}
            tripName={tripName}
            settlementMethod={settlementMethod}
            settlementGroups={settlementGroups}
            archived={isArchived}
            onMarkPaid={onMarkPaid}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment history</CardTitle>
          {!isArchived && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddPayment}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Record Payment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <PaymentList
            payments={payments}
            participants={participants}
            readOnly={isArchived}
            onEdit={isArchived ? undefined : onEditPayment}
            onDelete={isArchived ? undefined : onDeletePayment}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reports &amp; help</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenHelp}
              className="gap-1.5"
            >
              <CircleHelp className="h-3.5 w-3.5" />
              How it works
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDownloadExcel}
              className="gap-1.5"
            >
              <Sheet className="h-3.5 w-3.5" />
              Download Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenReport}
              className="gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              Settlement report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettleTab() {
  const {
    trip,
    expenses,
    payments,
    isArchived,
    openAddPayment,
    openEditPayment,
    openDeletePayment,
    openHelp,
    openReport,
    downloadExcel,
  } = useTripPage();
  return (
    <SettleTabView
      expenses={expenses}
      participants={trip.participants}
      payments={payments}
      tripName={trip.name}
      settlementMethod={trip.settlementMethod}
      settlementGroups={trip.settlementGroups}
      isArchived={isArchived}
      onMarkPaid={(transfer) => openAddPayment(transfer)}
      onAddPayment={() => openAddPayment()}
      onEditPayment={openEditPayment}
      onDeletePayment={openDeletePayment}
      onOpenHelp={openHelp}
      onOpenReport={openReport}
      onDownloadExcel={downloadExcel}
    />
  );
}
