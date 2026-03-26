# Lärmig – Manuella Testfall

Verifierade 2026-03-19 via API (http://localhost:5210/api).
Testdata: lärare `test.larare@larmig.se`, elev `test.elev@larmig.se`, lösen `Test1234!`

---

## UC-01 · Registrera lärare

**Endpoint:** `POST /api/auth/register`

```json
{
  "name": "Test Lärare",
  "email": "test.larare@larmig.se",
  "password": "Test1234!",
  "role": "teacher"
}
```

**Förväntat resultat:**
- HTTP 201
- Svar innehåller `token` och `user.role = "teacher"`

**Resultat:** ✅ Passerade. Token utfärdad, user.id = 6.

---

## UC-02 · Skapa elev (som lärare)

**Endpoint:** `POST /api/students`
**Auth:** Lärartoken

```json
{
  "name": "Test Elev",
  "email": "test.elev@larmig.se",
  "password": "Test1234!"
}
```

**Förväntat resultat:**
- HTTP 201
- Elev skapad med `role = "student"`

**Resultat:** ✅ Passerade. user.id = 7.

---

## UC-03 · Logga in (elev)

**Endpoint:** `POST /api/auth/login`

```json
{
  "email": "test.elev@larmig.se",
  "password": "Test1234!"
}
```

**Förväntat resultat:**
- HTTP 200
- Token + `user.role = "student"`

**Resultat:** ✅ Passerade.

---

## UC-04 · Skapa kurs

**Endpoint:** `POST /api/courses`
**Auth:** Lärartoken

```json
{
  "title": "Fysik – Grundkurs",
  "description": "Introduktion till grundläggande fysikaliska begrepp"
}
```

**Förväntat resultat:**
- HTTP 201
- Kurs skapad med `teacher_id` kopplad till inloggad lärare

**Resultat:** ✅ Passerade. course.id = 5.

---

## UC-05 · Skapa avsnitt

**Endpoint:** `POST /api/courses/:id/sections`
**Auth:** Lärartoken

```json
{
  "title": "Kapitel 1 – Grundbegrepp",
  "order": 1
}
```

**Förväntat resultat:**
- HTTP 201
- Avsnitt med `compiled_material = null`, `section_description = null` (genereras asynkront)

**Resultat:** ✅ Passerade. section.id = 5.

---

## UC-06 · Ladda upp dokument

**Endpoint:** `POST /api/sections/:id/documents`
**Auth:** Lärartoken
**Body:** `multipart/form-data`, fält `file` (txt/pdf/docx)

**Förväntat resultat:**
- HTTP 201
- Dokument sparat, text extraherad
- `compileSectionMaterial` triggas asynkront → `compiled_material` sätts
- `generateSectionDescription` triggas asynkront → `section_description` sätts (3–5 meningar, elevvänlig text)

**Resultat:** ✅ Passerade.
`section_description` efter ~10s:
> *"Välkommen till det här kursavsnittet! I dokumentet test-fysik.txt får du lära dig om ett av fysikens viktigaste begrepp – kraft..."*

---

## UC-07 · Skapa quiz-frågor

**Endpoint:** `POST /api/sections/:id/quiz/questions`
**Auth:** Lärartoken

```json
{
  "question": "Vad är SI-enheten för kraft?",
  "options": ["Joule", "Newton", "Watt", "Pascal"],
  "correct_index": 1
}
```

**Förväntat resultat:**
- HTTP 201 per fråga
- Fråga sparad med korrekt `correct_index`

**Resultat:** ✅ Passerade. 2 frågor skapade (id 1, 2).

---

## UC-08 · Enrolla elev i kurs

**Endpoint:** `POST /api/courses/:id/enroll`
**Auth:** Lärartoken

```json
{ "email": "test.elev@larmig.se" }
```

**Förväntat resultat:**
- HTTP 200
- `enrollment` skapad, elev länkad till kursen

**Resultat:** ✅ Passerade.

---

## UC-09 · Elev ser sina kurser

**Endpoint:** `GET /api/student/courses`
**Auth:** Elevtoken

**Förväntat resultat:**
- Lista med enrollade kurser inkl. avsnitt och `status`

**Resultat:** ✅ Passerade. Kurs "Fysik – Grundkurs" med avsnitt `status = "not_started"`.

---

## UC-10 · Elev öppnar avsnitt

**Endpoint:** `GET /api/student/sections/:id`
**Auth:** Elevtoken

**Förväntat resultat:**
- Sektionsdata med `documents`, `questions`, `messages`, `section_description`
- `section_description` synlig för eleven

**Resultat:** ✅ Passerade.
- `section_description` satt ✅
- 1 dokument ✅
- 2 quiz-frågor ✅
- 0 meddelanden (ny chat) ✅

---

## UC-11 · AI-chatt (elev)

**Endpoint:** `POST /api/chat/:sectionId`
**Auth:** Elevtoken

```json
{ "message": "Vad är SI-enheten för kraft?" }
```

**Förväntat resultat:**
- AI svarar baserat på kursdokumentets innehåll
- AI håller sig till ämnet (svarar ej om orelaterade ämnen)
- `ai_summaries` uppdateras efter varje svar

**Resultat:** ✅ Passerade. AI svarade med Sokratisk pedagogik, bad eleven resonera.
Uppföljningsfråga "Newton" → AI bekräftade och fördjupade med F=ma.

---

## UC-12 · Elev svarar på quiz

**Endpoint:** `POST /api/sections/:id/quiz`
**Auth:** Elevtoken

```json
{ "answers": [1, 0] }
```

**Förväntat resultat:**
- `score`, `total`, `results` per fråga (isCorrect)
- Quiz-resultat sparas i DB

**Resultat:** ✅ Passerade. Score: 2/2 (100%), båda svar korrekta.

---

## UC-13 · Lärare dashboard – elevframsteg

**Endpoint:** `GET /api/teacher/courses/:id/progress`
**Auth:** Lärartoken

**Förväntat resultat:**
- Kursinfo + avsnitt
- Per elev: `status`, `quizResult`, `aiSummary`

**Resultat:** ✅ Passerade.

```
student: Test Elev
section: Kapitel 1 – Grundbegrepp
status: completed
quiz: 2/2 (100%)
aiSummary.goalAchievement: 25%
aiSummary: "Eleven kunde korrekt identifiera att Newton är SI-enheten för kraft..."
```

---

## UC-14 · Ta bort dokument → description rensas

**Endpoint:** `DELETE /api/documents/:id`
**Auth:** Lärartoken

**Förväntat resultat:**
- Fil tas bort från disk
- `compileSectionMaterial` och `generateSectionDescription` triggas asynkront
- Om inga dokument kvar: `compiled_material = null`, `section_description = null`

**Resultat:** ✅ Passerade (verifierat i DB efter delete).

---

## Sammanfattning

| UC | Beskrivning | Status |
|----|-------------|--------|
| UC-01 | Registrera lärare | ✅ |
| UC-02 | Skapa elev | ✅ |
| UC-03 | Logga in elev | ✅ |
| UC-04 | Skapa kurs | ✅ |
| UC-05 | Skapa avsnitt | ✅ |
| UC-06 | Ladda upp dokument + generera description | ✅ |
| UC-07 | Skapa quiz-frågor | ✅ |
| UC-08 | Enrolla elev | ✅ |
| UC-09 | Elev listar kurser | ✅ |
| UC-10 | Elev öppnar avsnitt (section_description synlig) | ✅ |
| UC-11 | AI-chatt | ✅ |
| UC-12 | Quizsvar + resultat | ✅ |
| UC-13 | Lärardashboard | ✅ |
| UC-14 | Radera dokument | ✅ |

**14/14 testfall passerade.**
