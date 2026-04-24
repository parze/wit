// Login — tabbed: Förälder (email + pass) / Barn (username + 4-digit PIN)
function ScreenLogin({ initialTab = 'parent' }) {
  const [tab, setTab] = React.useState(initialTab);
  const [pin, setPin] = React.useState(['2', '7', '4', '']);

  const Tabs = (
    <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--paper-2)', borderRadius: 999, marginBottom: 18 }}>
      {[['parent', 'Förälder'], ['child', 'Barn']].map(([k, label]) => (
        <button key={k} onClick={() => setTab(k)} style={{
          flex: 1, padding: '10px 14px', borderRadius: 999, border: 0,
          background: tab === k ? 'var(--ink)' : 'transparent',
          color: tab === k ? '#fff' : 'var(--ink-2)',
          fontWeight: 500, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
        }}>{label}</button>
      ))}
    </div>
  );

  return (
    <div className="lm-screen">
      <div style={{ padding: '64px 28px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <BrandMark size={52} />
        <Wordmark size={36} />
        <div className="lm-meta" style={{ marginTop: 2 }}>Roligare läxläsning för hela familjen</div>
      </div>
      <div className="lm-scroll" style={{ padding: '8px 22px 22px' }}>
        <div className="lm-card" style={{ padding: 20, borderRadius: 28, boxShadow: 'var(--shadow-1)' }}>
          {Tabs}
          {tab === 'parent' ? (
            <>
              <div className="lm-h3" style={{ marginBottom: 14 }}>Logga in</div>
              <label className="lm-label">E-post</label>
              <input className="lm-input" defaultValue="sara@example.se" style={{ marginBottom: 14 }} />
              <label className="lm-label">Lösenord</label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <input className="lm-input" type="password" defaultValue="········" style={{ paddingRight: 48 }} />
                <button style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 0, width: 36, height: 36, borderRadius: 999, color: 'var(--ink-3)', cursor: 'pointer' }}>{Icon.eye()}</button>
              </div>
              <a style={{ display: 'block', textAlign: 'right', fontSize: 13, color: 'var(--ink-2)', textDecoration: 'underline', textUnderlineOffset: 3, marginBottom: 16 }}>Glömt lösenord?</a>
              <button className="lm-btn lm-btn-primary lm-btn-block lm-btn-xl">Logga in</button>
            </>
          ) : (
            <>
              <div className="lm-h3" style={{ marginBottom: 6 }}>Hej! 👋</div>
              <div className="lm-meta" style={{ marginBottom: 16 }}>Skriv ditt användarnamn och din fyrsiffriga kod.</div>
              <label className="lm-label">Användarnamn</label>
              <input className="lm-input lm-input-pill" defaultValue="anna_8" style={{ marginBottom: 18, fontSize: 17 }} />
              <label className="lm-label">Pinkod</label>
              <div
                style={{ position: 'relative', marginBottom: 8 }}
                onClick={() => {
                  const el = document.getElementById('lm-pin-input');
                  if (el) el.focus();
                }}
              >
                <input
                  id="lm-pin-input"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoComplete="one-time-code"
                  value={pin.join('')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                    const next = ['', '', '', ''];
                    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
                    setPin(next);
                  }}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    opacity: 0, border: 0, background: 'transparent',
                    fontSize: 16, // avoid iOS zoom
                    caretColor: 'transparent', color: 'transparent',
                    letterSpacing: '1em',
                  }}
                />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', pointerEvents: 'none' }}>
                  {pin.map((d, i) => {
                    const activeIdx = pin.findIndex(x => !x);
                    const isActive = activeIdx === -1 ? i === 3 : i === activeIdx;
                    return (
                      <div key={i} style={{
                        flex: 1, aspectRatio: '1 / 1.05',
                        borderRadius: 18,
                        background: d ? 'var(--ink)' : 'var(--paper-2)',
                        color: d ? '#fff' : 'var(--ink-4)',
                        border: isActive ? '2px solid var(--coral)' : '2px solid transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, fontWeight: 500, fontFamily: 'var(--font-serif)',
                        transition: 'background 180ms, border-color 180ms',
                      }}>{d ? '•' : ''}</div>
                    );
                  })}
                </div>
              </div>
              <div className="lm-meta" style={{ fontSize: 12, marginBottom: 18, textAlign: 'center' }}>Tryck för att skriva in din kod</div>
              <button className="lm-btn lm-btn-primary lm-btn-block lm-btn-xl">Logga in</button>
            </>
          )}
        </div>
        {tab === 'parent' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 4px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
              <div className="lm-meta">eller</div>
              <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
            </div>
            <button className="lm-btn lm-btn-white lm-btn-block" style={{ padding: '14px', border: '1.5px solid var(--hairline-2)' }}>
              Skapa föräldrakonto
              <span style={{ marginLeft: 4 }}>{Icon.chevron('var(--ink)', 14)}</span>
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--ink-3)' }}>
            Glömt din kod? <a style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}>Fråga din förälder</a>
          </div>
        )}
      </div>
    </div>
  );
}

