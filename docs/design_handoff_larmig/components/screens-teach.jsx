// Screen 7: Läs o lär (TTS) - reading with word highlight
function ScreenTeachMe() {
  return (
    <div className="lm-screen" style={{ background: 'var(--paper)' }}>
      <div className="lm-topbar" style={{ padding: '10px 16px 8px' }}>
        <div className="lm-back">{Icon.back()}</div>
        <div className="lm-col" style={{ flex: 1, minWidth: 0 }}>
          <div className="lm-title">Läs o lär</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Nordens länder</div>
        </div>
        <button className="lm-btn lm-btn-sm" style={{ background: 'var(--coral)', color: 'var(--white)', gap: 6, padding: '10px 14px' }}>{Icon.pause('#fff', 12)} Pausa</button>
      </div>
      <div style={{ padding: '2px 20px 14px' }}>
        <div className="lm-progress" style={{ height: 6 }}><span style={{ width: '38%', background: 'var(--coral)' }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--ink-3)' }}>
          <span>2:14</span><span>Moment 2 av 6</span><span>5:48</span>
        </div>
      </div>
      <div className="lm-scroll" style={{ padding: '8px 22px 24px', fontSize: 18, lineHeight: 1.7 }}>
        <div style={{ opacity: 0.35, marginBottom: 18 }}>
          <h2 className="lm-h2" style={{ fontSize: 20, marginBottom: 8 }}>Moment 1 — Norden i världen</h2>
          <p>Norden består av fem länder. De ligger i norra Europa och har mycket gemensamt i språk, klimat och historia.</p>
        </div>
        <div style={{
          background: 'var(--cream)', border: '1px solid rgba(255,199,56,0.4)',
          borderRadius: 20, padding: '18px 18px 20px', position: 'relative',
        }}>
          <span className="lm-chip lm-chip-sun" style={{ position: 'absolute', top: -12, left: 18 }}>Läses nu</span>
          <h2 className="lm-h2" style={{ fontSize: 20, marginBottom: 10, marginTop: 4 }}>Moment 2 — Sverige</h2>
          <p style={{ margin: 0 }}>
            Sverige är det största landet i Norden till ytan. Det{' '}
            <span style={{ background: 'var(--sun)', padding: '1px 6px', borderRadius: 6, fontWeight: 500 }}>gränsar</span>{' '}
            till Norge och Finland, och i söder förbinds det med Danmark via Öresundsbron. Huvudstaden heter Stockholm och landet har cirka tio miljoner invånare.
          </p>
        </div>
        <div style={{ opacity: 0.5, marginTop: 20 }}>
          <h2 className="lm-h2" style={{ fontSize: 20, marginBottom: 8 }}>Moment 3 — Norge</h2>
          <p>Norge är känt för sina djupa fjordar och höga berg. Landet har en lång kust mot Atlanten…</p>
        </div>
      </div>
      <div style={{ padding: '10px 22px 18px', background: 'var(--paper)', borderTop: '1px solid var(--hairline)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <button style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--white)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 19 2 12 11 5 11 19"/><polyline points="22 19 13 12 22 5 22 19"/></svg>
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--white)', borderRadius: 999, border: '1px solid var(--hairline)' }}>
            <span className="lm-chip" style={{ background: 'var(--paper-2)', color: 'var(--ink-2)', padding: '4px 10px' }}>Hastighet 1×</span>
            <div style={{ flex: 1, height: 4, background: 'var(--paper-3)', borderRadius: 999, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', background: 'var(--ink)', borderRadius: 999 }} />
            </div>
          </div>
          <button style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--white)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 19 22 12 13 5 13 19"/><polyline points="2 19 11 12 2 5 2 19"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenTeachMe });
