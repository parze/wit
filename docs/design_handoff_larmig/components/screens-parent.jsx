// Screen 5: Share (QR)
function ScreenShare() {
  return (
    <div className="lm-screen">
      <div className="lm-topbar"><div className="lm-back">{Icon.back()}</div>
        <div className="lm-col" style={{ flex: 1, minWidth: 0 }}>
          <div className="lm-title">Dela område</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Nordens länder</div>
          <div style={{ display: 'none' }}>{/* kurs */}</div>
        </div>
      </div>
      <div className="lm-scroll" style={{ padding: '16px 22px 24px' }}>
        <div style={{
          background: 'linear-gradient(180deg,var(--cream) 0%,var(--paper) 80%)',
          borderRadius: 28, padding: '28px 20px 22px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          border: '1px solid var(--hairline)',
        }}>
          <div className="lm-eyebrow" style={{ marginBottom: 10 }}>Inbjudan</div>
          <div className="lm-h2" style={{ textAlign: 'center', marginBottom: 4 }}>Låt barnet skanna</div>
          <div className="lm-meta" style={{ textAlign: 'center', maxWidth: 260, marginBottom: 20 }}>Öppna kameran på barnets enhet och rikta den mot koden.</div>
          <div style={{ padding: 14, background: 'var(--white)', borderRadius: 26, boxShadow: 'var(--shadow-2)', position: 'relative' }}>
            <QRPlaceholder size={200} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: 48, height: 48, borderRadius: 14, background: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '4px solid var(--white)', boxShadow: 'var(--shadow-1)',
            }}>
              <BrandMark size={28} />
            </div>
          </div>
        </div>

        <div className="lm-card" style={{ marginTop: 16, padding: 16, borderRadius: 20 }}>
          <div className="lm-eyebrow" style={{ marginBottom: 8 }}>Länk</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, padding: '12px 14px', background: 'var(--paper-2)', borderRadius: 12, fontSize: 13, fontFamily: 'var(--font-mono, monospace)', color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              app.lärmig.se/invite/k8Xz3d
            </div>
            <button className="lm-btn lm-btn-primary lm-btn-sm" style={{ padding: '10px 12px' }}>{Icon.copy('#fff')}</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className="lm-btn lm-btn-white" style={{ flex: 1, padding: '14px', gap: 8 }}>{Icon.share('var(--ink)')} Dela</button>
          <button className="lm-btn lm-btn-white" style={{ flex: 1, padding: '14px', gap: 8, color: 'var(--berry)' }}>{Icon.trash('var(--berry)')} Återkalla</button>
        </div>

        <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--paper-2)', borderRadius: 16, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--ink)' }}>Tips:</strong> länken går att använda flera gånger — perfekt om flera syskon ska gå med.
        </div>
      </div>
    </div>
  );
}

// Screen 6: Manage children (Hantera barn)
function ScreenChildren() {
  const kids = [
    { name: 'Anna Lindqvist', user: 'anna_8', year: 2016, gender: 'Flicka', color: 'linear-gradient(135deg,var(--sun),var(--coral))' },
    { name: 'Erik Lindqvist', user: 'erik_e', year: 2013, gender: 'Pojke', color: 'linear-gradient(135deg,var(--sky),var(--grape))' },
    { name: 'Maja Lindqvist', user: 'maja_m', year: 2018, gender: 'Flicka', color: 'linear-gradient(135deg,var(--mint),var(--sky))' },
  ];
  return (
    <div className="lm-screen">
      <div style={{ padding: '56px 22px 10px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="lm-eyebrow" style={{ marginBottom: 4 }}>{kids.length} barn</div>
          <div className="lm-h1">Dina barn</div>
        </div>
        <button className="lm-btn lm-btn-primary lm-btn-sm" style={{ gap: 6 }}>{Icon.plus('#fff', 14)} Nytt barn</button>
      </div>
      <div className="lm-scroll" style={{ padding: '14px 22px 80px' }}>
        {/* Expanded new-child form card */}
        <div style={{
          background: 'var(--ink)', color: 'var(--white)',
          borderRadius: 22, padding: 20, marginBottom: 16, position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="lm-chip lm-chip-sun">Nytt barn</span>
            </div>
            <button style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>{Icon.close('currentColor')}</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / 3' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Namn</div>
              <input className="lm-input" placeholder="t.ex. Lova" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Användarnamn</div>
              <input className="lm-input" placeholder="lova_l" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Lösenord</div>
              <input className="lm-input" placeholder="••••" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Födelseår</div>
              <input className="lm-input" placeholder="2017" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Kön</div>
              <div className="lm-input" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Välj…</span>{Icon.chevronDown('rgba(255,255,255,0.6)')}
              </div>
            </div>
          </div>
          <button className="lm-btn lm-btn-accent lm-btn-block" style={{ marginTop: 16 }}>Skapa barnkonto</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {kids.map((k, i) => (
            <div key={i} className="lm-card" style={{ padding: 14, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 999, background: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', fontWeight: 600, fontSize: 20, flexShrink: 0 }}>{k.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 15 }}>{k.name}</div>
                <div className="lm-meta" style={{ fontSize: 12 }}>@{k.user} · född {k.year} · {k.gender}</div>
              </div>
              <button style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--paper-2)', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{Icon.dots('var(--ink-3)')}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenShare, ScreenChildren });
