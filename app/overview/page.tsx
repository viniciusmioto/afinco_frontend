import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { OverviewPage } from "@/components/overview/overview-page";

export default function OverviewRoute() {
  return (
    <AppShell current="Overview">
      {/* The dashboard keeps its filters in the URL, which requires a Suspense boundary. */}
      <Suspense>
        <OverviewPage />
      </Suspense>
    </AppShell>
  );
}
