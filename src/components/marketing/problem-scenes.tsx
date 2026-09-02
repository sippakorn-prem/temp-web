"use client";

import * as React from "react";

export type ProblemScene = { dir: "left" | "right"; tag: string; h: string; b: string; img: string; alt: string };

/**
 * The problem section: two full-screen pinned scenes. As each scene scrolls through its pin, the
 * text slides in from one side and the image from the other, then holds ("stop and explain").
 * Compact screens retain the full-screen pin and opposing-side entrance, using a stacked frame
 * in portrait and two columns in landscape. Reduced motion stays completely static.
 */
export function ProblemScenes({
  scenes,
  resolvePre,
  resolveAccent,
}: {
  scenes: ProblemScene[];
  resolvePre: string;
  resolveAccent: string;
}) {
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mq = window.matchMedia("(max-width: 880px)");
    const resolve = root.querySelector<HTMLElement>(".sd-presolve p");
    const items = [...root.querySelectorAll<HTMLElement>(".sd-pscene")].map((el) => ({
      el,
      dir: el.getAttribute("data-dir"),
      text: el.querySelector<HTMLElement>(".sd-pscene__text")!,
      media: el.querySelector<HTMLElement>(".sd-pscene__media")!,
      image: el.querySelector<HTMLElement>(".sd-pimg img")!,
    }));
    const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
    let tick = false;
    const update = () => {
      tick = false;
      for (const s of items) {
        const rect = s.el.getBoundingClientRect();
        const pin = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - window.innerHeight)));
        // Preserve the original scene-level entrance timing at every breakpoint: the first scene
        // enters from the left, the second from the right, and each image counters that direction.
        // Tying both layers to the pin prevents compact layouts from completing before scrolling.
        const entrance = easeOut(Math.min(1, pin / 0.6));
        const dist = mq.matches ? Math.min(72, window.innerWidth * 0.18) : 100;
        const tdir = s.dir === "left" ? -1 : 1;
        const textY = mq.matches ? -pin * 12 : 0;
        const mediaY = mq.matches ? pin * 18 : 0;
        s.text.style.transform = `translate3d(${((1 - entrance) * dist * tdir).toFixed(1)}px,${textY.toFixed(1)}px,0)`;
        s.text.style.opacity = entrance.toFixed(3);
        s.media.style.transform = `translate3d(${((1 - entrance) * dist * -tdir).toFixed(1)}px,${mediaY.toFixed(1)}px,0)`;
        s.media.style.opacity = entrance.toFixed(3);
        const imageTravel = mq.matches ? 10 : 8;
        const imageBaseScale = mq.matches ? 1.025 : 1.02;
        const imageScaleTravel = mq.matches ? 0.035 : 0.025;
        s.image.style.transform = `translate3d(0,${((0.5 - pin) * imageTravel).toFixed(1)}px,0) scale(${(imageBaseScale + pin * imageScaleTravel).toFixed(4)})`;
      }
      if (resolve) {
        const rect = resolve.getBoundingClientRect();
        const entering = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight * 0.8)));
        resolve.style.transform = `translate3d(0,${((1 - easeOut(entering)) * 32).toFixed(1)}px,0)`;
        resolve.style.opacity = easeOut(entering).toFixed(3);
      }
    };
    const onScroll = () => {
      if (!tick) {
        tick = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section className="sd-problem" aria-label="The problem" ref={ref}>
      {scenes.map((s, i) => (
        <div className="sd-pscene" data-dir={s.dir} key={i}>
          <div className="sd-pscene__sticky">
            <div className="sd-wrap sd-pscene__grid">
              <div className="sd-pscene__text">
                <span className="sd-ptag">{s.tag}</span>
                <h2>{s.h}</h2>
                <p>{s.b}</p>
              </div>
              <div className="sd-pscene__media">
                <div className="sd-pimg">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static illustration, fixed 4:3 frame */}
                  <img src={s.img} alt={s.alt} width={1400} height={1050} loading="lazy" decoding="async" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="sd-presolve">
        <div className="sd-wrap">
          <p>
            {resolvePre} <span className="g">{resolveAccent}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
