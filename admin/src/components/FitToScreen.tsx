"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Shows its content centred in the window and scales it down when it would not fit, so the page never
 * scrolls — at any browser zoom level (used by the sign-in page).
 */
export function FitToScreen({ children, padding = 16, style }: { children: ReactNode; padding?: number; style?: CSSProperties }) {
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const fit = () => {
      // natural size of the content (offset sizes ignore the current transform)
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w || !h) return;
      const s = Math.min(1, (window.innerWidth - padding * 2) / w, (window.innerHeight - padding * 2) / h);
      setScale(s > 0 ? s : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [padding]);

  return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center" style={style}>
      <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: "center center", flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}
