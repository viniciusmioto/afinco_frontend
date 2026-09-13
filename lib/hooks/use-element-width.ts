import { useCallback, useRef, useState } from "react";

/**
 * Tracks an element's rendered width. Returns a callback ref, so measuring restarts whenever the element
 * mounts again (for example after toggling back from a table view). `fallback` is used until measured.
 */
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const [width, setWidth] = useState(fallback);
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((element: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!element) return;
    const measure = () => {
      const next = Math.round(element.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      observer.current = new ResizeObserver(measure);
      observer.current.observe(element);
    }
  }, []);

  return [ref, width] as const;
}
