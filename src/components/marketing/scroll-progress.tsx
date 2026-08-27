"use client";

import * as React from "react";
import { cn } from "@/lib/ds-utils";

/**
 * Supplies lightweight viewport progress variables to a section. CSS decides how each section
 * uses them, which keeps the motion contextual instead of applying one generic animation.
 */
export function ScrollProgress({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tick = false;
    const update = () => {
      tick = false;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      const centered = 0.5 - progress;
      el.style.setProperty("--sd-shift-sm", `${(centered * 22).toFixed(2)}px`);
      el.style.setProperty("--sd-shift-md", `${(centered * 38).toFixed(2)}px`);
      el.style.setProperty("--sd-shift-lg", `${(centered * 58).toFixed(2)}px`);
      el.style.setProperty("--sd-motion-scale", (0.975 + Math.min(1, progress * 2) * 0.025).toFixed(4));
    };
    const requestUpdate = () => {
      if (!tick) {
        tick = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <section ref={ref} id={id} className={cn(className)} data-scroll-motion="">
      {children}
    </section>
  );
}
