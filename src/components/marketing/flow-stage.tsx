"use client";

import * as React from "react";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const eio = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

// Actor anchor points as fractions of the stage box: Buyer (left), SafeDeal phone (centre), Seller (right).
const A = { buyer: { x: 0.23, y: 0.5 }, sd: { x: 0.5, y: 0.3 }, seller: { x: 0.77, y: 0.5 } };

export type Actors = { buyer: string; safedeal: string; seller: string; buyerRole: string; sellerRole: string };

/**
 * "How it works" as a full-width cinematic escrow diorama. Three stakeholders share the stage — Buyer
 * and Seller nodes flank SafeDeal, which is the real phone (the app is what holds the money). As the
 * pinned section scrolls, a ฿ coin and a package travel between the actors, the phone crossfades the real
 * deal-room screens ([deal-screen.tsx]), and five depth layers move at their own rate (plus a pointer
 * tilt) for parallax. One progress value q drives the flow, the parallax, the active beat and the caption.
 * Compact screens keep the pinned phone and scroll-driven beats while hiding the side actors and travelling
 * props. Reduced-motion users drop the pin and read the beats as a stacked list of real screens instead.
 */
export function FlowStage({
  kicker,
  defaultTitle,
  caps,
  screens,
  actors,
  brandMark = "/marketing/brand-mark.png",
}: {
  kicker: string;
  defaultTitle: string;
  caps: string[];
  screens: React.ReactNode[];
  actors: Actors;
  brandMark?: string;
}) {
  const rootRef = React.useRef<HTMLElement>(null);
  const pinRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const bgRef = React.useRef<HTMLDivElement>(null);
  const actorsRef = React.useRef<HTMLDivElement>(null);
  const phoneRef = React.useRef<HTMLDivElement>(null);
  const coinRef = React.useRef<HTMLSpanElement>(null);
  const goodsRef = React.useRef<HTMLSpanElement>(null);
  const ringRef = React.useRef<HTMLSpanElement>(null);
  const custodyRef = React.useRef<HTMLDivElement>(null);
  // (floating proof chip removed)
  const progRef = React.useRef<HTMLSpanElement>(null);
  const buyerRef = React.useRef<HTMLDivElement>(null);
  const sellerRef = React.useRef<HTMLDivElement>(null);
  const mouse = React.useRef({ x: 0, y: 0 });
  const [active, setActive] = React.useState(0);
  const activeRef = React.useRef(0);

  React.useEffect(() => {
    const root = rootRef.current, pin = pinRef.current, stage = stageRef.current;
    if (!root || !pin || !stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tick = false;
    const setTok = (el: HTMLElement | null, centerX: number, centerY: number) => {
      if (!el) return;
      el.style.transform = `translate3d(${centerX - el.offsetWidth / 2}px, ${centerY - el.offsetHeight / 2}px, 0)`;
    };
    const update = () => {
      tick = false;
      if (getComputedStyle(pin).position !== "sticky") return; // mobile / reduced → stacked list
      const vh = window.innerHeight;
      const total = root.offsetHeight - vh;
      const q = clamp01(-root.getBoundingClientRect().top / (total || 1));
      const i = Math.min(4, Math.max(0, Math.floor(q * 5)));

      const r = stage.getBoundingClientRect();
      const W = r.width, H = r.height;
      // Apply the current frame's parallax before reading live anchor positions. This keeps the
      // travelling objects centered on resized compact actors instead of trailing them by a frame.
      const mx = mouse.current.x, my = mouse.current.y;
      if (bgRef.current) bgRef.current.style.transform = `translate3d(${mx * 16}px, ${q * -42 + my * 10}px, 0) scale(1.06)`;
      if (actorsRef.current) actorsRef.current.style.transform = `translate3d(${mx * -12}px, ${q * 16 + my * -8}px, 0)`;
      if (phoneRef.current) phoneRef.current.style.transform = `translate3d(calc(-50% + ${mx * 6}px), calc(-50% + ${my * -5}px), 0)`;

      // Anchor the tokens to the live actor-icon centres (so they follow the actors' parallax drift);
      // SafeDeal is the phone, anchored by fraction near its top.
      const ctr = (el: HTMLElement | null, fx: number, fy: number) => {
        const ic = el?.querySelector<HTMLElement>(".ic");
        if (!ic) return { x: fx * W, y: fy * H };
        const b = ic.getBoundingClientRect();
        return { x: b.left + b.width / 2 - r.left, y: b.top + b.height / 2 - r.top };
      };
      const B = ctr(buyerRef.current, A.buyer.x, A.buyer.y);
      const R = ctr(sellerRef.current, A.seller.x, A.seller.y);
      const phoneBox = phoneRef.current?.querySelector<HTMLElement>(".sd-fphone")?.getBoundingClientRect();
      const S = phoneBox
        ? { x: phoneBox.left + phoneBox.width / 2 - r.left, y: phoneBox.top + Math.min(105, phoneBox.height * 0.22) - r.top }
        : { x: A.sd.x * W, y: A.sd.y * H };

      // ฿ coin: Buyer → SafeDeal (0–.2), held (.2–.8), SafeDeal → Seller (.8–1).
      let cx: number, cy: number;
      if (q < 0.2) { const t = eio(clamp01(q / 0.2)); cx = lerp(B.x, S.x, t); cy = lerp(B.y, S.y, t); }
      else if (q < 0.8) { cx = S.x; cy = S.y; }
      else { const t = eio(clamp01((q - 0.8) / 0.2)); cx = lerp(S.x, R.x, t); cy = lerp(S.y, R.y, t); }
      setTok(coinRef.current, cx, cy);

      // package: Seller → Buyer during the ship band, then rests with the buyer.
      const goods = goodsRef.current;
      if (goods) {
        if (q >= 0.4) {
          goods.style.opacity = "1";
          const t = q < 0.6 ? eio(clamp01((q - 0.4) / 0.2)) : 1;
          setTok(goods, lerp(R.x, B.x, t), lerp(R.y, B.y, t));
        } else goods.style.opacity = "0";
      }

      const held = q >= 0.2 && q < 0.85;
      ringRef.current?.classList.toggle("on", held);
      coinRef.current?.classList.toggle("held", held);
      // The phone stays frosted for the complete custody window on every viewport. Compact layouts
      // use the visible buyer, seller, and package actors to communicate shipping while it remains held.
      custodyRef.current?.classList.toggle("on", q > 0.22 && q < 0.78);
      if (coinRef.current) coinRef.current.style.opacity = q > 0.26 && q < 0.74 ? "0" : "1";
      buyerRef.current?.classList.toggle("on", i === 0 || i === 3);
      sellerRef.current?.classList.toggle("on", i === 2 || i === 4);
      if (progRef.current) progRef.current.style.transform = `scaleX(${q})`;
      pin.querySelectorAll<HTMLElement>(".sd-cine__h--stage span").forEach((el, k) => el.classList.toggle("on", k === i));
      if (i !== activeRef.current) { activeRef.current = i; setActive(i); }
    };
    const onScroll = () => { if (!tick) { tick = true; requestAnimationFrame(update); } };
    const onMove = (e: PointerEvent) => {
      const r = pin.getBoundingClientRect();
      mouse.current = { x: (e.clientX - r.left) / r.width * 2 - 1, y: (e.clientY - r.top) / r.height * 2 - 1 };
      onScroll();
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    pin.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      pin.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <section className="sd-flow sd-flow--cine" id="flow" ref={rootRef}>
      <div className="sd-cine" ref={pinRef}>
        <div className="sd-cine__bg" ref={bgRef} aria-hidden>
          <span className="sd-cine__blob b1" />
          <span className="sd-cine__blob b2" />
          <span className="sd-cine__grid" />
        </div>

        <div className="sd-wrap sd-cine__head">
          <span className="sd-kicker">{kicker}</span>
          <h2 className="sd-cine__h sd-cine__h--stage" aria-live="polite">
            {caps.map((c, i) => (
              <span key={i} className={i === 0 ? "on" : undefined}>{c}</span>
            ))}
          </h2>
          <p className="sd-cine__h sd-cine__h--static">{defaultTitle}</p>
          <span className="sd-cine__prog" aria-hidden><span ref={progRef} /></span>
        </div>

        <div className="sd-cine__stage" ref={stageRef} aria-hidden>
          <svg className="sd-cine__paths" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke="color-mix(in srgb, var(--primary) 30%, var(--border))" strokeWidth="1.5">
            <path d="M23 50 Q36 40 50 33" vectorEffect="non-scaling-stroke" />
            <path d="M50 33 Q64 40 77 50" vectorEffect="non-scaling-stroke" />
          </svg>

          <div className="sd-cine__actors" ref={actorsRef}>
            <div className="sd-cine__actor sd-cine__actor--buyer" ref={buyerRef}>
              <span className="ic"><UserGlyph /></span>
              <div className="sd-cine__actor__lbl"><strong>{actors.buyer}</strong><span className="role">{actors.buyerRole}</span></div>
            </div>
            <div className="sd-cine__actor sd-cine__actor--seller" ref={sellerRef}>
              <span className="ic"><StoreGlyph /></span>
              <div className="sd-cine__actor__lbl"><strong>{actors.seller}</strong><span className="role">{actors.sellerRole}</span></div>
            </div>
          </div>

          <div className="sd-cine__phone" ref={phoneRef}>
            <span className="sd-cine__ring" ref={ringRef} aria-hidden />
            <div className="sd-fphone">
              <div className="sd-fphone__frame">
                <div className="sd-fphone__screen">
                  <div className="sd-fphone__island" aria-hidden />
                  <div className="sd-fphone__status" aria-hidden>
                    <span className="sd-fphone__time">9:41</span>
                    <span className="sd-fphone__sig">
                      <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7.5" width="3" height="3.5" rx="1" /><rect x="4.6" y="5" width="3" height="6" rx="1" /><rect x="9.3" y="2.5" width="3" height="8.5" rx="1" /><rect x="14" y="0" width="3" height="11" rx="1" /></svg>
                      <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2C5 2 2.4 3.1.6 5l1.4 1.4C3.4 5 5.6 4 8 4s4.6 1 6 2.4L15.4 5C13.6 3.1 11 2 8 2Zm0 3.6c-1.6 0-3.1.6-4.2 1.7l1.4 1.4c.8-.8 1.8-1.2 2.8-1.2s2 .4 2.8 1.2l1.4-1.4C11.1 6.2 9.6 5.6 8 5.6ZM8 9l-1.4 1.4c.4.4.9.6 1.4.6s1-.2 1.4-.6L8 9Z" /></svg>
                      <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" strokeOpacity="0.4" /><rect x="2" y="2" width="17" height="8" rx="1.5" fill="currentColor" /><path d="M23 4c0.9 0.4 0.9 3.6 0 4z" fill="currentColor" fillOpacity="0.5" /></svg>
                    </span>
                  </div>
                  <div className="sd-fphone__bar">
                    <span className="sd-fphone__brand">
                      {/* eslint-disable-next-line @next/next/no-img-element -- tiny brand mark */}
                      <img src={brandMark} alt="" width={18} height={18} />
                      {actors.safedeal}
                    </span>
                    <span className="sd-fphone__ava">S</span>
                  </div>
                  <div className="sd-fphone__app">
                    {screens.map((screen, i) => (
                      <div className="sd-fscr" key={i} data-on={active === i || undefined}>
                        <div className="sd-fscr__cap"><strong>{caps[i]}</strong></div>
                        <div className="sd-fscr__body">{screen}</div>
                      </div>
                    ))}
                  </div>
                  {/* while SafeDeal holds the money, the screen frosts green and shows the SafeDeal mark */}
                  <div className="sd-fphone__custody" ref={custodyRef} aria-hidden>
                    <span className="mk">
                      {/* eslint-disable-next-line @next/next/no-img-element -- brand mark */}
                      <img src={brandMark} alt="" width={48} height={48} />
                    </span>
                    <strong>{actors.safedeal}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <span className="sd-cine__coin" ref={coinRef} aria-hidden>฿</span>
          <span className="sd-cine__goods" ref={goodsRef} aria-hidden><PackageGlyph /></span>
        </div>

      </div>
    </section>
  );
}

function UserGlyph() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>);
}
function StoreGlyph() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 9l1.5-5h15L21 9M4 9v10h16V9M4 9h16" /><path d="M9 19v-5h6v5" /></svg>);
}
function PackageGlyph() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 8l-9-5-9 5v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></svg>);
}
