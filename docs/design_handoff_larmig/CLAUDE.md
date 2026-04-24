# Lär mig — Designprojekt

Hi-fi mobil-redesign för **Lärmig** (läxläsningsapp för föräldrar + barn). Parallellprojekt till kodbasen i `wit/` — det här är designsidan.

## Hur du (Claude) ska jobba här

**Kärnfilen:** `Lärmig redesign.html` — samlar alla skärmar som artboards på en design canvas, med tweaks-panel.

**Modulär struktur — skärmar i `components/`:**

- `primitives.jsx` — Icon, Wordmark, BrandMark, TabBar, QRPlaceholder
- `screens-auth.jsx` — Logga in (parent/child-tabbar), Glömt lösenord
- `screens-home.jsx` — Mina kurser (barn + förälder). Kort-variant A (tre mode-knappar per kurs)
- `screens-parent.jsx` — Hantera barn, Dela kurs (QR)
- `screens-teach.jsx` — Läs o lär (TTS)
- `screens-chat.jsx` — Lär mig / Förhör mig (gamified chat)
- `screens-signup-flows.jsx` — Barn skapar konto (från kompis-QR), Paywall, Förälder tar över
- `screens-create-course.jsx` — Skapa kurs, 3 steg (Ladda upp → Förbereder → Namnge). Tar `role="parent"|"child"`.
- `flow-map.jsx` — Flow-karta som egen artboard

**Alltid:**
- Lägg till nya skärmar som nya filer i `components/` och importera via `<script type="text/babel" src="...">` i `Lärmig redesign.html`.
- Alla globala komponenter exporteras via `Object.assign(window, { ... })` sist i filen (Babel-scope-grejer).
- Nya artboards läggs till inuti en `<DCSection>` i `Lärmig redesign.html`.
- Fixad bredd 406×798 (iPhone 14) för mobil-skärmar. Flow-kartan är bredare.

## Terminologi

- **Kurs** (ej "arbetsområde") — namnet som används överallt i appen. Tidigare namn var "arbetsområde", bytt 2026-04.
- **Moment** — en enskild övning inom en kurs. Gränsen för gratis-barnkonto är 3 moment/dag.
- **Lägen / modes:** Läs o lär, Lär mig, Förhör mig. Färgkodning: sky, grape, berry.

## Designbeslut (bestämt)

- **Brand:** "Lärmig" — NOT Tele2-branded. Använder Tele2 Sans + Tele2 Serif som typografisk bas.
- **Palette:** kräm/paper, svart ink (#181410), koral, sun, grape, mint som accenter. Se `larmig.css`.
- **Typografi:** Tele2 Serif för display/rubriker, Tele2 Sans för UI.
- **Tonfall:** lekfullt för barn ("Hitta på ett coolt namn 🎉"), neutralt för förälder.
- **Inga stjärnor/ratings** — ersattes med mint-check-chips.
- **Barnlogin:** användarnamn + 4-siffrig pinkod (native numeric keyboard via dold `<input type=tel inputmode=numeric>`).
- **Relationsmodell:** barn kan skapas via kompis-QR (utan förälder-samtycke först), förälder kopplas ovanpå när gräns nås (3 moment/dag). Barnet blir child-konto under förälder men progressen behålls.
- **Samma koral-accent för barn och förälder** (tidigare hade förälder indigo — bytt).
- **Barn kan skapa egna kurser** — bara de själva ser dem. Dela med kompis-knapp efter skapandet.
- **Förälder som skapar kurs** — välj minst ett barn som ska få kursen (obligatoriskt).

## Skärmar som finns nu

**Flödeskarta** (1640×1500) — tre spår: förälder-först, barn-via-kompis, barn-når-gräns.

**Barnet (406×798):**
- Mina kurser (inkl. delade)
- Lär mig (chatt), Förhör mig (quiz), Läs o lär (TTS)

**Onboarding:**
- Logga in — förälder (email + pass) + barn (pinkod), tabbat
- Skapa barnkonto (från kompis-QR), Skapa föräldrakonto
- Glömt lösenord — request + bekräftelse
- Barn nått gräns — "Be förälder"
- Förälder tar över (huvudkonto)

**Förälder:**
- Mina kurser, Hantera barn, Dela kurs (QR)

**Skapa kurs — förälder (3 steg):**
- Ladda upp läromedel → Förbereder → Namnge + välj barn

**Skapa kurs — barn (3 steg):**
- Ladda upp → Förbereder → Namnge (privat, ingen barn-chooser)

## Tweaks-panel

Ligger i `Lärmig redesign.html`. Accent-färg + densitet. Håll panelen enkel.

## Hur du hittar saker snabbt

- Ska lägga till skärm → ny fil i `components/screens-*.jsx`, import + `<DCArtboard>` i HTML-filen.
- Ska ändra färger/typ → `larmig.css`.
- Flödeskartan bor i `components/flow-map.jsx` (SVG, viewBox 1640×1500).

## Ej gjort / nästa steg

- **Success-skärm efter "Skapa kurs"** (steg 4?) — vad händer när man trycker "Skapa kurs" i step 3? Toast + redirect, eller bekräftelseskärm? **Ej bestämt.**
- Inställningar / profil (förälder)
- Abonnemang / betalning
- Progress-vy (fliken "Framsteg" i tabbaren är inte designad)
- Mörkt läge på barn-chatten
- Tom-state för ladda upp-skärmen (inga filer än)
- Redigera befintlig kurs
