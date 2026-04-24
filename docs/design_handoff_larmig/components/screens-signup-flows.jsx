// Three new flows:
// 1) ScreenChildSignup — after opening a QR invite from a friend
// 2) ScreenChildHomePaywall — child hit a limit; banner "Be en förälder"
// 3) ScreenParentUpgrade — parent takes the phone, creates a parent account on top of the child

// ——————————————————————————————————————————————
// 1) Barn skapar konto (från kompis QR-länk)
// ——————————————————————————————————————————————
function ScreenChildSignup() {
  const [name, setName] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [pin2, setPin2] = React.useState('');

  const step = !name ? 1 : pin.length < 4 ? 2 : pin2.length < 4 ? 3 : 4;
  const match = pin && pin2 && pin === pin2;

  return (
    <div className="lm-screen" style={{ background: 'var(--cream-2, #f4ecdb)' }}>
      {/* Confetti-style top banner from the inviting friend */}
      <div style={{
        padding: '48px 24px 28px',
        background: 'linear-gradient(160deg, var(--coral) 0%, var(--sun) 100%)',
        color: 'var(--ink)',
        borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* decorative dots */}
        <div style={{ position: 'absolute', top: 18, right: -10, width: 90, height: 90, borderRadius: 999, background: 'rgba(255,255,255,0.22)' }} />
        <div style={{ position: 'absolute', top: 60, left: -20, width: 60, height: 60, borderRadius: 999, background: 'rgba(0,0,0,0.05)' }} />
        <div className="lm-eyebrow" style={{ marginBottom: 6 }}>Inbjudan från en kompis</div>
        <div className="lm-display" style={{ fontSize: 32, lineHeight: 1.05, maxWidth: 280 }}>
          Hej!<br/>Anna bjöd in<br/>dig 🎉
        </div>
        <div className="lm-meta" style={{ marginTop: 10, color: 'rgba(0,0,0,0.65)', maxWidth: 280 }}>
          Du har fått tillgång till kursen <strong style={{ color: 'var(--ink)' }}>Nordens länder</strong>. Hitta på ett coolt namn så kör vi!
        </div>
      </div>

      <div className="lm-scroll" style={{ padding: '20px 22px 28px' }}>
        {/* Step progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= Math.min(step, 3) ? 'var(--ink)' : 'var(--hairline)' }} />
          ))}
        </div>

        <div className="lm-card" style={{ padding: 20, borderRadius: 24 }}>
          <label className="lm-label">1. Välj ett användarnamn</label>
          <input
            className="lm-input lm-input-pill"
            placeholder="t.ex. stjärnkalle"
            value={name}
            onChange={(e) => setName(e.target.value.replace(/\s/g, ''))}
            style={{ marginBottom: 18, fontSize: 17 }}
          />

          <label className="lm-label">2. Hitta på en pinkod (4 siffror)</label>
          <PinField id="lm-pin-signup-1" value={pin} onChange={setPin} active={step === 2} />
          <div className="lm-meta" style={{ fontSize: 12, marginTop: 6, marginBottom: 18 }}>Bara du ska veta den här!</div>

          <label className="lm-label">3. Skriv din pinkod igen</label>
          <PinField id="lm-pin-signup-2" value={pin2} onChange={setPin2} active={step === 3} tone={pin2.length === 4 ? (match ? 'ok' : 'err') : 'neutral'} />
          {pin2.length === 4 && !match && (
            <div style={{ fontSize: 12, marginTop: 6, color: '#c4442a' }}>Koden stämmer inte — prova igen ✋</div>
          )}
          {pin2.length === 4 && match && (
            <div style={{ fontSize: 12, marginTop: 6, color: 'var(--mint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {Icon.check('var(--mint)', 12)} Perfekt! Du kommer ihåg det 💪
            </div>
          )}
        </div>

        <button
          className="lm-btn lm-btn-primary lm-btn-block lm-btn-xl"
          style={{ marginTop: 20, opacity: match && name ? 1 : 0.45 }}
          disabled={!(match && name)}
        >
          Kom igång 🚀
        </button>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--ink-4)' }}>
          Din förälder kan koppla på sig senare — din progress sparas alltid.
        </div>
      </div>
    </div>
  );
}

// Reusable pin field that opens the native numeric keyboard
function PinField({ id, value, onChange, active, tone = 'neutral' }) {
  const digits = value.padEnd(4, ' ').slice(0, 4).split('');
  return (
    <div
      style={{ position: 'relative' }}
      onClick={() => document.getElementById(id)?.focus()}
    >
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, border: 0, background: 'transparent',
          fontSize: 16, caretColor: 'transparent', color: 'transparent',
        }}
      />
      <div style={{ display: 'flex', gap: 10, pointerEvents: 'none' }}>
        {digits.map((d, i) => {
          const filled = d.trim() !== '';
          const isActive = active && i === value.length;
          const borderCol =
            tone === 'err' ? '#e26a4a' :
            tone === 'ok' ? 'var(--mint)' :
            isActive ? 'var(--coral)' : 'transparent';
          return (
            <div key={i} style={{
              flex: 1, aspectRatio: '1 / 1.05',
              borderRadius: 18,
              background: filled ? 'var(--ink)' : 'var(--paper-2)',
              color: filled ? '#fff' : 'var(--ink-4)',
              border: `2px solid ${borderCol}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 500, fontFamily: 'var(--font-serif)',
              transition: 'background 180ms, border-color 180ms',
            }}>{filled ? '•' : ''}</div>
          );
        })}
      </div>
    </div>
  );
}

// ——————————————————————————————————————————————
// 2) Barnet nått en gräns → "Be en förälder" banner
// ——————————————————————————————————————————————
function ScreenChildHomePaywall() {
  return (
    <div className="lm-screen">
      <div style={{ padding: '14px 22px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Wordmark size={24} />
          <div style={{ width: 36, height: 36, borderRadius: 999, background: 'linear-gradient(135deg, var(--coral), var(--sun))' }} />
        </div>
        <div className="lm-display" style={{ fontSize: 28, marginTop: 12 }}>Hej Anna!</div>
      </div>

      <div className="lm-scroll" style={{ padding: '6px 22px 100px' }}>
        {/* Limit banner */}
        <div style={{
          borderRadius: 24, padding: 18,
          background: 'var(--ink)', color: '#fff',
          position: 'relative', overflow: 'hidden',
          marginBottom: 18,
        }}>
          <div style={{ position: 'absolute', right: -30, bottom: -30, width: 140, height: 140, borderRadius: 999, background: 'var(--coral)', opacity: 0.32 }} />
          <div style={{ position: 'absolute', right: 30, top: -20, width: 70, height: 70, borderRadius: 999, background: 'var(--sun)', opacity: 0.55 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, marginBottom: 10 }}>
              {Icon.sparkle('#fff', 12)} Du har använt dagens 3 moment
            </div>
            <div className="lm-h2" style={{ color: '#fff', marginBottom: 6 }}>Fortsätt öva?</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 16, maxWidth: 280 }}>
              Be en förälder att koppla på sig — då får du obegränsat med moment och nya kurser.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="lm-btn lm-btn-block" style={{ background: 'var(--coral)', color: 'var(--ink)', padding: '14px', fontWeight: 500 }}>
                Be förälder ta över
              </button>
              <button className="lm-btn" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', padding: '14px', fontWeight: 500, flex: '0 0 auto' }}>
                Senare
              </button>
            </div>
          </div>
        </div>

        <div className="lm-eyebrow" style={{ marginBottom: 10 }}>Klara idag</div>
        {[
          { title: 'Nordens länder · Finland', eyebrow: 'Geografi', accent: 'var(--coral)' },
          { title: 'Bråktal · Förkorta bråk', eyebrow: 'Matte', accent: 'var(--grape)' },
          { title: 'Cellerna · Repetition', eyebrow: 'Biologi', accent: 'var(--mint)' },
        ].map((c, i) => (
          <div key={i} className="lm-card" style={{ padding: 16, marginBottom: 10, opacity: 0.45, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 16, right: 16, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--paper-2)', padding: '4px 8px', borderRadius: 999, fontSize: 11, color: 'var(--ink-3)' }}>
              {Icon.sparkle('var(--ink-3)', 11)} Låst
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: c.accent, marginBottom: 10 }} />
            <div className="lm-eyebrow" style={{ marginBottom: 2 }}>{c.eyebrow}</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{c.title}</div>
          </div>
        ))}
      </div>
      <TabBar active="home" />
    </div>
  );
}

