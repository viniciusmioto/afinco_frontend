import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  Landmark,
  Upload,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { UserControls } from "@/components/auth/user-controls";

const navigation = [
  { label: "Overview", icon: ChartNoAxesCombined, href: null },
  { label: "Transactions", icon: ArrowLeftRight, href: "/transactions" },
  { label: "Import", icon: Upload, href: "/upload" },
  { label: "Accounts", icon: Landmark, href: null },
];

export function AppShell({ children, current = "Transactions" }: { children: ReactNode; current?: string }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-800 bg-ink px-5 py-7 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
          <div className="flex items-center gap-3 px-2">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-700 shadow-lg shadow-blue-950/30">
              <WalletCards aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight">Afinco</p>
              <p className="text-xs text-slate-400">Personal finance</p>
            </div>
          </div>

          <nav aria-label="Main navigation" className="mt-10 space-y-1.5">
            {navigation.map(({ label, icon: Icon, href }) => {
              const active = label === current;
              const className = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                active ? "bg-slate-800 text-white" : "text-slate-400"
              }`;
              const content = (
                <>
                  <Icon aria-hidden="true" className="size-[18px]" />
                  {label}
                </>
              );

              return href ? (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`focus-ring ${className} transition hover:bg-slate-800/70 hover:text-white`}
                  href={href}
                  key={label}
                >
                  {content}
                </Link>
              ) : (
                <div aria-current={undefined} className={className} key={label}>
                  {content}
                </div>
              );
            })}
          </nav>

          <div className="mt-auto"><UserControls /></div>
        </aside>

        <div className="min-w-0">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-ink text-white">
                <WalletCards aria-hidden="true" className="size-[18px]" />
              </span>
              <span className="font-semibold tracking-tight text-slate-950">Afinco</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{current}</span>
              <UserControls compact />
            </div>
          </header>

          <nav
            aria-label="Section navigation"
            className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6 lg:hidden"
          >
            {navigation
              .filter((item) => item.href)
              .map(({ label, icon: Icon, href }) => (
                <Link
                  aria-current={label === current ? "page" : undefined}
                  className={`focus-ring inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    label === current ? "bg-ink text-white" : "bg-slate-100 text-slate-600"
                  }`}
                  href={href as string}
                  key={label}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </Link>
              ))}
          </nav>

          <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 xl:px-10">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
