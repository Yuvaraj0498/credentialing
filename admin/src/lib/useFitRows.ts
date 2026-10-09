"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * How many table rows fit between the top of `ref` and the bottom of the window, so a paged list never needs
 * a scrollbar at any screen size. `reserve` = space below the rows (table header, pagination, page padding).
 */
export function useFitRows(ref: RefObject<HTMLElement | null>, rowHeight: number, reserve = 130, min = 3): number {
  const [rows, setRows] = useState(min);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const fit = Math.floor((window.innerHeight - top - reserve) / rowHeight);
      setRows(Math.max(min, fit));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ref, rowHeight, reserve, min]);
  return rows;
}
