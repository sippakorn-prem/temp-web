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
  const finaleRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);
  const [finaleReady, setFinaleReady] = React.useState(false);
  const [preview, setPreview] = React.useState<number | null>(null);
  const previewId = React.useId();

  React.useEffect(() => {
    const root = rootRef.current, sticky = stickyRef.current, vp = vpRef.current, track = trackRef.current;
    if (!root || !sticky || !vp || !track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (motion.matches || getComputedStyle(sticky).position !== "sticky") {
        track.style.transform = "";
        setFinaleReady(false);
        setPreview(null);
        return;
      }
      const total = root.offsetHeight - sticky.offsetHeight;
      const progress = Math.min(1, Math.max(0, -root.getBoundingClientRect().top / (total || 1)));
      const headerBottom = document.querySelector(".sd-header")?.getBoundingClientRect().bottom ?? 66;
      const spaceAbove = (finaleRef.current?.getBoundingClientRect().top ?? 0) - headerBottom - 20;
      finaleRef.current?.style.setProperty("--preview-max-height", `${Math.max(0, spaceAbove)}px`);
      if (finaleRef.current) finaleRef.current.dataset.compact = String(spaceAbove < 300);
      const ready = progress >= 0.98 && spaceAbove >= 120;
      setFinaleReady(ready);
      if (!ready) setPreview(null);
      // Reserve the final beat for the six protections coming together.
      const rawPosition = Math.min(1, progress / 0.86) * Math.max(0, cards.length - 1);
      const base = Math.floor(rawPosition);
      const travel = Math.min(1, Math.max(0, (rawPosition - base - 0.25) / 0.5));
      const position = base + travel * travel * (3 - 2 * travel);
      const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 0;
      track.style.transform = `translate3d(${-position * step}px,0,0)`;
      root.style.setProperty("--trust-drift", `${(progress - 0.5) * 100}px`);
      root.style.setProperty("--trust-card-exit", String(Math.min(1, Math.max(0, (progress - 0.88) / 0.06))));
      root.style.setProperty("--trust-finale", String(Math.min(1, Math.max(0, (progress - 0.94) / 0.06))));
      cards.forEach((card, index) => {
        const distance = Math.min(1, Math.abs(index - position));
        card.style.setProperty("--focus", String(1 - distance));
        card.style.setProperty("--tilt", `${Math.max(-1, Math.min(1, index - position)) * -5}deg`);
      });
      setActive(Math.round(position));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(vp);
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", schedule);
    };
  }, [items.length]);

  const jumpTo = (index: number) => {
    const root = rootRef.current, sticky = stickyRef.current;
    if (!root || !sticky) return;
    const progress = index / Math.max(1, items.length - 1) * 0.86;
    window.scrollTo({ top: window.scrollY + root.getBoundingClientRect().top +
      progress * (root.offsetHeight - sticky.offsetHeight), behavior: "smooth" });
  };

  return (
    <section className="sd-trust" id="trust" ref={rootRef}>
      <div className="sd-trust__sticky" ref={stickyRef}>
        <div className="sd-trust__atmosphere" aria-hidden="true"><Icon name="protection" /></div>
        <div className="sd-wrap sd-trust__head sd-reveal" data-shown="true">
          <span className="sd-kicker">{kicker}</span>
          <h2 className="sd-h2">{heading}</h2>
          <p className="sd-lead">{lead}</p>
        </div>
        <div className="sd-trust__vp" ref={vpRef}>
          <div className="sd-trust__track" ref={trackRef}>
            {items.map((it, i) => (
              <div className="sd-tcard" key={i} data-kind={it.icon} style={{ "--focus": i === 0 ? 1 : 0 } as React.CSSProperties}>
                <ProtectionCard item={it} index={i} />
              </div>
            ))}
          </div>
        </div>
        <div className="sd-trust__finale" ref={finaleRef} data-preview={preview !== null || undefined}
          data-ready={finaleReady || undefined} inert={!finaleReady} aria-hidden={!finaleReady}
          onPointerLeave={(event) => {
            if (!event.currentTarget.contains(document.activeElement)) setPreview(null);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setPreview(null);
          }}
          onKeyDown={(event) => { if (event.key === "Escape") setPreview(null); }}>
          {preview !== null && <div className="sd-tcard sd-trust__preview" id={previewId}
            role="region" aria-label={items[preview].h} style={{ "--focus": 1, "--preview-index": preview, "--preview-count": Math.max(1, items.length - 1) } as React.CSSProperties}>
            <ProtectionCard item={items[preview]} index={preview} />
          </div>}
          <div className="sd-trust__finale-icons">{items.map((item, i) => <button type="button" key={i}
            aria-label={item.h} aria-expanded={preview === i} aria-controls={preview !== null ? previewId : undefined}
            onPointerEnter={(event) => { if (event.pointerType !== "touch") setPreview(i); }}
            onFocus={() => setPreview(i)} onClick={() => setPreview(i)}>
            <Icon name={item.icon} />
          </button>)}</div>
          <strong><Icon name="protection" /> SafeDeal</strong>
        </div>
        <div className="sd-trust__prog">
          {items.map((item, i) => <button type="button" key={i} onClick={() => jumpTo(i)}
            aria-label={item.h} aria-current={active === i ? "step" : undefined} title={item.h}>
            <span>0{i + 1}</span><i />
          </button>)}
          <span className="sd-trust__count" aria-hidden="true">{active + 1} / {items.length}</span>
        </div>
      </div>
    </section>
  );
}

function ProtectionCard({ item, index }: { item: TrustItem; index: number }) {
  return <>
    <span className="sd-tcard__number" aria-hidden="true">0{index + 1}</span>
    <div className="sd-tcard__art" aria-hidden="true">
      <div className="sd-tcard__orbit" /><div className="sd-tcard__orbit sd-tcard__orbit--outer" />
      <div className="ic"><Icon name={item.icon} /></div>
      <span className="sd-tcard__seal"><Icon name="check" /></span>
    </div>
    <h3>{item.h}</h3>
    <p>{item.b}</p>
  </>;
}
