# Claude Instructions

## Plan Before Executing

Always present a plan and wait for explicit user approval before starting any implementation work.

Use `EnterPlanMode` to outline what you intend to do, then wait for the user to confirm before proceeding.

---

## Snabbstart för ny session (läs detta först)

**Projektet ligger i:** `/home/pars/git/lärmig/`

**Kontrollera att tjänster körs:**
```bash
pgrep -a nodemon   # backend
pgrep -a vite      # frontend
sg docker -c "docker ps"  # PostgreSQL container
```

**Starta allt på en gång:**
```bash
cd /home/pars/git/lärmig
npm run dev-all   # startar backend + frontend via concurrently
```

**Loggar:**
```bash
tail -f /tmp/backend.log
tail -f /tmp/frontend.log
```

**Migrationer (om ny db):**
```bash
cd /home/pars/git/lärmig/backend && npx knex migrate:latest
```

---

# Lärmig – Projektöversikt

AI-driven undervisningsapp för hemmabruk. Föräldrar skapar **arbetsområden** och laddar upp **läromedel** (PDF/DOCX/TXT). Materialet kompileras av Claude Opus till strukturerat Markdown uppdelat i **Moment** (`##`-rubriker). Barn lär sig via AI-chat (Claude Sonnet) som undervisar ett Moment i taget. Progressen spåras automatiskt via TOC-avancering.

> **Terminologi:** UI och prompter använder "arbetsområde" (inte "kurs"), "läromedel" (inte "dokument") och "Moment" (inte "del/avsnitt"). Roller: "förälder" (parent) och "barn" (child). API-rutter och databaskolumner använder `parent_id`, `child_id` etc.

## Portar & Åtkomst

| Tjänst | Port | URL |
|--------|------|-----|
| Frontend (Vite) | 5200 | http://49.12.195.247:5200/ |
| Backend (Express) | 5210 | http://49.12.195.247:5210/api |
| PostgreSQL (Docker) | 5433 | localhost:5433 |

---

## Arkitektur – Nyckelflöden

### 1. Arbetsområdesuppbyggnad (förälder)
1. Förälder skapar arbetsområde → laddar upp läromedel till `section_documents`
2. "Förbered undervisningsmaterial" → `POST /api/courses/:id/compile`
   - Backend kör `compileCourse.js` → Claude **Opus 4.6** sammanställer allt till Markdown med Moment som `##`-rubriker
   - `compiled_material` + `compiled_toc` (lista med Moment-namn) sparas på `courses`
   - Förälderns testchatt-session raderas automatiskt
3. Föräldern väljer **Lärstil** (`learning_mode` på kursen) – ett av 5 hårdkodade lägen definierade i `learningModes.js`:
   - `procedural` – steg-för-steg
   - `conceptual` – begreppsbaserat
   - `discussion` – diskussionsbaserat
   - `narrative` – berättande
   - `exploratory` – utforskande

### 2. Barn chattar
- `POST /api/chat/:courseId` (SSE streaming)
- Sonnet 4.6 svarar baserat på `compiled_material` + lärstilens prompt från `learningModes.js`
- Undervisar ett Moment i taget – bekräftar avklarat Moment och introducerar nästa
- Intro-grejen: `{ intro: true }` i body → AI hälsar välkommen (hidden prompt, sparas ej som user-tur)
- Chatthistorik sparas i `chat_sessions` (JSONB)
- `goalAchievement` = `completedSections.length / toc.length * 100`
- Resultat sparas i `ai_summaries`, skickas live via **Socket.io** (`analysis_complete`-event)

### 3. Progress-visning
- Progressbar = andel avklarade Moment (inte AI-bedömt 0-100)
- Vänsterpanel (sm+): rubrik "Moment", visar TOC med grön bock på klara Moment, blå markering på pågående
- `compiled_toc` extraheras automatiskt från `##`-rubriker i kompilerat material

### 4. Förälder testar arbetsområde
- `CourseEditorPage` steg 4 → navigerar till `TestChatPage`/`TeachMePage`
- Föräldern chattar precis som ett barn men progress sparas inte
- "Rensa"-knapp återstartar sessionen

### 5. Barn skapas av föräldern
- Barn har `username` (inte email) + lösenord
- Föräldern skapar barn via `/parent/children`-sidan
- Login stödjer both email (förälder) och username (barn) — backend kollar `@` i input

---

## Projektstruktur

