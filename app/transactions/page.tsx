import { AppShell } from "@/components/layout/app-shell";
import { TransactionsPage } from "@/components/transactions/transactions-page";

export default function TransactionsRoute() {
  return (
    <AppShell>
      <TransactionsPage />
    </AppShell>
  );
}
