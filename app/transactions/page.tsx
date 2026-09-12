import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { TransactionsPage } from "@/components/transactions/transactions-page";

export default function TransactionsRoute() {
  return (
    <AppShell>
      {/* The ledger reads its statement or month from the URL, which requires a Suspense boundary. */}
      <Suspense>
        <TransactionsPage />
      </Suspense>
    </AppShell>
  );
}
