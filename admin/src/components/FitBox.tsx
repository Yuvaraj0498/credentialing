"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Like the sign-in page's FitToScreen, but inside the page area (next to the sidebar): the content is scaled down
 * when it would not fit between its top and the bottom of the window, so the page never scrolls at any zoom level.
 * `bottom` = space kept below it (the page's bottom padding).
 */
export function FitBox({ children, bottom = 32 }: { children: ReactNode; bottom?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; height?: number }>({ scale: 1 });

  useLayoutEffect(() => {
    const o = outer.current;
    const el = inner.current;
    if (!o || !el) return;
    const measure = () => {
      // natural size (offset/scroll sizes ignore the transform)
      const w = Math.max(el.scrollWidth, el.offsetWidth);
      const h = el.offsetHeight;
      if (!w || !h) return;
      const top = o.getBoundingClientRect().top;
      const availH = window.innerHeight - top - bottom;
      const availW = o.clientWidth;
      const s = Math.max(0.05, Math.min(1, availW / w, availH / h));
      setFit((f) => (Math.abs(f.scale - s) < 0.001 && f.height === h * s ? f : { scale: s, height: h * s }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(o);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [bottom]);

  return (
    <div ref={outer} data-fitbox style={{ height: fit.height, overflow: "hidden" }}>
      <div ref={inner} style={{ transform: `scale(${fit.scale})`, transformOrigin: "top center", width: "100%" }}>
        {children}
      </div>
    </div>
  );
}
