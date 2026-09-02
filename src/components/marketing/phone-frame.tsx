/**
 * Space-grey iPhone device frame, drawn as an SVG overlay with a transparent screen window so the
 * live product UI (the deal room) shows through the cutout. Presentation only (aria-hidden): the
 * machined-metal rail, black bezel, Dynamic Island and side buttons read as a real device while the
 * screen stays the real app. `preserveAspectRatio="none"` is safe because the host box keeps the
 * viewBox's 9:19.2 ratio, so the uniform scale never distorts the corners. IDs are suffixed so the
 * hero and flow instances don't collide when both are on the page.
 */
export function PhoneFrame({ className, id = "a" }: { className?: string; id?: string }) {
  const rail = `sdRail-${id}`;
  const btn = `sdBtn-${id}`;
  const hole = `sdHole-${id}`;
  return (
    <svg className={className} viewBox="0 0 360 768" preserveAspectRatio="none" aria-hidden focusable="false">
      <defs>
        <linearGradient id={rail} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#63676d" />
          <stop offset="0.12" stopColor="#26282c" />
          <stop offset="0.3" stopColor="#4b4f55" />
          <stop offset="0.5" stopColor="#191b1e" />
          <stop offset="0.7" stopColor="#43474d" />
          <stop offset="0.88" stopColor="#17191c" />
          <stop offset="1" stopColor="#5a5e65" />
        </linearGradient>
        <linearGradient id={btn} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a4e54" />
          <stop offset="0.5" stopColor="#2b2e32" />
          <stop offset="1" stopColor="#141619" />
        </linearGradient>
        <mask id={hole}>
          <rect width="360" height="768" fill="#fff" />
          <rect x="13" y="13" width="334" height="742" rx="43" fill="#000" />
        </mask>
      </defs>
      {/* machined-metal rail (space black) — corners concentric with the screen, ~15% radius */}
      <rect width="360" height="768" rx="56" fill={`url(#${rail})`} mask={`url(#${hole})`} />
      {/* faint antenna bands on the rail edges */}
      <g fill="rgba(0,0,0,.28)">
        <rect x="0" y="150" width="7" height="4" />
        <rect x="0" y="612" width="7" height="4" />
        <rect x="353" y="150" width="7" height="4" />
        <rect x="353" y="612" width="7" height="4" />
      </g>
      {/* thin black bezel around the screen */}
      <rect x="7" y="7" width="346" height="754" rx="49" fill="#0a0c0e" mask={`url(#${hole})`} />
      {/* inner chrome lip */}
      <rect x="13" y="13" width="334" height="742" rx="43" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
      {/* Dynamic Island with the front camera lens at its right end (iPhone 16 layout) */}
      <rect x="139" y="20" width="82" height="21" rx="10.5" fill="#050506" />
      <circle cx="207" cy="30.5" r="5.4" fill="#0a1119" />
      <circle cx="207" cy="30.5" r="3.1" fill="#12233a" />
      <circle cx="205.5" cy="29" r="1" fill="rgba(96,150,210,.55)" />
      {/* side controls — left: Action + volume up/down; right: side button + Camera Control */}
      <rect x="0" y="150" width="3.4" height="22" rx="1.7" fill={`url(#${btn})`} />
      <rect x="0" y="186" width="3.4" height="34" rx="1.7" fill={`url(#${btn})`} />
      <rect x="0" y="228" width="3.4" height="34" rx="1.7" fill={`url(#${btn})`} />
      <rect x="356.6" y="176" width="3.4" height="56" rx="1.7" fill={`url(#${btn})`} />
      <rect x="356.6" y="246" width="3.4" height="30" rx="1.7" fill={`url(#${btn})`} />
    </svg>
  );
}
