"use client";

import * as React from "react";
import { Icon, type IconName } from "@/components/icon";

export type TrustItem = { icon: IconName; h: string; b: string };

/**
 * "Why it's safe" as a horizontal slider driven by vertical scroll: the section pins and the
 * cards travel right-to-left until the last one, then release. A progress bar + "n / total"
 * counter track position. Compact screens keep the same scroll story with narrower cards;
 * reduced-motion users receive a native horizontal swipe instead.
 */
export function TrustSlider({
  kicker,
  heading,
  lead,
  items,
}: {
  kicker: string;
  heading: string;
  lead: string;
  items: TrustItem[];
}) {
  const rootRef = React.useRef<HTMLElement>(null);
  const stickyRef = React.useRef<HTMLDivElement>(null);
  const vpRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const barRef = React.useRef<HTMLSpanElement>(null);
  const countRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const root = rootRef.current, sticky = stickyRef.current, vp = vpRef.current, track = trackRef.current;
    if (!root || !sticky || !vp || !track) return;
    let tick = false;
    const update = () => {
      tick = false;
      if (getComputedStyle(sticky).position !== "sticky") { track.style.transform = ""; return; }
      const total = root.offsetHeight - window.innerHeight;
      const prog = Math.min(1, Math.max(0, -root.getBoundingClientRect().top / (total || 1)));
      const maxShift = Math.max(0, track.scrollWidth - vp.clientWidth);
      track.style.transform = `translate3d(${(-prog * maxShift).toFixed(1)}px,0,0)`;
      if (barRef.current) barRef.current.style.width = `${prog * 100}%`;
      if (countRef.current) countRef.current.textContent = String(Math.min(items.length, Math.floor(prog * (items.length - 0.001)) + 1));
    };
    const onScroll = () => { if (!tick) { tick = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [items.length]);

  return (
    <section className="sd-trust" id="trust" ref={rootRef}>
      <div className="sd-trust__sticky" ref={stickyRef}>
        <div className="sd-wrap sd-trust__head sd-reveal" data-shown="true">
          <span className="sd-kicker">{kicker}</span>
          <h2 className="sd-h2">{heading}</h2>
          <p className="sd-lead">{lead}</p>
        </div>
        <div className="sd-trust__vp" ref={vpRef}>
          <div className="sd-trust__track" ref={trackRef}>
            {items.map((it, i) => (
              <div className="sd-tcard" key={i}>
                <div className="ic"><Icon name={it.icon} /></div>
                <h3>{it.h}</h3>
                <p>{it.b}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="sd-trust__prog" aria-hidden>
          <div className="sd-trust__bar"><span ref={barRef} /></div>
          <span className="sd-trust__count">
            <b ref={countRef}>1</b> / {items.length}
          </span>
        </div>
      </div>
    </section>
  );
}
