// Shared sub-component: 3-mode progress on a course card
// Two variants:
//  A — Three big mode-buttons in a row, each with its own progress
//  B — Compact progress rows + one big "Fortsätt" CTA going to next-best mode

const MODE_DEFS = [
  { key: 'read', label: 'Läs o lär', short: 'Läs', sub: 'Lär in', icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h7a3 3 0 013 3v13a2 2 0 00-2-2H2zM22 4h-7a3 3 0 00-3 3v13a2 2 0 012-2h8z"/></svg> },
  { key: 'learn', label: 'Lär mig', short: 'Lär', sub: 'AI-coach', icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> },
  { key: 'quiz', label: 'Förhör mig', short: 'Förhör', sub: 'Testa dig', icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.6" fill={c}/></svg> },
];

// Tiny donut for variant A
function ModeDonut({ pct, color, size = 38, track = 'rgba(0,0,0,0.08)', children }) {
  const r = (size / 2) - 3;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}

// Status pill for variant B
function StatusPill({ pct, dark }) {
  const text = pct === 0 ? 'Inte börjat' : pct === 100 ? 'Klar' : `${pct}%`;
  const bg = pct === 100 ? 'var(--mint)' : pct === 0 ? (dark ? 'rgba(255,255,255,0.14)' : 'var(--paper-2)') : (dark ? 'rgba(255,255,255,0.18)' : 'var(--paper-3)');
  const fg = pct === 100 ? '#fff' : (dark ? '#fff' : 'var(--ink)');
  return <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 999, background: bg, color: fg }}>{text}</span>;
}