// Screen 2: Register (förälder)
function ScreenRegister() {
  return (
    <div className="lm-screen">
      <div className="lm-topbar"><div className="lm-back">{Icon.back()}</div><div className="lm-title">Nytt konto</div></div>
      <div className="lm-scroll" style={{ padding: '8px 22px 22px' }}>
        <div style={{ padding: '24px 4px 18px' }}>
          <div className="lm-eyebrow" style={{ marginBottom: 8 }}>Förälder</div>
          <div className="lm-display" style={{ fontSize: 34 }}>Skapa ett<br/>konto.</div>
          <div className="lm-meta" style={{ marginTop: 10, maxWidth: 300 }}>Du skapar ditt föräldrakonto — barn läggs till sedan.</div>
        </div>
        <div className="lm-card" style={{ padding: 20, borderRadius: 24 }}>
          <label className="lm-label">Ditt namn</label>
          <input className="lm-input" defaultValue="Sara Lindqvist" style={{ marginBottom: 14 }} />
          <label className="lm-label">E-post</label>
          <input className="lm-input" defaultValue="sara@example.se" style={{ marginBottom: 14 }} />
          <label className="lm-label">Lösenord</label>
          <div style={{ position: 'relative' }}>
            <input className="lm-input" type="password" defaultValue="········" />
            <button style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 0, width: 36, height: 36, borderRadius: 999, color: 'var(--ink-3)', cursor: 'pointer' }}>{Icon.eye()}</button>
          </div>
          <div className="lm-meta" style={{ marginTop: 8, fontSize: 12 }}>Minst 6 tecken</div>
        </div>
        <button className="lm-btn lm-btn-primary lm-btn-block lm-btn-xl" style={{ marginTop: 18 }}>Skapa konto</button>
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--ink-3)' }}>
          Har du redan konto? <a style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}>Logga in</a>
        </div>
      </div>
    </div>
  );
}

// Forgot password — parent flow, two states: request email → sent confirmation
function ScreenForgotPassword({ state = 'request' }) {
  return (
    <div className="lm-screen">
      <div className="lm-topbar"><div className="lm-back">{Icon.back()}</div><div className="lm-title">Glömt lösenord</div></div>
      <div className="lm-scroll" style={{ padding: '8px 22px 22px' }}>
        {state === 'request' ? (
          <>
            <div style={{ padding: '24px 4px 18px' }}>
              <div className="lm-eyebrow" style={{ marginBottom: 8 }}>Förälder</div>
              <div className="lm-display" style={{ fontSize: 32, lineHeight: 1.05 }}>Återställ ditt<br/>lösenord.</div>
              <div className="lm-meta" style={{ marginTop: 12, maxWidth: 320 }}>
                Skriv in e-postadressen kopplad till ditt konto så skickar vi en länk där du kan välja ett nytt lösenord.
              </div>
            </div>
            <div className="lm-card" style={{ padding: 20, borderRadius: 24 }}>
              <label className="lm-label">E-post</label>
              <input className="lm-input" defaultValue="sara@example.se" autoFocus />
              <div className="lm-meta" style={{ marginTop: 10, fontSize: 12 }}>Kolla även skräpposten om mejlet inte dyker upp inom några minuter.</div>
            </div>
            <button className="lm-btn lm-btn-primary lm-btn-block lm-btn-xl" style={{ marginTop: 18 }}>Skicka länk</button>
            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--ink-3)' }}>
              Kommer du på det? <a style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}>Tillbaka till inloggning</a>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '32px 4px 20px', textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 22, background: 'var(--mint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                {Icon.check('#fff', 36)}
              </div>
              <div className="lm-display" style={{ fontSize: 30, lineHeight: 1.05 }}>Mejl skickat!</div>
              <div className="lm-meta" style={{ marginTop: 12, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
                Vi har skickat en återställnings­länk till <strong style={{ color: 'var(--ink)' }}>sara@example.se</strong>. Öppna mejlet och följ länken.
              </div>
            </div>
            <div className="lm-card" style={{ padding: 18, borderRadius: 22, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--paper-2)' }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                {Icon.invite('var(--ink)', 20)}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Öppna din e-post</div>
                <div className="lm-meta" style={{ fontSize: 12 }}>Länken gäller i 30 minuter</div>
              </div>
              <span style={{ color: 'var(--ink-3)' }}>{Icon.chevron('var(--ink-3)', 14)}</span>
            </div>
            <button className="lm-btn lm-btn-white lm-btn-block" style={{ marginTop: 14, padding: '14px', border: '1.5px solid var(--hairline-2)' }}>Skicka igen</button>
            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--ink-3)' }}>
              <a style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}>Tillbaka till inloggning</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenLogin, ScreenRegister, ScreenForgotPassword });
