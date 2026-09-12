import { useMemo, useSyncExternalStore } from "react";

/**
 * In-memory stand-in for `next/navigation`: `router.replace`/`push` update the search string and
 * re-render every component reading `useSearchParams`, like the App Router does.
 */
let search = "";
const listeners = new Set<() => void>();

function setHref(href: string) {
  const queryStart = href.indexOf("?");
  search = queryStart >= 0 ? href.slice(queryStart + 1) : "";
  listeners.forEach((listener) => listener());
}

export const mockRouter = {
  replace: jest.fn((href: string) => setHref(href)),
  push: jest.fn((href: string) => setHref(href)),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
};

export function setMockSearch(value: string) {
  search = value;
  listeners.forEach((listener) => listener());
}

export function currentMockSearch() {
  return search;
}

export function useRouter() {
  return mockRouter;
}

export function usePathname() {
  return "/transactions";
}

export function useSearchParams() {
  const value = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => search,
    () => search,
  );
  return useMemo(() => new URLSearchParams(value), [value]);
}