// VARIANT A — three mode-buttons, each showing its own progress
function CourseCardA({ course, dark }) {
  const accent = course.accent;
  const inkOn = dark ? '#fff' : 'var(--ink)';
  const subInk = dark ? 'rgba(255,255,255,0.6)' : 'var(--ink-3)';
  const lastMode = course.last; // 'read' | 'learn' | 'quiz'

  return (
    <div style={{
      borderRadius: 26, padding: 20,
      background: dark ? 'var(--ink)' : 'var(--white)',
      color: inkOn,
      border: dark ? 'none' : '1px solid var(--hairline)',
      boxShadow: dark ? 'var(--shadow-2)' : 'var(--shadow-1)',
      position: 'relative', overflow: 'hidden',
    }}>
      {dark && <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: accent, opacity: 0.18 }} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, position: 'relative' }}>
        <span className="lm-chip" style={{ background: dark ? 'rgba(255,255,255,0.14)' : 'var(--paper-2)', color: dark ? '#fff' : 'var(--ink-2)' }}>{course.eyebrow}</span>
        {course.last && <span style={{ fontSize: 11, color: subInk, display: 'inline-flex', alignItems: 'center', gap: 4 }}>Senast: {MODE_DEFS.find(m => m.key === course.last).short.toLowerCase()}</span>}
      </div>
      <div className="lm-h2" style={{ marginBottom: 4, position: 'relative' }}>{course.title}</div>
      <div style={{ fontSize: 13, color: subInk, marginBottom: 16, position: 'relative' }}>{course.modules} moment · {Math.round((course.progress.read + course.progress.learn + course.progress.quiz) / 3)}% snitt</div>

      {/* 3 mode buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, position: 'relative' }}>
        {MODE_DEFS.map((m, idx) => {
          const pct = course.progress[m.key];
          const isPrimary = idx === 0; // Läs o lär = primary by spec
          const isLast = lastMode === m.key;
          const done = pct === 100;
          const btnBg = isPrimary ? accent : (dark ? 'rgba(255,255,255,0.08)' : 'var(--paper-2)');
          const btnFg = isPrimary ? (dark ? 'var(--ink)' : '#fff') : inkOn;
          const ringColor = done ? 'var(--mint)' : (isPrimary ? (dark ? 'var(--ink)' : '#fff') : accent);
          const ringTrack = isPrimary ? (dark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.35)') : (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)');
          return (
            <button key={m.key} style={{
              padding: 12, borderRadius: 18, border: 0, cursor: 'pointer',
              background: btnBg, color: btnFg, fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              position: 'relative',
              outline: isLast ? `2px solid ${dark ? '#fff' : 'var(--ink)'}` : 'none',
              outlineOffset: -2,
            }}>
              <ModeDonut pct={pct || 0} color={ringColor} size={36} track={ringTrack}>
                <span style={{ color: btnFg }}>{done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> : m.icon('currentColor')}</span>
              </ModeDonut>
              <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.1, textAlign: 'center' }}>{m.short}</div>
              <div style={{ fontSize: 10, opacity: 0.7, lineHeight: 1 }}>{done ? 'Klar' : pct ? `${pct}%` : 'Börja'}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// VARIANT B — compact progress rows + a big primary "Fortsätt" CTA
function CourseCardB({ course, dark }) {
  const accent = course.accent;
  const inkOn = dark ? '#fff' : 'var(--ink)';
  const subInk = dark ? 'rgba(255,255,255,0.6)' : 'var(--ink-3)';

  // Pick "next" mode by spec: Läs → Lär → Förhör (first incomplete)
  const order = ['read', 'learn', 'quiz'];
  const nextKey = order.find(k => (course.progress[k] || 0) < 100) || 'quiz';
  const nextMode = MODE_DEFS.find(m => m.key === nextKey);
  const nextLabel = course.progress[nextKey] === 0 ? `Starta ${nextMode.label.toLowerCase()}` : `Fortsätt ${nextMode.label.toLowerCase()}`;

  return (
    <div style={{
      borderRadius: 26, padding: 20,
      background: dark ? 'var(--ink)' : 'var(--white)',
      color: inkOn,
      border: dark ? 'none' : '1px solid var(--hairline)',
      boxShadow: dark ? 'var(--shadow-2)' : 'var(--shadow-1)',
      position: 'relative', overflow: 'hidden',
    }}>
      {dark && <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: accent, opacity: 0.18 }} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, position: 'relative' }}>
        <span className="lm-chip" style={{ background: dark ? 'rgba(255,255,255,0.14)' : 'var(--paper-2)', color: dark ? '#fff' : 'var(--ink-2)' }}>{course.eyebrow}</span>
        <span style={{ fontSize: 11, color: subInk }}>{course.modules} moment</span>
      </div>
      <div className="lm-h2" style={{ marginBottom: 14, position: 'relative' }}>{course.title}</div>

      {/* Mode rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, position: 'relative' }}>
        {MODE_DEFS.map(m => {
          const pct = course.progress[m.key] || 0;
          const isNext = m.key === nextKey;
          return (
            <button key={m.key} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 0,
              background: 'transparent', border: 0, cursor: 'pointer', color: 'inherit', fontFamily: 'inherit',
              textAlign: 'left',
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 10, flex: '0 0 auto',
                background: pct === 100 ? 'var(--mint)' : (dark ? 'rgba(255,255,255,0.1)' : 'var(--paper-2)'),
                color: pct === 100 ? '#fff' : inkOn,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{m.icon('currentColor')}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</span>
                  <StatusPill pct={pct} dark={dark} />
                </div>
                <div className="lm-progress" style={{ background: dark ? 'rgba(255,255,255,0.12)' : 'var(--paper-3)', height: 6 }}>
                  <span style={{ width: `${pct}%`, background: pct === 100 ? 'var(--mint)' : accent }} />
                </div>
              </div>
              {isNext && <span style={{ flex: '0 0 auto', color: subInk }}>{Icon.chevron(subInk, 14)}</span>}
            </button>
          );
        })}
      </div>

      <button className="lm-btn lm-btn-sm" style={{
        background: accent, color: dark ? 'var(--ink)' : '#fff', width: '100%',
        padding: '14px', fontWeight: 500, fontSize: 14, position: 'relative',
      }}>
        {Icon.play(dark ? 'var(--ink)' : '#fff')} {nextLabel}
      </button>
    </div>
  );
}

// ——————————————————————————————————————————————————————
// CHILD courses screen — accepts variant prop ('A' | 'B')
// ——————————————————————————————————————————————————————
function ScreenChildCourses({ variant = 'A' }) {
  const courses = [
    { title: 'Nordens länder', eyebrow: 'Geografi', modules: 7, accent: 'var(--coral)', last: 'learn', friends: 2, progress: { read: 85, learn: 60, quiz: 30 } },
    { title: 'Bråktal & procent', eyebrow: 'Matte', modules: 5, accent: 'var(--coral)', last: 'read', friends: 0, progress: { read: 40, learn: 20, quiz: 0 } },
    { title: 'Cellerna i kroppen', eyebrow: 'Biologi', modules: 6, accent: 'var(--coral)', last: 'quiz', friends: 3, progress: { read: 100, learn: 100, quiz: 100 } },
  ];
  const Card = variant === 'B' ? CourseCardB : CourseCardA;

  return (
    <div className="lm-screen">
      <div style={{ padding: '56px 22px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 999, background: 'linear-gradient(135deg,var(--sun),var(--coral))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', fontWeight: 600, fontSize: 18 }}>A</div>
          <div style={{ flex: 1 }}>
            <div className="lm-meta">Hej Anna!</div>
            <div style={{ fontWeight: 500, fontSize: 15, marginTop: 2 }}>Välkommen tillbaka</div>
          </div>
          <button style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--white)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.volume(true, 'var(--ink)')}</button>
        </div>
        <div className="lm-display" style={{ fontSize: 32, marginTop: 8 }}>Redo att lära?</div>
      </div>
      <div className="lm-scroll" style={{ padding: '14px 22px 90px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {courses.map((c, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <Card course={c} dark={i === 0} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4, paddingRight: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {Icon.parent('var(--ink-3)')} Delat med {c.friends || 0} {(c.friends || 0) === 1 ? 'kompis' : 'kompisar'}
                </span>
                <button className="lm-btn lm-btn-white lm-btn-sm" style={{ padding: '8px 14px', fontSize: 13, fontWeight: 500, gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
                  Dela med kompis
                </button>
              </div>
            </div>
          ))}
        </div>
        <button className="lm-btn lm-btn-ghost lm-btn-block" style={{ marginTop: 16, padding: '16px', border: '1.5px dashed var(--hairline-2)', gap: 8 }}>
          {Icon.plus('var(--ink-2)', 18)} Skapa egen kurs
        </button>
      </div>
      <TabBar active="home" />
    </div>
  );
}

// ——————————————————————————————————————————————————————
// PARENT courses screen — same card, lighter context
// ——————————————————————————————————————————————————————
function ScreenParentCourses({ variant = 'A' }) {
  const courses = [
    { title: 'Geografi — Nordens länder', eyebrow: 'Åk 4', modules: 7, accent: 'var(--coral)', last: 'learn', kids: 2, progress: { read: 85, learn: 60, quiz: 30 } },
    { title: 'Matte: Bråktal & procent', eyebrow: 'Åk 5', modules: 5, accent: 'var(--coral)', last: 'read', kids: 1, progress: { read: 40, learn: 20, quiz: 0 } },
    { title: 'SO — Vikingatiden', eyebrow: 'Utkast', modules: 0, accent: 'var(--coral)', draft: true },
  ];
  const Card = variant === 'B' ? CourseCardB : CourseCardA;

  return (
    <div className="lm-screen">
      <div style={{ padding: '56px 22px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="lm-eyebrow" style={{ marginBottom: 4 }}>Hej Sara</div>
          <div className="lm-h1">Mina kurser</div>
        </div>
        <button className="lm-btn lm-btn-primary" style={{ padding: '12px 16px', fontSize: 14, gap: 6 }}>{Icon.plus('#fff', 16)} Ny kurs</button>
      </div>
      <div className="lm-scroll" style={{ padding: '14px 22px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {courses.map((c, i) => {
            if (c.draft) {
              return (
                <div key={i} className="lm-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 22 }}>
                  <div style={{ height: 6, background: c.accent }} />
                  <div style={{ padding: '18px 18px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="lm-h3" style={{ marginBottom: 4 }}>{c.title}</div>
                        <div className="lm-meta">Utkast · ej kompilerat</div>
                      </div>
                      <span className="lm-chip lm-chip-outline">Utkast</span>
                    </div>
                    <button className="lm-btn lm-btn-primary lm-btn-sm" style={{ marginTop: 14 }}>Fortsätt redigera {Icon.chevron('#fff', 12)}</button>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} style={{ position: 'relative' }}>
                <Card course={c} dark={false} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4, paddingRight: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {Icon.parent('var(--ink-3)')} Delat med {c.kids} {c.kids === 1 ? 'barn' : 'barn'}
                  </span>
                  <button className="lm-btn lm-btn-white lm-btn-sm" style={{ padding: '8px 14px', fontSize: 13, fontWeight: 500, gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
                    Dela med barn
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button className="lm-btn lm-btn-ghost lm-btn-block" style={{ marginTop: 18, padding: '18px', border: '1.5px dashed var(--hairline-2)', gap: 8 }}>
          {Icon.plus('var(--ink-2)', 18)} Skapa ny kurs
        </button>
      </div>
      <div className="lm-tabbar">
        <button className="lm-tab is-active">{Icon.book('var(--ink)')}<span>Områden</span><span className="lm-tab-dot" /></button>
        <button className="lm-tab">{Icon.parent('var(--ink-4)')}<span>Barn</span><span className="lm-tab-dot" /></button>
        <button className="lm-tab">{Icon.dots('var(--ink-4)')}<span>Mer</span><span className="lm-tab-dot" /></button>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenParentCourses, ScreenChildCourses });