// ——————————————————————————————————————————————
// 3) Förälder tar över telefonen & skapar konto ovanpå barnet
// ——————————————————————————————————————————————
function ScreenParentUpgrade() {
  return (
    <div className="lm-screen">
      <div className="lm-topbar">
        <div className="lm-back">{Icon.close()}</div>
        <div className="lm-title">Koppla förälder</div>
      </div>

      <div className="lm-scroll" style={{ padding: '8px 22px 28px' }}>
        {/* Hero explaining what happens */}
        <div style={{ padding: '20px 4px 16px' }}>
          <div className="lm-eyebrow" style={{ marginBottom: 8 }}>Förälder · tar över</div>
          <div className="lm-display" style={{ fontSize: 32, lineHeight: 1.05 }}>
            Skapa ditt<br/>föräldrakonto.
          </div>
          <div className="lm-meta" style={{ marginTop: 12, maxWidth: 320 }}>
            Du tar över Annas konto som huvudkonto. All progress behålls — du får hantera kurser, abonnemang och ev. fler barn.
          </div>
        </div>

        {/* Child being connected */}
        <div className="lm-card" style={{ padding: 14, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, background: 'var(--paper-2)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 999, background: 'linear-gradient(135deg, var(--coral), var(--sun))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', fontWeight: 500, fontSize: 18, fontFamily: 'var(--font-serif)' }}>A</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 15 }}>Anna · anna_8</div>
            <div className="lm-meta" style={{ fontSize: 12 }}>3 kurser · 68% genomfört</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--mint)', fontWeight: 500 }}>
            {Icon.check('var(--mint)', 12)} Ansluten
          </div>
        </div>

        {/* Form */}
        <div className="lm-card" style={{ padding: 20, borderRadius: 24 }}>
          <label className="lm-label">Ditt namn</label>
          <input className="lm-input" placeholder="Förnamn & efternamn" style={{ marginBottom: 14 }} />
          <label className="lm-label">E-post</label>
          <input className="lm-input" placeholder="din@epost.se" style={{ marginBottom: 14 }} />
          <label className="lm-label">Lösenord</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input className="lm-input" type="password" placeholder="Minst 6 tecken" style={{ paddingRight: 48 }} />
            <button style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 0, width: 36, height: 36, borderRadius: 999, color: 'var(--ink-3)', cursor: 'pointer' }}>{Icon.eye()}</button>
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 6, fontSize: 13, color: 'var(--ink-2)' }}>
            <span style={{ flex: '0 0 auto', width: 20, height: 20, borderRadius: 6, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              {Icon.check('#fff', 12)}
            </span>
            <span>Jag är förälder/vårdnadshavare och godkänner villkoren.</span>
          </label>
        </div>

        {/* What happens bullet list */}
        <div style={{ padding: '18px 6px 4px' }}>
          <div className="lm-eyebrow" style={{ marginBottom: 10 }}>När du kopplar på dig</div>
          {[
            ['Anna blir ett barnkonto under dig', 'Progress & pinkod behålls oförändrat'],
            ['Du får hantera kurser', 'Skapa nya, dela, ta bort'],
            ['Abonnemang & kvitton hos dig', 'Du står för ev. köp — inte Anna'],
          ].map(([h, sub], i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--hairline)' : 0 }}>
              <span style={{ flex: '0 0 auto', width: 28, height: 28, borderRadius: 999, background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>
                {Icon.check('var(--ink)', 14)}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{h}</div>
                <div className="lm-meta" style={{ fontSize: 12 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="lm-btn lm-btn-primary lm-btn-block lm-btn-xl" style={{ marginTop: 20 }}>
          Skapa konto & koppla Anna
        </button>
        <button className="lm-btn lm-btn-block" style={{ marginTop: 10, background: 'transparent', color: 'var(--ink-2)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          Lämna tillbaka till Anna
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenChildSignup, ScreenChildHomePaywall, ScreenParentUpgrade });
