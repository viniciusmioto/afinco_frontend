import { WalletCards } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { UserMenu } from "@/components/auth/user-menu";
import { MobileNav } from "./mobile-nav";
import { navigation } from "./navigation";

export function AppShell({ children, current = "Transactions" }: { children: ReactNode; current?: string }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-800 bg-ink px-5 py-7 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
          <div className="flex items-center gap-3 px-2">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-700">
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
                <div aria-disabled="true" className={className} key={label}>
                  {content}
                </div>
              );
            })}
          </nav>

          <div className="mt-auto"><UserMenu /></div>
        </aside>

        <div className="min-w-0">
          <MobileNav current={current} />
          <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 xl:px-10">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
