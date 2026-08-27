"use client";

import * as React from "react";
import { cn } from "@/lib/ds-utils";

// Runs before paint on the client (so the hidden state is applied before the first frame the
// user sees) but falls back to a plain effect on the server to avoid the SSR warning.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * Reveals its children with a rise-in the first time they scroll into view. Three states avoid
 * both failure modes:
 *   - "idle"   — the render before the client effect runs (and the no-JS / crawler render):
 *                fully VISIBLE, so content is never hidden without JS.
 *   - "hidden" — set only for elements still BELOW the fold, before they are ever on screen, so
 *                there is no visible→hidden "blink" when the trigger fires.
 *   - "shown"  — transitions in.
 * Because the hidden state is applied off-screen (via a pre-paint layout effect), an element that
 * is already in view at mount goes straight idle→shown and never flickers.
 *
 * With `stagger`, the wrapper holds still and its DIRECT children rise in sequence (item grids);
 * without it, the wrapper rises as one block (headings).
 */
export function Reveal({
  children,
  className,
  style,
  as: Tag = "div",
  stagger = false,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "section";
  stagger?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<"idle" | "hidden" | "shown">("idle");

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setState("shown");
      return;
    }
    // Reveal once the top edge has risen into the bottom tenth of the viewport.
    const past = () => el.getBoundingClientRect().top < (window.innerHeight || 800) * 0.9;
    if (past()) {
      setState("shown");
      return;
    }
    setState("hidden");
    const check = () => {
      if (past()) {
        setState("shown");
        cleanup();
      }
    };
    const cleanup = () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return cleanup;
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn("sd-reveal", className)}
      style={style}
      data-shown={state === "idle" ? undefined : state === "shown" ? "true" : "false"}
      data-stagger={stagger ? "" : undefined}
    >
      {children}
    </Tag>
  );
}
