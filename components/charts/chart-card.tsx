import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ChartCard({
  title,
  titleId,
  description,
  actions,
  children,
}: {
  title: string;
  titleId: string;
  description: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={titleId} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <div className="mb-4">
        {/* Actions drop below the title when both do not fit on one line. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="font-semibold tracking-tight text-slate-950" id={titleId}>{title}</h2>
          {actions}
        </div>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

/** Chart / table switch; the table is the accessible twin of every chart. */
export function ViewToggle({
  showTable,
  onChange,
  chartIcon: ChartIcon,
  tableIcon: TableIcon,
}: {
  showTable: boolean;
  onChange: (showTable: boolean) => void;
  chartIcon: LucideIcon;
  tableIcon: LucideIcon;
}) {
  const option = (table: boolean, Icon: LucideIcon, label: string) => (
    <button
      aria-label={label}
      aria-pressed={showTable === table}
      className={`focus-ring grid size-8 place-items-center rounded-md transition ${
        showTable === table ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
      }`}
      onClick={() => onChange(table)}
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
  return (
    <div className="flex shrink-0 gap-0.5 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Display as">
      {option(false, ChartIcon, "Show chart")}
      {option(true, TableIcon, "Show table")}
    </div>
  );
}
