// Screen 8: Lär mig / Förhör mig — the core chat. Gamified.
function ScreenChat({ mode = 'learn' }) {
  const isQuiz = mode === 'forhör';
  const accent = isQuiz ? 'var(--grape)' : 'var(--coral)';
  const accent2 = isQuiz ? 'var(--berry)' : 'var(--sun)';

  return (
    <div className="lm-screen" style={{ background: 'var(--paper)' }}>
      {/* Gamified header */}
      <div style={{ background: 'var(--ink)', color: 'var(--white)', padding: '44px 18px 16px', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: '50%', background: accent, opacity: 0.25 }} />
        <div style={{ position: 'absolute', bottom: -60, left: -20, width: 140, height: 140, borderRadius: '50%', background: accent2, opacity: 0.18 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, position: 'relative' }}>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{Icon.back('#fff')}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>{isQuiz ? 'Förhör mig' : 'Lär mig'} · Geografi</div>
            <div style={{ fontWeight: 500, fontSize: 16, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Nordens länder</div>
          </div>
          <button style={{ width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.volume(true, '#fff')}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{ flex: 1 }}>
            <div className="lm-progress" style={{ background: 'rgba(255,255,255,0.14)' }}>
              <span style={{ width: isQuiz ? '42%' : '65%', background: `linear-gradient(90deg,${accent2},${accent})` }} />
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{isQuiz ? '3/7' : '65%'}</div>
        </div>
      </div>

      {/* Module pill list */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 18px 4px', overflowX: 'auto' }}>
        {[
          { t: '1 Inledning', s: 'done' },
          { t: '2 Sverige', s: 'done' },
          { t: isQuiz ? '3 Norge 92%' : '3 Norge', s: 'active' },
          { t: '4 Danmark', s: '' },
          { t: '5 Finland', s: '' },
          { t: '6 Island', s: '' },
        ].map((m, i) => (
          <div key={i} style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 999,
            fontSize: 12, fontWeight: 500, border: '1px solid',
            background: m.s === 'active' ? 'var(--ink)' : m.s === 'done' ? 'var(--white)' : 'transparent',
            color: m.s === 'active' ? '#fff' : m.s === 'done' ? 'var(--ink)' : 'var(--ink-3)',
            borderColor: m.s === 'active' ? 'var(--ink)' : m.s === 'done' ? 'var(--hairline)' : 'var(--hairline)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {m.s === 'done' && Icon.check('var(--mint)', 12)}
            <span>{m.t}</span>
          </div>
        ))}
      </div>

      {/* Chat */}
      <div className="lm-scroll" style={{ padding: '14px 18px 6px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* AI greeting */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: `linear-gradient(135deg,${accent2},${accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{Icon.sparkle('#fff', 16)}</div>
          <div className="lm-bubble lm-bubble-ai" style={{ maxWidth: '78%' }}>
            {isQuiz
              ? <>Dags för <strong>fråga 3</strong>! 🧭<br/>Norge har en mycket speciell kustlinje. Vilket naturfenomen är Norge mest känt för?</>
              : <>Bra jobbat med Sverige! Nu går vi vidare till <strong>Norge</strong>. 🇳🇴<br/>Norge har en väldigt speciell kust — vet du vad det kallas när havet skär djupt in i landet mellan höga berg?</>}
          </div>
        </div>

        {/* Me */}
        <div style={{ alignSelf: 'flex-end', maxWidth: '78%' }}>
          <div className={`lm-bubble lm-bubble-me ${isQuiz ? 'grape' : ''}`}>{isQuiz ? 'Fjordar!' : 'Är det fjordar?'}</div>
        </div>

        {/* AI response with celebration */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: `linear-gradient(135deg,${accent2},${accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{Icon.sparkle('#fff', 16)}</div>
          <div className="lm-bubble lm-bubble-ai" style={{ maxWidth: '78%', background: 'var(--cream)', border: '1px solid rgba(255,199,56,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: 999, background: 'var(--mint)', color: '#fff', alignItems: 'center', justifyContent: 'center' }}>{Icon.check('#fff', 14)}</span>
              <strong>Helt rätt!</strong>
            </div>
            Fjordar bildades av glaciärer för tusentals år sedan. Geiranger­fjorden är en av de mest berömda. {isQuiz ? 'Nästa fråga kommer strax…' : 'Nu — vilken är Norges huvudstad?'}
          </div>
        </div>

        {/* Quick replies */}
        {!isQuiz && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 42 }}>
            <button className="lm-quickreply">Oslo</button>
            <button className="lm-quickreply">Bergen</button>
            <button className="lm-quickreply">Trondheim</button>
          </div>
        )}

        {isQuiz && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 4px' }}>
            <div style={{ background: 'var(--mint)', color: '#fff', padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {Icon.check('#fff', 12)} Rätt svar · totalpoäng 75%
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px 14px', background: 'var(--paper)', borderTop: '1px solid var(--hairline)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--white)', border: '1px solid var(--hairline)', borderRadius: 999, padding: '6px 6px 6px 18px' }}>
          <input placeholder={isQuiz ? 'Skriv ditt svar…' : 'Skriv din fråga…'} style={{ flex: 1, border: 0, outline: 'none', fontSize: 15, fontFamily: 'inherit', background: 'transparent', padding: '10px 0' }} />
          <button style={{ width: 36, height: 36, borderRadius: 999, background: 'transparent', border: 0, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.mic('var(--ink-3)')}</button>
          <button style={{ width: 40, height: 40, borderRadius: 999, background: accent, color: '#fff', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{Icon.send('#fff')}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenChat });
