// Create-course flow — Parent
// Three screens:
//  1. Upload:   lägg till dokument (PDF/DOCX/TXT)
//  2. Prepare:  kompilerar material, detekterar lärstil (loading)
//  3. Name:     granska + namnge + spara

// Shared step header (three-dot progress)
function CreateStepHeader({ step, onBack, onClose }) {
  const steps = [
    { id: 1, label: 'Material' },
    { id: 2, label: 'Förbereder' },
    { id: 3, label: 'Namnge' },
  ];
  return (
    <div style={{ padding: '10px 20px 14px', background: 'var(--paper)', position: 'relative', zIndex: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="lm-back" onClick={onBack} style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--white)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>{Icon.back()}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="lm-eyebrow" style={{ marginBottom: 2 }}>Steg {step} av 3</div>
          <div style={{ fontWeight: 500, fontSize: 15, letterSpacing: '-0.01em' }}>{steps[step - 1].label}</div>
        </div>
        {onClose && <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--white)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>{Icon.close('var(--ink-2)')}</button>}
      </div>
      {/* Segmented progress */}
      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        {steps.map(s => (
          <div key={s.id} style={{
            flex: 1, height: 4, borderRadius: 999,
            background: s.id <= step ? 'var(--ink)' : 'var(--hairline)',
            transition: 'background 200ms',
          }} />
        ))}
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————
// STEG 1 — Ladda upp läromedel
// ————————————————————————————————————————————————

// Small file-type badge
function FileTypeIcon({ ext, size = 40 }) {
  const colors = {
    pdf:  { bg: '#ffe0d8', fg: '#c64726' },
    docx: { bg: '#d8e4ff', fg: '#1548c9' },
    doc:  { bg: '#d8e4ff', fg: '#1548c9' },
    txt:  { bg: 'var(--paper-3)', fg: 'var(--ink-2)' },
    img:  { bg: '#ffe9b0', fg: '#a37a00' },
  };
  const c = colors[ext] || colors.txt;
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, background: c.bg, color: c.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
      flexShrink: 0, position: 'relative', fontFamily: 'var(--font-sans)',
    }}>
      {/* folded-corner illusion */}
      <span style={{ position: 'absolute', top: 0, right: 0, width: 10, height: 10, background: 'rgba(0,0,0,0.08)', borderBottomLeftRadius: 6 }} />
      {ext}
    </div>
  );
}

