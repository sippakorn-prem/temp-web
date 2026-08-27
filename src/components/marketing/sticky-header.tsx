"use client";

import * as React from "react";
import { cn } from "@/lib/ds-utils";

/**
 * The landing's sticky header. Adds `data-scrolled` once the page has moved, so CSS can give it
 * a subtle shadow/border for depth (see `.sd-header` in marketing.css). Content is passed through
 * from the server component, so only this thin wrapper is client-side.
 */
export function StickyHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("sd-header", className)} data-scrolled={scrolled ? "true" : undefined}>
      {children}
    </header>
  );
}
