"use client";

import { CircleUserRound, EllipsisVertical, LoaderCircle, LogOut, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useAuthenticatedUser } from "@/components/auth/auth-gate";
import { DeleteTransactionDataDialog } from "@/components/workspace/delete-transaction-data-dialog";
import { logout } from "@/lib/api/auth";

/** Account menu: workspace data actions and sign out. `compact` renders the mobile header variant. */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const user = useAuthenticatedUser();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const closeOnOutsidePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsidePointer);
    return () => document.removeEventListener("mousedown", closeOnOutsidePointer);
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const openDeleteDialog = () => {
    setOpen(false);
    setDialogOpen(true);
  };

  const signOut = async () => {
    setSigningOut(true);
    setSignOutFailed(false);
    try {
      await logout();
      window.location.assign("/login");
    } catch {
      setSignOutFailed(true);
      setSigningOut(false);
    }
  };

  return (
    <div className={compact ? "relative" : "relative border-t border-slate-800 pt-5"} ref={containerRef}>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className={
          compact
            ? "focus-ring grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600"
            : "focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
        }
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
        title={user.email}
        type="button"
      >
        {compact ? (
          <CircleUserRound aria-hidden="true" className="size-[18px]" />
        ) : (
          <>
            <CircleUserRound aria-hidden="true" className="size-[18px] shrink-0" />
            <span className="min-w-0 flex-1 truncate">{user.email}</span>
            <EllipsisVertical aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
          </>
        )}
      </button>

      {open && (
        <div
          aria-label="Account menu"
          className={`absolute z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-xl shadow-slate-900/15 ${
            compact ? "right-0 top-full mt-2 w-64" : "bottom-full left-0 right-0 mb-2"
          }`}
          id={menuId}
          onKeyDown={handleMenuKeyDown}
          ref={menuRef}
          role="menu"
        >
          {compact && <p className="truncate px-3 pb-2 pt-1.5 text-xs text-slate-500">{user.email}</p>}
          <button
            className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
            onClick={openDeleteDialog}
            role="menuitem"
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete all transaction data
          </button>
          <div className="my-1 border-t border-slate-100" role="separator" />
          <button
            className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-slate-100 disabled:opacity-60"
            disabled={signingOut}
            onClick={() => void signOut()}
            role="menuitem"
            type="button"
          >
            {signingOut ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <LogOut aria-hidden="true" className="size-4" />}
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}

      {signOutFailed && (
        <p className={`mt-2 text-xs text-red-500 ${compact ? "absolute right-0 top-full w-40 text-right" : "px-3"}`} role="alert">
          Sign out failed. Try again.
        </p>
      )}
      {!compact && <p className="mt-5 px-3 text-[11px] uppercase tracking-[0.16em] text-slate-600">CAD workspace</p>}

      <DeleteTransactionDataDialog onClose={() => setDialogOpen(false)} open={dialogOpen} />
    </div>
  );
}
