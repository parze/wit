// Shared icons + small primitives for Lärmig screens
const Icon = {
  back: (c = 'currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  close: (c = 'currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  plus: (c = 'currentColor', s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  eye: (c = 'currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>,
  check: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  play: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M8 5v14l11-7z"/></svg>,
  pause: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>,
  stop: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><rect x="6" y="6" width="12" height="12" rx="2"/></svg>,
  star: (filled = true, c = '#ffc738', s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill={filled ? c : 'none'} stroke={c} strokeWidth="1.8" strokeLinejoin="round"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.1L12 17.8 5.7 21.3l1.7-7.1L2 9.5l7.1-.6z"/></svg>,
  send: (c = 'currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>,
  volume: (on = true, c = 'currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={c}/>{on ? <><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></> : <path d="M23 9l-6 6M17 9l6 6"/>}</svg>,
  sparkle: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" opacity="0.6"/></svg>,
  trash: (c = 'currentColor') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>,
  copy: (c = 'currentColor') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  share: (c = 'currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>,
  mic: (c = 'currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0014 0v-2M12 19v3"/></svg>,
  search: (c = 'currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  dots: (c = 'currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill={c}><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
  chevron: (c = 'currentColor', s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>,
  chevronDown: (c = 'currentColor') => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>,
  book: (c = 'currentColor', s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14z"/><path d="M8 7h8"/></svg>,
  parent: (c = 'currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>,
  qr: (c = 'currentColor', s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14h1v1M14 20h1v1M18 18h3v3" strokeLinecap="round"/></svg>,
  invite: (c = 'currentColor', s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7l8 6 8-6"/><rect x="3" y="5" width="18" height="14" rx="2"/></svg>,
  skip: (c = 'currentColor', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4" fill={c}/><line x1="19" y1="5" x2="19" y2="19"/></svg>,
};

function Stars({ count, total = 5, size = 16 }) {
  return (
    <span className="lm-stars">
      {Array.from({ length: total }).map((_, i) => <span key={i}>{Icon.star(i < count, i < count ? '#ffc738' : '#a89f92', size)}</span>)}
    </span>
  );
}

function Wordmark({ size = 28, color = 'var(--ink)', dot = 'var(--coral)' }) {
  return (
    <span className="lm-wordmark" style={{ fontSize: size, color }}>
      Lärmig<span className="dot" style={{ background: dot, width: size*0.32, height: size*0.32 }} />
    </span>
  );
}

// Little rainbow-dot mark used as an app icon
function BrandMark({ size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 0 rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', gap: size * 0.06 }}>
        <i style={{ width: size * 0.14, height: size * 0.14, borderRadius: 999, background: 'var(--sun)' }} />
        <i style={{ width: size * 0.14, height: size * 0.14, borderRadius: 999, background: 'var(--coral)' }} />
        <i style={{ width: size * 0.14, height: size * 0.14, borderRadius: 999, background: 'var(--grape)' }} />
      </div>
    </div>
  );
}

// Tabbar used on child main screens
function TabBar({ active = 'home' }) {
  const tab = (id, label, icon) => (
    <button className={`lm-tab ${active === id ? 'is-active' : ''}`} key={id}>
      {icon}
      <span>{label}</span>
      <span className="lm-tab-dot" />
    </button>
  );
  return (
    <div className="lm-tabbar">
      {tab('home', 'Hem', Icon.book(active === 'home' ? 'var(--ink)' : 'var(--ink-4)'))}
      {tab('progress', 'Framsteg', <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active === 'progress' ? 'var(--ink)' : 'var(--ink-4)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18M6 16V10M11 16V4M16 16v-8M21 16v-5"/></svg>)}
      {tab('profile', 'Jag', Icon.parent(active === 'profile' ? 'var(--ink)' : 'var(--ink-4)'))}
    </div>
  );
}

// Simple SVG QR placeholder - not a real QR, just evocative
function QRPlaceholder({ size = 180 }) {
  const cells = 21;
  const s = size / cells;
  // deterministic-ish pattern
  const pattern = [];
  const seed = 42;
  let r = seed;
  const rand = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
    const inFinder = (x < 7 && y < 7) || (x > cells-8 && y < 7) || (x < 7 && y > cells-8);
    if (inFinder) continue;
    if (rand() > 0.52) pattern.push([x, y]);
  }
  const finder = (fx, fy) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx*s} y={fy*s} width={s*7} height={s*7} fill="var(--ink)" rx={s*1.2} />
      <rect x={(fx+1)*s} y={(fy+1)*s} width={s*5} height={s*5} fill="var(--white)" rx={s*0.8} />
      <rect x={(fx+2)*s} y={(fy+2)*s} width={s*3} height={s*3} fill="var(--ink)" rx={s*0.4} />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: 'var(--white)', borderRadius: 20, padding: 0 }}>
      {pattern.map(([x, y]) => <rect key={`${x}-${y}`} x={x*s+s*0.1} y={y*s+s*0.1} width={s*0.8} height={s*0.8} rx={s*0.25} fill="var(--ink)" />)}
      {finder(0, 0)}{finder(cells-7, 0)}{finder(0, cells-7)}
    </svg>
  );
}

Object.assign(window, { Icon, Stars, Wordmark, BrandMark, TabBar, QRPlaceholder });
