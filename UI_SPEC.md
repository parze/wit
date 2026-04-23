# Lärmig – UI-specifikation

**Syfte:** Detaljerad beskrivning av alla vyer i appen, för att ligga till grund för en redesign i Claude Design.

**Teknikstack:** React + Tailwind CSS, responsiv design, mobilfirst.  
**Språk:** Hela UI:t är på svenska.  
**Roller:** `förälder` (lärare/förälder) och `barn` (elev).

---

## Innehållsförteckning

1. [Globala mönster & designsystem](#1-globala-mönster--designsystem)
2. [Navigation – Sidebar](#2-navigation--sidebar)
3. [Inloggningssida](#3-inloggningssida)
4. [Registreringssida](#4-registreringssida)
5. [Glömt lösenord](#5-glömt-lösenord)
6. [Återställ lösenord](#6-återställ-lösenord)
7. [Inbjudningssida (Invite)](#7-inbjudningssida-invite)
8. [Mina arbetsområden – förälder](#8-mina-arbetsområden--förälder)
9. [Mina arbetsområden – barn](#9-mina-arbetsområden--barn)
10. [Arbetsområdesredigerare (CourseEditor)](#10-arbetsområdesredigerare-courseeditor)
11. [Dashboard – förälderns barnöversikt](#11-dashboard--förälderns-barnöversikt)
12. [Dela arbetsområde (SharePage)](#12-dela-arbetsområde-sharepage)
13. [Hantera barn (StudentsPage)](#13-hantera-barn-studentspage)
14. [Läs o lär (TeachMePage)](#14-läs-o-lär-teachmepage)
15. [Lär mig / Förhör mig (CoursePage)](#15-lär-mig--förhör-mig-coursepage)

---

## 1. Globala mönster & designsystem

### Färgpalett (nuvarande)
| Användning | Klass / Färg |
|---|---|
| Primär knapp | `bg-blue-600` |
| Destruktiv åtgärd | `text-red-500` / `bg-red-600` |
| Sekundär knapp | `bg-green-600` |
| Felmeddelande-box | `bg-red-50 border border-red-200 text-red-700` |
| Lyckad åtgärd | `bg-green-50 border border-green-200 text-green-700` |
| Bakgrund sida | `bg-gray-50` |
| Kortbakgrund | `bg-white` |
| Quiz-accent | Lila (`purple`) |
| Lär-accent | Blå (`blue`) |

### Typografi
- Rubriknivåer: `text-2xl font-bold`, `text-xl font-semibold`, `text-base`
- Brödtext: `text-sm text-gray-600`
- Responsiv fontstorlek används inte – allt är fast Tailwind-klasser

### Knappar
- **Primär:** `bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700`
- **Destruktiv:** `text-red-500 hover:text-red-700` (textknapp) eller `bg-red-600 text-white`
- **Sekundär/neutral:** `bg-gray-100 border border-gray-300 text-gray-700`
- **Inaktiverad:** `opacity-50 cursor-not-allowed`
- Laddningstillstånd: knapp visar text som "Skapar..." med `disabled`

### Kort (cards)
- `bg-white rounded-xl shadow-sm border border-gray-200 p-4`
- Hover-effekt på klickbara kort: `hover:shadow-md transition-shadow`

### Formulärfält
- `border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500`
- Label ovanför fält, alltid synlig
- Feltext under fält (röd)

### Responsiva breakpoints (Tailwind)
| Breakpoint | Bredd | Typisk layout |
|---|---|---|
| (default) | < 640px | Mobilvy, en kolumn |
| `sm:` | ≥ 640px | Tablet, sidebar synlig |
| `md:` | ≥ 768px | Bredare tablet |
| `lg:` | ≥ 1024px | Desktop, tre kolumner |
| `xl:` | ≥ 1280px | Stor desktop |

### Bekräftelsedialog
- Används `window.confirm()` för destruktiva åtgärder (radera, återkalla länk etc.)
- Ingen custom modal finns ännu

### Laddningstillstånd
- Visar texten "Laddar..." i grå på sidan, ingen skeleton/spinner

---

## 2. Navigation – Sidebar

**Syfte:** Global navigation för alla inloggade sidor.

### Layout
- **Desktop (≥ sm):** Fast sidebar till vänster, alltid synlig, bredare ca 200–220px.
- **Mobil (< sm):** Gömd som standard. Öppnas med hamburgerknapp (☰) i sidans topprad. Visar en mörk overlay på resten av sidan. Sidebar slides in från vänster.

### Innehåll
```
┌─────────────────────┐
│  Lärmig             │
│  [Användarens namn] │
├─────────────────────┤
│  Mina arbetsområden │  (båda roller)
│  Barn               │  (endast förälder)
├─────────────────────┤
│  [Logga ut]         │  (längst ned)
└─────────────────────┘
```

### Interaktioner
- Aktivt menyalternativ: blå bakgrund + vit text (`bg-blue-600 text-white`)
- Inaktivt: grå text, hover ger ljusgrå bakgrund
- Klick på menyalternativ navigerar och stänger mobilsidebaren

### Designnoteringar
- Appen heter "Lärmig" men sidebaren saknar en logotyp/ikon
- Användarens namn syns men inte rollen (förälder/barn)
- Ingen indikatorbadge (t.ex. olästa meddelanden)

---

## 3. Inloggningssida

**URL:** `/login`  
**Tillgänglig för:** Alla (ej inloggade)

### Layout
- Centrerat formulär på en ljusgrå bakgrund, max-bredd ca 400px
- Ingen header/sidebar

```
┌─────────────────────────┐
│        Lärmig           │  (rubrik)
│  Logga in               │  (underrubrik)
│                         │
│  [E-post / Användarnamn]│
│  [Lösenord]       [👁]  │
│  Glömt lösenord?        │
│  [Logga in]             │
│                         │
│  Inget konto? Registrera│
└─────────────────────────┘
```

### Komponenter
| Komponent | Detaljer |
|---|---|
| E-post/användarnamn-fält | Stödjer både email (föräldrar) och användarnamn (barn) |
| Lösenordsfält | Text gömd som standard; knapp med öga-ikon togglar synlighet |
| "Glömt lösenord?"-länk | Länk under lösenordsfältet, navigerar till `/forgot-password` |
| Logga in-knapp | Primär, full bredd, inaktiveras under inloggning, visar "Loggar in..." |
| Felmeddelande-box | Röd box visas ovanför knappen vid fel |
| Registreringslänk | Textlänk under knappen |

### Tillstånd
- **Standardvy:** Tom form
- **Laddar:** Knapp inaktiverad, text "Loggar in..."
- **Fel:** Röd box med felmeddelande (t.ex. "Fel e-post eller lösenord")
- **Lyckad:** Redirect till `/parent/courses` eller `/child/courses`

---

## 4. Registreringssida

**URL:** `/register`  
**Tillgänglig för:** Alla  
**Skapar alltid:** Föräldrakonto

### Layout
- Samma centrerade layout som inloggning

```
┌─────────────────────────┐
│  Skapa konto            │
│                         │
│  [Namn]                 │
│  [E-post]               │
│  [Lösenord]       [👁]  │
│  [Skapa konto]          │
│                         │
│  Redan konto? Logga in  │
└─────────────────────────┘
```

### Komponenter
| Komponent | Detaljer |
|---|---|
| Namn | Text, obligatoriskt |
| E-post | Email-fält, obligatoriskt |
| Lösenord | Med öga-ikon, min 6 tecken |
| Skapa konto-knapp | Primär, full bredd |
| Felmeddelande | Röd box (t.ex. "E-post redan registrerad") |

---

## 5. Glömt lösenord

**URL:** `/forgot-password`

### Layout
- Centrerat, enkelt formulär

```
┌─────────────────────────┐
│  Återställ lösenord     │
│                         │
│  [E-post]               │
│  [Skicka återställning] │
│                         │
│  Tillbaka till inlogg.  │
└─────────────────────────┘
```

### Tillstånd
- **Lyckad skickning:** Visar ett bekräftelsemeddelande ("Kolla din e-post...") oavsett om e-posten finns (säkerhetsskäl)

---

## 6. Återställ lösenord

**URL:** `/reset-password?token=...`

### Layout
- Centrerat formulär

```
┌─────────────────────────┐
│  Välj nytt lösenord     │
│                         │
│  [Nytt lösenord]        │
│  [Bekräfta lösenord]    │
│  [Spara nytt lösenord]  │
└─────────────────────────┘
```

### Tillstånd
- **Inget token i URL:** Visar felmeddelande direkt
- **Lyckad:** Bekräftelseskärm med länk till inloggning
- **Fel (utgånget token):** Felmeddelande-box

---

## 7. Inbjudningssida (Invite)

**URL:** `/invite/:token`  
**Syfte:** Barn kan gå med i ett arbetsområde via en delad länk.

### Layout
- Centrerat kort, max-bredd ~480px

```
┌─────────────────────────────┐
│  Du är inbjuden till:       │
│  [Arbetsområdets titel]     │
│  [Beskrivning]              │
│  Skapad av: [Förälderns namn]│
├─────────────────────────────┤
│  [Logga in] [Skapa konto]   │  (flikar)
│                             │
│  [E-post / Användarnamn]    │
│  [Lösenord]                 │
│  [Gå med]                   │
│                             │
│  ⚠ Varning om förälder inlogg│
└─────────────────────────────┘
```

### Komponenter
| Komponent | Detaljer |
|---|---|
| Kursinformation | Titel, beskrivning, skaparens namn – hämtas vid sidladdning |
| Flikar | "Logga in" / "Skapa konto" – växlar formulär |
| Inloggningsformulär | E-post/användarnamn + lösenord |
| Registreringsformulär | Namn + e-post + lösenord |
| Varning för förälder | Gul/röd varningsbox om man är inloggad som förälder |
| QR-ikon | Informativ ikon med text om att länken kan delas som QR |

### Tillstånd
- **Redan inloggad som barn:** Hoppar direkt till att gå med (auto-join) och redirectar
- **Ogiltigt token:** Visar felmeddelande med länk till inloggning
- **Lyckad registrering/inloggning:** Går med i kursen → redirect till `/child/courses`

---

## 8. Mina arbetsområden – förälder

**URL:** `/parent/courses`  
**Syfte:** Förälderns översikt över alla sina skapade arbetsområden.

### Layout
- Sidebar + huvudinnehåll
- Rubrik + "Nytt arbetsområde"-knapp
- Kortgrid: 1 kolumn (mobil) → 2 kolumner (tablet) → 3 kolumner (desktop)

```
[Sidebar] | Mina arbetsområden          [+ Nytt arbetsområde]
          |
          |  ┌─────────┐ ┌─────────┐ ┌─────────┐
          |  │ Kurs A  │ │ Kurs B  │ │ Kurs C  │
          |  │ [Beskriv│ │         │ │         │
          |  │ ──────  │ │         │ │         │
          |  │Dashboard│ │         │ │         │
          |  │ Dela    │ │         │ │         │
          |  │ Läs o lär│ │        │ │         │
          |  │ Lär mig │ │         │ │         │
          |  │ Förhör  │ │         │ │         │
          |  │ [Radera]│ │         │ │         │
          |  └─────────┘ └─────────┘ └─────────┘
```

### Korts innehåll (förälder, kompilerat arbetsområde)
| Element | Detaljer |
|---|---|
| Titel | `text-lg font-semibold` |
| Beskrivning | `text-sm text-gray-500`, klippt text |
| "Dashboard"-knapp | Navigerar till `/parent/courses/:id/dashboard` |
| "Dela"-knapp | Navigerar till `/parent/courses/:id/share` |
| "Läs o lär"-knapp | Navigerar till `/parent/courses/:id/teach` |
| "Lär mig"-knapp | Navigerar till `/child/courses/:id` (testläge) |
| "Förhör mig"-knapp | Navigerar till `/child/courses/:id?mode=forhör` |
| "Radera"-länk | Röd textknapp, bekräftelsedialog före radering |

### Korts innehåll (ej kompilerat ännu)
- Visar bara titel + beskrivning
- Klick på kortet öppnar `CourseEditorPage` för att fortsätta redigera

### Tomt tillstånd
- Ikon 📚 + text "Inga arbetsområden ännu" + uppmaning att skapa

---

## 9. Mina arbetsområden – barn

**URL:** `/child/courses`  
**Syfte:** Barnets lista över enrollade kurser.

### Layout
- Samma kortgrid som förälderns vy men med barnspecifikt innehåll

### Korts innehåll (barn)
| Element | Detaljer |
|---|---|
| Titel | Kursens namn |
| Stjärnor | Visar ⭐-ikoner baserat på uppnått betyg |
| Progressbar | Blå bar, visar andel avklarade Moment |
| Mål % | Procentsiffra för måluppfyllelse |
| "Läs o lär"-knapp | TTS-läsupplevelse |
| "Lär mig"-knapp | AI-chatt, inlärningsläge |
| "Förhör mig"-knapp | AI-chatt, quizläge |

### Tomt tillstånd
- Text om att inga kurser finns än, men ingen åtgärdsknapp (barn kan inte skapa kurser)

---

## 10. Arbetsområdesredigerare (CourseEditor)

**URL:** `/parent/courses/:id`  
**Syfte:** Förälder skapar ett nytt arbetsområde steg för steg.

### Layout
- Fullbredd, utan sidebar (fokuserat flöde)
- Sticky header
- Tre–fyra steg i sekvens nedåt på sidan (inte flikar, utan sektioner)

```
← [Kursens namn / "Nytt arbetsområde"]          [Dashboard ↗]
─────────────────────────────────────────────────────────────
Steg 1: Inställningar
  ☐ Aktivera snabbsvar
  ☐ Aktivera uppläsning (TTS)

Steg 2: Ladda upp läromedel
  [+ Ladda upp dokument]
  • dokument1.pdf  [✕]
  • dokument2.docx [✕]

Steg 3: Förbered undervisningsmaterial
  [Förbered undervisningsmaterial]  ← knapp
  
  Detekterad lärstil: [⚙️ Procedurellt ▼]  ← dropdown
  
  ┌─ Förhandsvisning (scrollbar, max 400px) ─┐
  │  # Kursens material                      │
  │  ## Moment 1 – Grunderna                 │
  │  ...                                     │
  └──────────────────────────────────────────┘
  Senast kompilerad: 2026-01-15 14:32

Steg 4: Namnge och spara (visas efter kompilering)
  [Kursens namn]
  [Spara arbetsområde]
```

### Detaljerade komponenter

#### Header
- Tillbaka-pil (←) navigerar till kursöversikten
- Kursens titel (eller platshållartext om ny kurs)
- "Gå till dashboard" länk (synlig på desktop, gömd på mobil)

#### Steg 1 – Inställningar
| Komponent | Detaljer |
|---|---|
| Snabbsvar-toggle | Checkbox med förklaringstext: "AI föreslår svarsmöjligheter efter varje fråga" |
| TTS-toggle | Checkbox med förklaringstext: "AI-svar läses upp automatiskt" |

#### Steg 2 – Ladda upp läromedel
| Komponent | Detaljer |
|---|---|
| Uppladdningsknapp | Accepterar `.pdf`, `.docx`, `.txt` |
| Dokumentlista | Varje rad: filnamn + ✕-knapp för radering |
| Uppladdningsindikator | Visar laddningstillstånd under uppladdning |

#### Steg 3 – Förbered material
| Komponent | Detaljer |
|---|---|
| Kompileringsknapp | Inaktiverad om inga dokument finns |
| Progressindikator | Steg-för-steg visning under kompilering (t.ex. "Analyserar dokument...", "Skapar Moment...") |
| Lärstil-badge + dropdown | Visar detekterad lärstil med ikon; dropdown för att byta manuellt |
| Förhandsvisning | Scrollbar ruta, max 400px hög, visar kompilerat Markdown |
| Tidsstämpel | "Senast kompilerad: [datum och tid]" |

#### Lärstilar (dropdown-alternativ)
| Ikon | Namn | Beskrivning |
|---|---|---|
| ⚙️ | Procedurellt | Steg-för-steg, regler, rätt svar |
| 🔗 | Konceptuellt | Orsak-verkan, samband, förståelse |
| 💬 | Diskussion | Resonemang, perspektiv, inga givna svar |
| 📖 | Berättande | Berättelser, händelser, historia |
| 🔬 | Utforskande | Hypotes → test → resultat |

#### Steg 4 – Namnge och spara
| Komponent | Detaljer |
|---|---|
| Namnfält | Textfält, obligatoriskt |
| Spara-knapp | Inaktiverad om namnfältet är tomt |

---

## 11. Dashboard – förälderns barnöversikt

**URL:** `/parent/courses/:id/dashboard`  
**Syfte:** Förälder ser alla barns progress i ett specifikt arbetsområde.

### Layout
- Sidebar + huvudinnehåll
- Sticky header med tillbaka-länk
- Tabell med en rad per barn

```
[Sidebar] | ← Dashboard – [Kursens namn]
          |
          | ┌──────────────────────────────────────────────────────────┐
          | │ Namn          Status    Stjärnor  AI-sammanf.  Mål %    │
          | ├──────────────────────────────────────────────────────────┤
          | │ Anna          Pågår     ⭐⭐       "Anna förstår..." 68% │
          | │ Erik          Klar      ⭐⭐⭐⭐    "Erik behärskar..." 92%│
          | │ Maja          Ej påbörjad  –       –            0%      │
          | └──────────────────────────────────────────────────────────┘
```

### Tabellkolumner
| Kolumn | Innehåll |
|---|---|
| Namn | Barnets namn + (användarnamn) |
| Status | "Klar" (grön), "Pågår" (blå/gul), "Ej påbörjad" (grå) |
| Stjärnor | ⭐-ikoner baserat på uppnådd poäng |
| AI-sammanfattning | Klippt text, max 2 rader, eller "–" |
| Mål % | Procentbadge: grön (≥70%), gul (≥40%), röd (<40%) |

### Tomt tillstånd
- Ikon 👩‍🎓 + text "Inga barn enrollade ännu"

---

## 12. Dela arbetsområde (SharePage)

**URL:** `/parent/courses/:id/share`  
**Syfte:** Förälder skapar och hanterar en inbjudningslänk till arbetsområdet.

### Layout
- Sidebar + centrerat kort (max-bredd ~600px)

### Tillstånd: Ingen länk skapad

```
[Sidebar] | ← Dela kurs – [Kursens namn]
          |
          |        🔗
          |  Skapa en inbjudningslänk som vem
          |  som helst kan använda för att gå
          |  med i arbetsområdet.
          |
          |  [Skapa inbjudningslänk]
```

### Tillstånd: Länk finns

```
[Sidebar] | ← Dela kurs – [Kursens namn]
          |
          |  ┌─ QR-kod (200x200px SVG) ─┐
          |  └──────────────────────────┘
          |
          |  [https://app.lärmig.se/invite/abc123]  [Kopiera ✓]
          |
          |  [Återkalla länk]  ← röd text
```

### Komponenter
| Komponent | Detaljer |
|---|---|
| QR-kod | SVG, 200×200px, visar inbjudningslänken |
| URL-fält + kopieringsknapp | Textfält (skrivskyddat) + knapp som visar "✓ Kopierad" i 2 sek |
| Återkalla-knapp | Röd textknapp, bekräftelsedialog |

---

## 13. Hantera barn (StudentsPage)

**URL:** `/parent/children`  
**Syfte:** Förälder skapar och hanterar barnkonton.

### Layout
- Sidebar + huvudinnehåll
- Header med "Nytt barn"-knapp
- Utfällbart formulär
- Tabell med alla barn

```
[Sidebar] | Barn                              [+ Nytt barn]
          |
          | ┌─ Skapa nytt barn (utfällbart) ──────────────┐
          | │ Namn   Användarnamn  Lösenord  Föd.år  Kön │
          | │ [   ]  [          ]  [       ] [    ]  [▼] │
          | │                          [Skapa] [Avbryt]  │
          | └─────────────────────────────────────────────┘
          |
          | ┌──────────────────────────────────────────────────────┐
          | │ Namn   Användarnamn  Kön    Föd.år  Skapad   [Rad.]  │
          | ├──────────────────────────────────────────────────────┤
          | │ Anna   anna123       Flicka  2015   2026-01   [Rad.] │
          | │ Erik   erik_e        Pojke   2013   2026-01   [Rad.] │
          | └──────────────────────────────────────────────────────┘
```

### Skapa-formulär (utfällbart)
| Fält | Typ | Obligatoriskt |
|---|---|---|
| Namn | Text | Ja |
| Användarnamn | Text | Ja |
| Lösenord | Text (ej dolt) | Ja |
| Födelseår | Nummer | Nej |
| Kön | Dropdown: Välj… / Pojke / Flicka / Annat | Nej |

### Tabell
| Kolumn | Innehåll |
|---|---|
| Namn | Barnets fullständiga namn |
| Användarnamn | Inloggningsnamnet |
| Kön | Text |
| Födelseår | Nummer |
| Skapad | Datum |
| Radera | Röd "Radera"-knapp, med bekräftelsedialog |

### Tillstånd
- **Formulär gömt:** Standard, knapp "Nytt barn" visar formuläret
- **Lyckad skapelse:** Grön bekräftelse "{Namn} skapad!" försvinner efter 3 sekunder
- **Tomt tillstånd:** Ikon 👤 + "Inga barn ännu – skapa ditt första barn!"

---

## 14. Läs o lär (TeachMePage)

**URL:** `/parent/courses/:id/teach` och `/child/courses/:id/teach`  
**Syfte:** Text-till-tal-uppläsning av kompilerat kursmaterial med ordmarkering.

### Layout
- Fullbredd utan sidebar
- Sticky header med kontroller
- Scrollbar innehållsyta

```
← Läs o lär
   [Kursens namn]
                           [▶ Starta uppläsning]

─────────────────────────────────────────────────────
  # Kursens titel

  ## Moment 1 – Grunderna
  [Aktivt stycke med blå bakgrund]
  Lorem ipsum [**aktuellt ord**] dolor sit amet,
  consectetur adipiscing elit.

  ## Moment 2 – Fördjupning
  ...
```

### Header-kontroller
| Tillstånd | Kontroller |
|---|---|
| Stoppad | [▶ Starta uppläsning] |
| Spelar | [⏸ Pausa] [⏹ Stopp] |
| Pausad | [▶ Fortsätt] [⏹ Stopp] |
| Klar | [Läs upp igen] |

### Innehållsyta
| Element | Detaljer |
|---|---|
| Markdown-rendering | Fullständigt kompilerat material, prose-styling |
| Aktivt stycke | Blå bakgrundsfärg på det stycke som läses upp |
| Ordmarkering | Gul bakgrund på det ord som just uttalas |
| Auto-scroll | Aktivt stycke scrollar automatiskt in i vy |

### Tillstånd
- **Klar:** Grön bekräftelse "Uppläsningen är klar!"
- **Fel:** Röd felbox

---

## 15. Lär mig / Förhör mig (CoursePage)

**URL:**  
- `/child/courses/:id` (inlärning)  
- `/child/courses/:id?mode=forhör` (förhör)  
- `/parent/courses/:id/test-chat` (förälder i testläge)

**Syfte:** Huvudvy för AI-driven inlärning (chattbaserat) i två lägen: inlärning och förhör.

### Layout (desktop)
```
[Sticky header]
─────────────────────────────────────────────────────────────
[Vänsterpanel: Moment/frågelista]  │  [Chattyta]
                                   │
  Moment                 3/7       │  [Användaren]        Hej!
  ○ 1. Inledningen  ✓              │  [AI]      Bra jobbat...
  ● 2. Grunderna ← pågående        │            [Snabbsvar 1] [Snabbsvar 2]
  ○ 3. Fördjupning                 │
  ○ 4. Tillämpning                 │  [Skriv ditt svar...]        [Skicka]
```

### Layout (mobil)
- Vänsterpanel gömd (ingen sidopanel)
- Chattyta tar hela skärmen
- Header visar progress-indikatorer

### Header (sticky)

#### Lärläge
```
← [Kursens namn]       Moment 2 av 7   [██████░░░░] 65%   ⭐⭐   [🔊 På/Av]
```
- Tillbaka-pil
- Kursens namn
- "Moment X av Y"
- Progressbar (blå)
- Mål % (procentsiffra)
- Stjärnor (barn)
- TTS-knapp (om aktiverat)
- "Rensa"-knapp (förälder i testläge)

#### Förhörsläge
```
← [Kursens namn]       3 av 7 frågor   [████░░░░░░] 42%   [🔊 På/Av]
```
- Progressbar i lila
- "X av Y frågor"
- Quiz-poäng i %

### Vänsterpanel (synlig ≥ sm)

#### Lärläge
```
Moment                               3/7
○ 1  Inledningen                     ✓
●  2  Grunderna                  ← pågående
○  3  Fördjupning
○  4  Tillämpning
...
```
- Cirkel-badges: siffra (ej påbörjad) / ✓ (klar) / blå fylld cirkel (pågående)
- Klara Moment: genomstruken text
- Pågående Moment: blå text + blå badge

#### Förhörsläge
```
Förhörsresultat                      3/7
○ 1  Fråga 1                          92%
✓ 2  Fråga 2                          58%
○ 3  Fråga 3                        ← pågående
...
Totalpoäng: 75%
```
- Poängprocent visas för besvarade frågor
- Totalpoäng visas nedtill
- "Förhöret slutfört" när alla frågor besvarats

### Chattyta

#### Meddelandetyper
| Typ | Utseende |
|---|---|
| Användarmeddelande | Höger-justerat, blå/lila bakgrund, vit text, avrundade hörn |
| AI-meddelande | Vänster-justerat, vit bakgrund, grå border, Markdown-renderat |
| Laddningsanimation | Tre animerade punkter (...)  |

#### Snabbsvar (quick replies)
- Visas under senaste AI-meddelande
- Horisontella knappar med grå bakgrund och färgad border
- Klick skickar svaret som användarens meddelande

#### Inmatningsfält
```
[Skriv din fråga...                    ] [Skicka →]
```
- Textfält med platshållartext
- "Skicka"-knapp inaktiverad under sändning
- I förhörsläge: inaktiverat när alla frågor besvarats

### Avslutningsknapp (lärläge, vid ≥80% måluppfyllelse)
```
⭐ Jag är klar – börja om från början
```
- Grön knapp, visas centrerat under chattytans meddelanden
- Klick: sparar progress, ger stjärna, startar om chatten

### Tillstånd: Förälder i testläge
- Identisk med barnvyn men med "Rensa"-knapp i headern
- "Rensa" återställer både lärläge och förhörsläge, startar om med introduktion

### Responsivitet
| Skärmstorlek | Beteende |
|---|---|
| Mobil (< sm) | Ingen vänsterpanel; header visar komprimerade indikatorer |
| Tablet (≥ sm) | Vänsterpanel synlig (fast, smal) |
| Desktop (≥ md) | Bred vänsterpanel, rymligare chattyta |

---

## Övrigt: Ej länkade sidor

### HjalplararePage (ej i routing)
- Hanterar anpassade AI-lärarkaraktärer
- Listar lärare med namn + systempromptredigerare (Monaco editor)
- Standardlärare är låsta (skrivskyddade)
- Finns i koden men är inte länkad i navigationen

### SectionPage (legacy)
- Äldre alternativ till CoursePage
- Ej länkad i routing

---

## Sammanfattning av navigationsflöde

```
/login
  ↓ förälder              ↓ barn
/parent/courses          /child/courses
  ├── /parent/courses/:id           (redigera, steg 1-4)
  ├── /parent/courses/:id/dashboard (barnens progress)
  ├── /parent/courses/:id/share     (inbjudningslänk/QR)
  ├── /parent/courses/:id/teach     (Läs o lär – TTS)
  ├── /parent/courses/:id/test-chat (testa som barn)
  └── /parent/children             (hantera barnkonton)
                                     ├── /child/courses/:id/teach (Läs o lär)
                                     └── /child/courses/:id       (Lär mig / Förhör)
```
