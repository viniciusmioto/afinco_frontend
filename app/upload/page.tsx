import { AppShell } from "@/components/layout/app-shell";
import { StatementUploadPage } from "@/components/statements/statement-upload-page";

export default function UploadRoute() {
  return (
    <AppShell current="Import">
      <StatementUploadPage />
    </AppShell>
  );
}
