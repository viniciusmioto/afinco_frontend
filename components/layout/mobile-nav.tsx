"use client";

import { Menu, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { navigation } from "./navigation";

/** Header for screens below `lg`: stays pinned while scrolling and opens the navigation as a drawer. */
export function MobileNav({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) triggerRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    const desktop = window.matchMedia?.("(min-width: 1024px)");
    document.addEventListener("keydown", closeOnEscape);
    desktop?.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      desktop?.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-5 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button
            aria-controls={drawerId}
            aria-expanded={open}
            aria-label="Open navigation menu"
            className="focus-ring grid size-10 shrink-0 place-items-center rounded-xl text-slate-700 transition hover:bg-slate-100"
            onClick={() => setOpen(true)}
            ref={triggerRef}
            type="button"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink text-white">
            <WalletCards aria-hidden="true" className="size-4" />
          </span>
          <span className="truncate font-semibold tracking-tight text-slate-950">
            Afinco <span className="font-normal text-slate-400">/</span> <span className="font-medium text-slate-600">{current}</span>
          </span>
        </div>
        <UserMenu compact />
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-hidden="true"
            className="absolute inset-0 h-full w-full cursor-default bg-slate-950/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            tabIndex={-1}
            type="button"
          />
          <div
            aria-label="Navigation menu"
            aria-modal="true"
            className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-ink px-4 py-5 text-white shadow-xl"
            id={drawerId}
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-blue-700">
                  <WalletCards aria-hidden="true" className="size-[18px]" />
                </span>
                <div>
                  <p className="font-semibold tracking-tight">Afinco</p>
                  <p className="text-xs text-slate-400">Personal finance</p>
                </div>
              </div>
              <button
                aria-label="Close navigation menu"
                className="focus-ring grid size-10 place-items-center rounded-xl text-slate-300 transition hover:bg-slate-800 hover:text-white"
                onClick={() => setOpen(false)}
                ref={closeRef}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <nav aria-label="Main navigation" className="mt-8 space-y-1">
              {navigation.map(({ label, icon: Icon, href }) => {
                const active = label === current;
                return href ? (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    }`}
                    href={href}
                    key={label}
                    onClick={() => setOpen(false)}
                  >
                    <Icon aria-hidden="true" className="size-[18px]" />
                    {label}
                  </Link>
                ) : (
                  <div aria-disabled="true" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500" key={label}>
                    <Icon aria-hidden="true" className="size-[18px]" />
                    {label}
                    <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Soon</span>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
