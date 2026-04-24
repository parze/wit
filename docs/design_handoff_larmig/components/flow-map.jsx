// Flow map — mini-phones as nodes, labelled arrows between them, three tracks.
// Drawn at 1640x1000, letterboxed inside the artboard.

function FlowMap() {
  // ——— Shared sub-components ———
  const Node = ({ x, y, title, eyebrow, tone = 'light', tint, icon, w = 150, h = 260 }) => {
    const bg = tone === 'dark' ? '#181410' : '#fff';
    const fg = tone === 'dark' ? '#fff' : '#181410';
    const subFg = tone === 'dark' ? 'rgba(255,255,255,0.62)' : '#6a6055';
    return (
      <g transform={`translate(${x - w/2}, ${y - h/2})`}>
        {/* phone card */}
        <rect x={0} y={0} width={w} height={h} rx={22} fill={bg} stroke="rgba(0,0,0,0.08)" />
        {/* accent stripe */}
        {tint && <rect x={0} y={0} width={w} height={60} rx={22} fill={tint} />}
        {tint && <rect x={0} y={44} width={w} height={16} fill={tint} />}
        {/* icon */}
        <g transform={`translate(${w/2 - 18}, ${tint ? 22 : 28})`}>
          {icon}
        </g>
        {/* labels */}
        <text x={w/2} y={tint ? 82 : 92} textAnchor="middle" fontFamily="'Tele2 Sans', sans-serif" fontSize="10" letterSpacing="1.2" fill={subFg} style={{ textTransform: 'uppercase' }}>{eyebrow}</text>
        <foreignObject x={10} y={tint ? 92 : 102} width={w - 20} height={h - 110}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            fontFamily: "'Tele2 Text', serif",
            fontSize: 15,
            lineHeight: 1.2,
            color: fg,
            fontWeight: 500,
            textAlign: 'center',
          }}>{title}</div>
        </foreignObject>
        {/* bottom dock */}
        <rect x={w/2 - 20} y={h - 18} width={40} height={4} rx={2} fill={tone === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'} />
      </g>
    );
  };

  // Arrow with optional label
  const Arrow = ({ from, to, label, curve = 0, dashed = false, color = '#181410' }) => {
    const [x1, y1] = from, [x2, y2] = to;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 + curve;
    const path = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
    return (
      <g>
        <path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeDasharray={dashed ? '4 5' : 'none'} markerEnd={`url(#arrow-${color.replace('#','')})`} />
        {label && (
          <g transform={`translate(${mx}, ${my - 4})`}>
            <rect x={-label.length * 3.6 - 10} y={-11} width={label.length * 7.2 + 20} height={22} rx={11} fill="#fff" stroke="rgba(0,0,0,0.08)" />
            <text x={0} y={4} textAnchor="middle" fontFamily="'Tele2 Sans', sans-serif" fontSize="11" fill="#39312a" fontWeight="500">{label}</text>
          </g>
        )}
      </g>
    );
  };

  // Small section header (sits above the row, full-width)
  const Track = ({ y, title, subtitle, tint }) => (
    <g>
      <rect x={50} y={y - 60} width={6} height={36} rx={3} fill={tint} />
      <text x={68} y={y - 44} fontFamily="'Tele2 Sans', sans-serif" fontSize="10" letterSpacing="1.5" fill="#6a6055" style={{ textTransform: 'uppercase' }}>{title}</text>
      <text x={68} y={y - 26} fontFamily="'Tele2 Text', serif" fontSize="18" fill="#181410" fontWeight="500">{subtitle}</text>
      <line x1={50} y1={y - 12} x2={W - 50} y2={y - 12} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
    </g>
  );

  // Icons in SVG
  const icons = {
    qr: (<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14h1v1M14 20h1v1M18 18h3v3" strokeLinecap="round"/></svg>),
    user: (<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>),
    pin: (<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 13v3M8 13v3M16 13v3"/></svg>),
    home: (<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14z"/><path d="M8 7h8"/></svg>),
    chat: (<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>),
    lock: (<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 118 0v3"/></svg>),
    parent: (<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20v-1a4 4 0 014-4h4a4 4 0 014 4v1M15 20v-.5a3 3 0 013-3h1a3 3 0 013 3v.5"/></svg>),
    mail: (<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></svg>),
    check: (<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>),
    share: (<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>),
  };

  const W = 1640, H = 1500;
  const y1 = 220, y2 = 660, y3 = 1100; // three tracks

  // column xs
  const col = (n) => 210 + n * 230;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ background: '#f4ecdb', borderRadius: 18, display: 'block' }}>
      <defs>
        {/* arrow markers */}
        {['181410', '39312a'].map(c => (
          <marker key={c} id={`arrow-${c}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={`#${c}`} />
          </marker>
        ))}
      </defs>

      {/* Title */}
      <text x={50} y={56} fontFamily="'Tele2 Sans', sans-serif" fontSize="12" letterSpacing="2" fill="#6a6055" style={{ textTransform: 'uppercase' }}>Lärmig · Flow map</text>
      <text x={50} y={100} fontFamily="'Tele2 Text', serif" fontSize="34" fill="#181410" fontWeight="500">Tre spår som möts i ett konto</text>
      <text x={50} y={130} fontFamily="'Tele2 Sans', sans-serif" fontSize="14" fill="#6a6055">Ny användare · Barn bjuds in av kompis · Barn når gräns → förälder kopplas på</text>
      <line x1={50} y1={160} x2={W - 50} y2={160} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />

      {/* ————— Track 1: Förälder skapar, lägger till barn ————— */}
      <Track y={y1} title="SPÅR 01" subtitle="Förälder först → barn skapas senare" tint="#b48cff" />

      <Node x={col(0)} y={y1 + 140} eyebrow="Landning" title="Logga in" tone="light" icon={icons.user} />
      <Node x={col(1)} y={y1 + 140} eyebrow="Onboarding" title="Skapa föräldrakonto" tone="dark" icon={icons.mail} tint="#b48cff" />
      <Node x={col(2)} y={y1 + 140} eyebrow="Förälder" title="Hantera barn" tone="light" icon={icons.parent} />
      <Node x={col(3)} y={y1 + 140} eyebrow="Förälder" title="Skapa arbets­område" tone="light" icon={icons.home} />
      <Node x={col(4)} y={y1 + 140} eyebrow="Förälder" title="Dela med barn (QR)" tone="light" icon={icons.share} tint="#ff8566" />
      <Node x={col(5)} y={y1 + 140} eyebrow="Barn" title="Logga in med pinkod" tone="light" icon={icons.pin} />
      <Node x={col(6)} y={y1 + 140} eyebrow="Barn" title="Hemmet &#8212; alla moment" tone="dark" icon={icons.home} />

      {/* Arrows for track 1 */}
      <Arrow from={[col(0) + 75, y1 + 140]} to={[col(1) - 75, y1 + 140]} label='"Skapa konto"' />
      <Arrow from={[col(1) + 75, y1 + 140]} to={[col(2) - 75, y1 + 140]} label="efter registrering" />
      <Arrow from={[col(2) + 75, y1 + 140]} to={[col(3) - 75, y1 + 140]} label='"+ Lägg till"' />
      <Arrow from={[col(3) + 75, y1 + 140]} to={[col(4) - 75, y1 + 140]} label="spara" />
      <Arrow from={[col(4) + 75, y1 + 140]} to={[col(5) - 75, y1 + 140]} label="barnet scannar" />
      <Arrow from={[col(5) + 75, y1 + 140]} to={[col(6) - 75, y1 + 140]} label="logga in" />

      {/* ————— Track 2: Barn bjuds in av kompis ————— */}
      <Track y={y2} title="SPÅR 02" subtitle="Barn → barn · kompis delar QR" tint="#ff8566" />

      <Node x={col(0)} y={y2 + 140} eyebrow="Annas telefon" title="Dela arbets­område" tone="light" icon={icons.qr} tint="#ff8566" />
      <Node x={col(1)} y={y2 + 140} eyebrow="Kompis scannar" title="Inbjudan öppnad" tone="light" icon={icons.mail} tint="#ffc738" />
      <Node x={col(2)} y={y2 + 140} eyebrow="Onboarding" title="Skapa barnkonto (steg 1–3)" tone="dark" icon={icons.user} tint="#ff8566" />
      <Node x={col(3)} y={y2 + 140} eyebrow="Barn" title="Användar&shy;namn + pinkod" tone="light" icon={icons.pin} />
      <Node x={col(4)} y={y2 + 140} eyebrow="Barn" title="Kör igång i arbets­området" tone="dark" icon={icons.chat} tint="#6ec79f" />

      <Arrow from={[col(0) + 75, y2 + 140]} to={[col(1) - 75, y2 + 140]} label='"Dela QR"' />
      <Arrow from={[col(1) + 75, y2 + 140]} to={[col(2) - 75, y2 + 140]} label="klicka länken" />
      <Arrow from={[col(2) + 75, y2 + 140]} to={[col(3) - 75, y2 + 140]} label="skriv in" />
      <Arrow from={[col(3) + 75, y2 + 140]} to={[col(4) - 75, y2 + 140]} label='"Kom igång 🚀"' />

      {/* Cross-track arrow: Spår 02 → Spår 03 (barn fortsätter, når gräns senare) */}
      <Arrow from={[col(4), y2 + 140 + 135]} to={[col(0) + 30, y3 + 140 - 135]} curve={60} dashed={true} label="senare · efter 3 moment" />

      {/* ————— Track 3: Barn når gräns → förälder kopplas på ————— */}
      <Track y={y3} title="SPÅR 03" subtitle="Barn når gräns → förälder blir huvudkonto" tint="#6ec79f" />

      <Node x={col(0)} y={y3 + 140} eyebrow="Barn" title="Dagens moment slut" tone="dark" icon={icons.lock} tint="#ff8566" />
      <Node x={col(1)} y={y3 + 140} eyebrow="Banner på hem" title='"Be förälder ta över"' tone="light" icon={icons.parent} tint="#ffc738" />
      <Node x={col(2)} y={y3 + 140} eyebrow="Förälder" title="Tar telefonen" tone="light" icon={icons.user} />
      <Node x={col(3)} y={y3 + 140} eyebrow="Onboarding" title="Skapa förälder­konto ovanpå" tone="dark" icon={icons.mail} tint="#b48cff" />
      <Node x={col(4)} y={y3 + 140} eyebrow="Bekräftelse" title="Barnet länkat — progress kvar" tone="light" icon={icons.check} tint="#6ec79f" />
      <Node x={col(5)} y={y3 + 140} eyebrow="Förälder" title="Förälder-hem (huvudkonto)" tone="light" icon={icons.home} />
      <Node x={col(6)} y={y3 + 140} eyebrow="Barn" title="Tillbaka — obegränsat" tone="dark" icon={icons.chat} tint="#6ec79f" />

      <Arrow from={[col(0) + 75, y3 + 140]} to={[col(1) - 75, y3 + 140]} label="3:e momentet" />
      <Arrow from={[col(1) + 75, y3 + 140]} to={[col(2) - 75, y3 + 140]} label='"Be förälder"' />
      <Arrow from={[col(2) + 75, y3 + 140]} to={[col(3) - 75, y3 + 140]} label="tar över" />
      <Arrow from={[col(3) + 75, y3 + 140]} to={[col(4) - 75, y3 + 140]} label='"Skapa & koppla"' />
      <Arrow from={[col(4) + 75, y3 + 140]} to={[col(5) - 75, y3 + 140]} label="auto" />
      <Arrow from={[col(5) + 75, y3 + 140]} to={[col(6) - 75, y3 + 140]} label="lämna tillbaka" />

      {/* Legend */}
      <g transform={`translate(50, ${H - 30})`}>
        <circle cx={6} cy={0} r={6} fill="#b48cff" />
        <text x={20} y={4} fontFamily="'Tele2 Sans', sans-serif" fontSize="12" fill="#39312a">Förälder-spår</text>
        <circle cx={150} cy={0} r={6} fill="#ff8566" />
        <text x={164} y={4} fontFamily="'Tele2 Sans', sans-serif" fontSize="12" fill="#39312a">Barn-spår</text>
        <circle cx={290} cy={0} r={6} fill="#6ec79f" />
        <text x={304} y={4} fontFamily="'Tele2 Sans', sans-serif" fontSize="12" fill="#39312a">Lyckad anslutning / fortsatt lärande</text>

        <line x1={560} y1={0} x2={600} y2={0} stroke="#181410" strokeWidth={2} strokeDasharray="4 5" />
        <text x={608} y={4} fontFamily="'Tele2 Sans', sans-serif" fontSize="12" fill="#39312a">Tidshopp (senare i upplevelsen)</text>
      </g>
    </svg>
  );
}

Object.assign(window, { FlowMap });
