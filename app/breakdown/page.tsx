import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { BreakdownPage } from "@/components/breakdown/breakdown-page";

export default function BreakdownRoute() {
  return (
    <AppShell current="Breakdown">
      {/* The page reads its statement or month from the URL, which requires a Suspense boundary. */}
      <Suspense>
        <BreakdownPage />
      </Suspense>
    </AppShell>
  );
}