```
/home/pars/git/lärmig/
  frontend/src/
    lib/
      api.js          # Axios, baseURL = http://49.12.195.247:5210/api
      auth.js         # JWT: getUser(), clearAuth(), isParent()
      socket.js       # Socket.io-klient (query: userId)
    pages/
      teacher/
        TeacherCoursesPage.jsx   # Lista över arbetsområden (förälder)
        CourseEditorPage.jsx     # Steg 1-4: inställningar, läromedel, kompilering, testa
        TestChatPage.jsx         # Fullskärms testchatt (förälderns barn-vy)
        DashboardPage.jsx        # Barnframsteg per kurs
        StudentsPage.jsx         # Barn + exporterar Sidebar-komponent
      student/
        StudentCoursesPage.jsx   # Barnets kurslista (enrollade kurser)
        CoursePage.jsx           # AI-chatt + progress-panel
  backend/src/
    db.js
    compileCourse.js             # Opus 4.6: sammanställer dokument → Markdown + TOC
    middleware/auth.js           # authMiddleware, requireRole()
    routes/
      auth.js          # /api/auth/register, /login (stödjer email + username)
      courses.js       # CRUD kurser + enroll + test-session + compile
      documents.js     # Upload (multer), extrahera text
      chat.js          # POST /api/chat/:courseId – SSE + analys + socket
      child.js         # GET /api/child/courses/:id (med aiSummary + messages)
      parent.js        # GET /api/parent/courses/:id/progress
      children.js      # GET/POST/DELETE /api/children
    migrations/        # 8 st Knex-migrationer (20260001–20260008)
```

---

## Databasschema (aktuellt)

| Tabell | Viktiga fält |
|--------|-------------|
| users | id, name, email (nullable, föräldrar), username (nullable, barn), password_hash, role (parent/child), parent_id FK→users, gender, birth_year |
| courses | id, parent_id, title, description, **compiled_material** (text), **compiled_toc** (JSONB), **learning_mode** |
| section_documents | id, course_id, filename, original_name, extracted_text |
| enrollments | id, child_id, course_id, unique(child_id, course_id) |
| chat_sessions | id, child_id, course_id, messages (JSONB), quiz_messages (JSONB) |
| ai_summaries | id, child_id, course_id, summary, goal_achievement, reasons, current_section, completed_sections (JSONB), quiz_score, quiz_answered_sections (JSONB) |
| section_progress | id, child_id, course_id, status |
| section_stars | id, child_id, course_id, goal_achievement |

---

## API-rutter (aktuellt)

### Auth
- `POST /api/auth/register` – skapar föräldrakonto (hårdkodad role: parent)
- `POST /api/auth/login` – stödjer email (förälder) och username (barn)

### Kurser (förälder)
- `GET/POST /api/courses`
- `GET/PUT/DELETE /api/courses/:id`
- `POST /api/courses/:id/compile` – generera material (Opus), raderar testchatt
- `GET/DELETE /api/courses/:id/test-session` – förälderns testchatt
- `GET/DELETE /api/courses/:id/quiz-session` – förälderns quiz-session
- `GET /api/courses/:id/enrollments`
- `POST /api/courses/:id/enroll` – enrolla barn via child_id
- `DELETE /api/courses/:id/enrollments/:childId`

### Dokument
- `POST /api/courses/:id/documents` – ladda upp
- `GET /api/courses/:id/documents`
- `DELETE /api/documents/:id`

### Chatt (barn + förälder i testläge)
- `POST /api/chat/:courseId` – SSE-stream, body: `{ message }` eller `{ intro: true }`

### Barn
- `GET /api/child/courses` – kurser + aiSummary + messages
- `GET /api/child/courses/:id` – kursdetaljer + chatthistorik
- `POST /api/child/courses/:id/complete` – markera avklarad (ger stjärna)

### Förälder / Dashboard
- `GET /api/parent/courses/:id/progress`
- `GET/POST/DELETE /api/children`

---

## Viktiga Tekniska Detaljer

- **PDF-parsing**: `pdf2json` (INTE pdf-parse – kraschar med Node 18)
- **DOCX**: `mammoth`
- **Modeller**:
  - Opus 4.6 (`claude-opus-4-6`) – kompilering av kursmaterial (8192 tokens)
  - Sonnet 4.6 (`claude-sonnet-4-6`) – chattundervisning (1024 tokens, prompt caching)
  - Haiku 4.5 (`claude-haiku-4-5-20251001`) – quick replies (512 tokens)
- **Prompt caching**: systemprompten i chat.js har `cache_control: { type: 'ephemeral' }`
- **Socket.io**: backend emittar `analysis_complete` till `user:{id}` rummet
- **Intro-flöde**: `{ intro: true }` → hidden user-prompt injiceras, poppas bort före sparning
- **TOC/Moment**: extraheras automatiskt ur `##`-rubriker i compiled_material, aldrig `###`. Varje `##`-rubrik = ett Moment
- **Sidebar-komponent**: exporteras från `StudentsPage.jsx`, importeras av andra sidor

## Vanliga Problem & Tips

- Om nodemon inte startar om – kör `touch index.js` för att trigga restart
- Docker-kommandon: använd `sg docker -c "..."` (användaren är inte i docker-gruppen)
- Kontrollera processer: `pgrep -a node` och `pgrep -a vite`
- `HjalplararePage.jsx` och `SectionPage.jsx` finns kvar som filer men är inte länkade i routing