function ScreenCreateCourseUpload({ role = 'parent' }) {
  const isChild = role === 'child';
  // Two states in one screen — shown as realistic populated state with an upload CTA at top
  const files = [
    { name: 'Nordens_länder_kap3.pdf', ext: 'pdf', size: '2,4 MB', pages: 12 },
    { name: 'Finland_anteckningar.docx', ext: 'docx', size: '340 kB', pages: 4 },
    { name: 'Huvudstäder_lista.txt', ext: 'txt', size: '12 kB', pages: 1 },
  ];
  const totalPages = files.reduce((a, f) => a + f.pages, 0);

  return (
    <div className="lm-screen">
      <CreateStepHeader step={1} />
      <div className="lm-scroll" style={{ padding: '8px 22px 24px' }}>
        <div className="lm-display" style={{ fontSize: 30, marginTop: 4, marginBottom: 6, letterSpacing: '-0.03em' }}>{isChild ? 'Vad vill du lära dig?' : <>Vilket material&nbsp;ska vi jobba med?</>}</div>
        <div className="lm-meta" style={{ marginBottom: 20 }}>{isChild ? 'Ladda upp boken, anteckningar eller det läraren skickat. Vi gör om det till något roligt.' : 'Ladda upp skolböcker, anteckningar eller instuderingsfrågor. Lärmig bygger en kurs utifrån innehållet.'}</div>

        {/* Upload drop zone */}
        <div style={{
          border: '1.5px dashed var(--hairline-2)', borderRadius: 22, padding: '22px 18px',
          background: 'var(--white)', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18,
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>Lägg till filer</div>
            <div className="lm-meta" style={{ fontSize: 12 }}>PDF, DOCX, TXT · upp till 25 MB</div>
          </div>
          <button className="lm-btn lm-btn-primary lm-btn-sm" style={{ padding: '10px 14px', gap: 4 }}>{Icon.plus('#fff', 14)}</button>
        </div>

        {/* File list */}
        <div className="lm-eyebrow" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
          <span>Uppladdade</span>
          <span style={{ color: 'var(--ink-3)' }}>{files.length} filer · {totalPages} sidor</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
          {files.map((f, i) => (
            <div key={i} className="lm-card" style={{ padding: 12, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileTypeIcon ext={f.ext} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div className="lm-meta" style={{ fontSize: 12, marginTop: 2 }}>{f.size} · {f.pages} {f.pages === 1 ? 'sida' : 'sidor'}</div>
              </div>
              <button style={{ width: 32, height: 32, borderRadius: 999, background: 'transparent', border: 0, color: 'var(--ink-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.trash('var(--ink-3)')}</button>
            </div>
          ))}
        </div>

        {/* Optional: klistra in text */}
        <div style={{ padding: 14, background: 'var(--paper-2)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Klistra in text</div>
            <div className="lm-meta" style={{ fontSize: 11 }}>Har du bara ett stycke? Kör.</div>
          </div>
          {Icon.chevron('var(--ink-3)', 14)}
        </div>

        <button className="lm-btn lm-btn-primary lm-btn-block lm-btn-xl" style={{ gap: 8 }}>
          Förbered material {Icon.chevron('#fff', 14)}
        </button>
        <div className="lm-meta" style={{ textAlign: 'center', marginTop: 10, fontSize: 12 }}>Tar ~30 sekunder</div>
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————
// STEG 2 — Förbereder (loading)
// ————————————————————————————————————————————————

function ScreenCreateCoursePreparing({ role = 'parent' }) {
  // Substeps — second one is "active"
  const subs = [
    { label: 'Läser in dokument', state: 'done', detail: '3 filer · 17 sidor' },
    { label: 'Extraherar begrepp och sammanhang', state: 'active', detail: 'Hittat 42 begrepp' },
    { label: 'Detekterar lärstil', state: 'pending', detail: 'Analyserar struktur' },
    { label: 'Bygger moment', state: 'pending', detail: 'Läs, lär, förhör' },
  ];
  const progress = 58;

  return (
    <div className="lm-screen">
      <CreateStepHeader step={2} />
      <div className="lm-scroll" style={{ padding: '8px 22px 24px', display: 'flex', flexDirection: 'column' }}>

        {/* Hero: animated-looking progress ring */}
        <div style={{
          marginTop: 10, marginBottom: 18,
          background: 'var(--ink)', color: 'var(--white)',
          borderRadius: 28, padding: '28px 22px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* decorative */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'var(--coral)', opacity: 0.22 }} />
          <div style={{ position: 'absolute', bottom: -50, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'var(--grape)', opacity: 0.18 }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
              <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
                <circle cx="36" cy="36" r="30" fill="none" stroke="var(--sun)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(progress/100) * 2 * Math.PI * 30} ${2 * Math.PI * 30}`} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 17 }}>{progress}%</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lm-eyebrow" style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Lärmig förbereder</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 22, lineHeight: 1.1, letterSpacing: '-0.02em' }}>Nordens länder</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Cirka 12 sekunder kvar</div>
            </div>
          </div>
        </div>

        <div className="lm-eyebrow" style={{ marginBottom: 10 }}>Det här händer</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subs.map((s, i) => {
            const done = s.state === 'done';
            const active = s.state === 'active';
            return (
              <div key={i} className="lm-card" style={{
                padding: 14, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12,
                opacity: s.state === 'pending' ? 0.55 : 1,
                borderColor: active ? 'var(--ink)' : 'var(--hairline)',
                borderWidth: active ? 1.5 : 1,
                borderStyle: 'solid',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: done ? 'var(--mint)' : (active ? 'var(--sun)' : 'var(--paper-2)'),
                  color: done ? '#fff' : 'var(--ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  {done && Icon.check('#fff', 14)}
                  {active && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'lmspin 1.2s linear infinite' }}>
                      <path d="M12 2a10 10 0 0110 10" />
                    </svg>
                  )}
                  {s.state === 'pending' && <div style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink-4)' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</div>
                  <div className="lm-meta" style={{ fontSize: 12, marginTop: 2 }}>{s.detail}</div>
                </div>
              </div>
            );
          })}
        </div>

        <style>{`@keyframes lmspin{to{transform:rotate(360deg)}}`}</style>

        <div style={{
          marginTop: 22, padding: '14px 16px',
          background: 'var(--paper-2)', borderRadius: 16,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}>{Icon.sparkle('var(--grape)', 18)}</span>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
            Du kan stänga appen — vi fortsätter i bakgrunden och pingar när det är klart.
          </div>
        </div>
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————
// STEG 3 — Namnge & skapa
// ————————————————————————————————————————————————

function ScreenCreateCourseName({ role = 'parent' }) {
  const isChild = role === 'child';
  const concepts = ['Sverige', 'Norge', 'Finland', 'Danmark', 'Island', 'Huvudstäder', 'Språk', 'Geografi', 'Flaggor'];
  const stats = [
    { label: 'Moment', value: '7' },
    { label: 'Begrepp', value: '42' },
    { label: 'Frågor', value: '28' },
  ];

  return (
    <div className="lm-screen">
      <CreateStepHeader step={3} />
      <div className="lm-scroll" style={{ padding: '8px 22px 24px' }}>
        {/* Success hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {Icon.check('#fff', 18)}
          </div>
          <div className="lm-eyebrow" style={{ color: 'var(--mint)' }}>Kursen är redo</div>
        </div>

        <div className="lm-display" style={{ fontSize: 28, marginBottom: 16, letterSpacing: '-0.03em' }}>{isChild ? 'Vad ska kursen heta?' : 'Ge kursen ett namn'}</div>

        {/* Name input */}
        <div style={{ marginBottom: 18 }}>
          <input className="lm-input lm-input-pill" defaultValue="Nordens länder" style={{ fontSize: 17, fontWeight: 500, padding: '16px 20px' }} />
          <div className="lm-meta" style={{ fontSize: 12, marginTop: 6, paddingLeft: 4 }}>{isChild ? 'Hitta på något du känner igen!' : 'Namnet syns för barnet i "Mina kurser"'}</div>
        </div>

        {/* Detected learning style — the important reveal */}
        <div style={{
          background: 'var(--white)', borderRadius: 22,
          border: '1px solid var(--hairline)', padding: '18px 18px 16px',
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span className="lm-chip lm-chip-sun">{Icon.sparkle('var(--ink)', 12)} Lärstil</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Upptäckt av Lärmig</span>
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 6 }}>
            Geografi — faktabaserad
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Mycket namn och siffror att memorera. Vi rekommenderar <strong>Förhör mig</strong> som huvudläge, med korta <strong>Läs o lär</strong>-pass emellan.
          </div>

          {/* Mode recommendation bars */}
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { key: 'read', label: 'Läs o lär', pct: 35, color: 'var(--sky)' },
              { key: 'learn', label: 'Lär mig', pct: 20, color: 'var(--grape)' },
              { key: 'quiz', label: 'Förhör mig', pct: 45, color: 'var(--berry)', primary: true },
            ].map(m => (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, width: 82, color: m.primary ? 'var(--ink)' : 'var(--ink-3)', fontWeight: m.primary ? 500 : 400 }}>{m.label}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--paper-3)', overflow: 'hidden' }}>
                  <div style={{ width: `${m.pct}%`, height: '100%', background: m.color, borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', width: 30, textAlign: 'right' }}>{m.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* What's inside */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              background: 'var(--paper-2)', borderRadius: 16, padding: '12px 10px',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div className="lm-meta" style={{ fontSize: 11, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Concept chips */}
        <div className="lm-eyebrow" style={{ marginBottom: 8 }}>Begrepp vi hittade</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {concepts.map((c, i) => (
            <span key={i} style={{
              padding: '6px 10px', borderRadius: 999,
              background: 'var(--white)', border: '1px solid var(--hairline)',
              fontSize: 12, color: 'var(--ink-2)',
            }}>{c}</span>
          ))}
          <span style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ink-3)' }}>+33 till</span>
        </div>

        {/* Assign to children (parent only) */}
        {!isChild && <>
          <div className="lm-eyebrow" style={{ marginBottom: 6 }}>Vem ska få kursen</div>
          <div className="lm-meta" style={{ fontSize: 12, marginBottom: 10 }}>Välj minst ett barn — det är de som ser kursen i sin app.</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
            {[
              { name: 'Anna', color: 'linear-gradient(135deg,var(--sun),var(--coral))', selected: true },
              { name: 'Erik', color: 'linear-gradient(135deg,var(--sky),var(--grape))', selected: false },
              { name: 'Maja', color: 'linear-gradient(135deg,var(--mint),var(--sky))', selected: false },
            ].map((k, i) => (
              <button key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 14px 6px 6px', borderRadius: 999,
                border: k.selected ? '1.5px solid var(--ink)' : '1.5px solid var(--hairline)',
                background: k.selected ? 'var(--ink)' : 'var(--white)',
                color: k.selected ? '#fff' : 'var(--ink)',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
              }}>
                <span style={{ width: 26, height: 26, borderRadius: 999, background: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', fontSize: 12, fontWeight: 600 }}>{k.name[0]}</span>
                {k.name}
                {k.selected && <span style={{ marginLeft: 2 }}>{Icon.check('#fff', 12)}</span>}
              </button>
            ))}
          </div>
        </>}

        {/* Child-only: privacy reassurance */}
        {isChild && (
          <div style={{
            padding: '14px 16px', marginBottom: 22,
            background: 'var(--paper-2)', borderRadius: 16,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </span>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              Bara du ser den här kursen. Vill du att kompisar också ska kunna plugga? Tryck <strong style={{ color: 'var(--ink)' }}>Dela med kompis</strong> när kursen är skapad.
            </div>
          </div>
        )}

        {/* Primary CTA */}
        <button className="lm-btn lm-btn-primary lm-btn-block lm-btn-xl">
          Skapa kurs
        </button>
        <button className="lm-btn lm-btn-ghost lm-btn-block" style={{ marginTop: 8, padding: '14px' }}>
          Spara som utkast
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenCreateCourseUpload, ScreenCreateCoursePreparing, ScreenCreateCourseName });
