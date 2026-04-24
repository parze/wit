# Lärmig — Handoff till utvecklare

Paketet innehåller hi-fi design-mockups för Lärmig-appen. Öppna `Lärmig redesign.html` i en webbläsare för att se alla skärmar sida vid sida på en design canvas.

## Snabbstart

1. Öppna `Lärmig redesign.html` i Chrome eller Safari.
2. Pan med musen, scroll för zoom. Klicka på artboard-labelen för fullskärm.
3. Toggla Tweaks-panelen (nere till höger) för accent-färg + densitets-varianter.

Inga servrar, byggsteg eller npm install behövs.

## Struktur

```
Lärmig redesign.html      ← huvudfil, samlar alla artboards
larmig.css                ← design-tokens
favicon.svg               ← app-ikon
fonts/                    ← Tele2 Sans + Tele2 Serif (OTF)
design-canvas.jsx         ← pan/zoom canvas (bibliotek)
ios-frame.jsx             ← iPhone-bezel (bibliotek)
components/
  primitives.jsx            ← Icon, Wordmark, BrandMark, TabBar, QRPlaceholder
  screens-auth.jsx          ← Logga in (parent/child), Glömt lösenord
  screens-home.jsx          ← Mina kurser — barn & förälder
  screens-parent.jsx        ← Hantera barn, Dela kurs (QR)
  screens-teach.jsx         ← Läs o lär (TTS)
  screens-chat.jsx          ← Lär mig & Förhör mig
  screens-signup-flows.jsx  ← Kompis-QR-signup, Paywall, Förälder tar över
  screens-create-course.jsx ← Skapa kurs (3 steg, role=parent|child)
  flow-map.jsx              ← Flödeskarta (SVG, 3 spår)
```

## Terminologi

- **Kurs** — det barnet pluggar på (ej "arbetsområde", bytt 2026-04).
- **Moment** — en övning inom en kurs. Gratis barnkonto har max 3 moment/dag.
- **Lägen:** Läs o lär (sky), Lär mig (grape), Förhör mig (berry).

## Viktiga designbeslut

- **Brand:** Lärmig — inte Tele2-brandat. Använder Tele2 Sans + Tele2 Serif typografiskt.
- **Barnlogin:** användarnamn + 4-siffrig pinkod. Native numeric keyboard via `<input type="tel" inputmode="numeric" maxlength="4">`.
- **Inga stjärnor/ratings.** Mint-check-chips eller progress istället.
- **Relationsmodell:** barn kan skapas självständigt via kompis-QR. Föräldrakonto kopplas på när gränsen (3 moment/dag) triggas och tar över som huvudkonto. Barnets progress + pinkod behålls.
- **Kursägarskap:**
  - Förälder skapar → måste välja minst ett barn.
  - Barn skapar → privat till barnet. Kan delas med kompisar efteråt via QR.
- **Delade kurser** på barnets hem visas i egen sektion med koral-accent.

## Designsystem-tokens

Alla designs använder CSS-variabler i `larmig.css`.

**Färger:** `--ink`/`--ink-2..4`, `--paper`/`--paper-2..3`/`--cream`/`--white`, `--coral` (primär accent), `--sun`/`--grape`/`--berry`/`--sky`/`--ocean`/`--mint`/`--lime`, `--hairline`/`--hairline-2`.

**Typografi:** `--font-sans` (Tele2 Sans, UI), `--font-serif` (Tele2 Serif, display).

**Radii:** `--r-md` (14px), `--r-lg` (22px), `--r-xl` (32px), `--r-pill` (999px).

**Utility-klasser:** `.lm-btn`, `.lm-btn-primary/coral/ghost/white`, `.lm-input`, `.lm-chip-*`, `.lm-card`, `.lm-progress`, `.lm-eyebrow`, `.lm-display`, `.lm-h1…h3`, `.lm-meta`, `.lm-screen`, `.lm-topbar`, `.lm-tabbar`.

## Skärmlista

**Onboarding:** Logga in (tabbar parent/child), Skapa föräldrakonto, Skapa barnkonto (kompis-QR), Glömt lösenord (request + bekräftelse), Barn når gräns, Förälder tar över.

**Barn:** Mina kurser (egna + delade), Läs o lär, Lär mig, Förhör mig.

**Förälder:** Mina kurser, Hantera barn, Dela kurs (QR).

**Skapa kurs (ny):** Ladda upp → Förbereder → Namnge. Samma komponent för båda roller, styrs via `role` prop.

**Flödeskarta:** tre spår som visar hur användare tar sig genom appen.

## Öppna frågor / ej designat

- **Success-skärm efter "Skapa kurs"** — ej bestämd.
- Inställningar / profil (förälder)
- Abonnemang / betalning
- Progress-vy ("Framsteg"-fliken)
- Mörkt läge på barn-chatten
- Tom-state för Ladda upp
- Redigera befintlig kurs

## Fortsätta i Claude

Hela designprojektet finns kvar som eget projekt ("Lär mig"). `CLAUDE.md` i roten dokumenterar strukturen — öppna ny chatt i samma projekt så plockas tråden upp direkt.
