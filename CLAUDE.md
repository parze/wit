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

AI-driven undervisningsapp. Lärare skapar **arbetsområden** och laddar upp **läromedel** (PDF/DOCX/TXT). Materialet kompileras av Claude Opus till strukturerat Markdown uppdelat i **Moment** (`##`-rubriker). Elever lär sig via AI-chat (Claude Sonnet) som undervisar ett Moment i taget. En bakgrunds-AI (Claude Haiku) analyserar chatthistoriken och rapporterar vilka Moment som är avklarade.

> **Terminologi:** UI och prompter använder "arbetsområde" (inte "kurs"), "läromedel" (inte "dokument") och "Moment" (inte "del/avsnitt"). API-rutter och databaskolumner är oförändrade (`/api/courses`, `section_documents`, etc.).

## Portar & Åtkomst

| Tjänst | Port | URL |
|--------|------|-----|
| Frontend (Vite) | 5200 | http://49.12.195.247:5200/ |
| Backend (Express) | 5210 | http://49.12.195.247:5210/api |
| PostgreSQL (Docker) | 5433 | localhost:5433 |

---

## Arkitektur – Nyckelflöden

### 1. Arbetsområdesuppbyggnad (lärare)
1. Lärare skapar arbetsområde → laddar upp läromedel till `section_documents`
2. "Förbered undervisningsmaterial" → `POST /api/courses/:id/compile`
   - Backend kör `compileCourse.js` → Claude **Opus 4.6** sammanställer allt till Markdown med Moment som `##`-rubriker
   - `compiled_material` + `compiled_toc` (lista med Moment-namn) sparas på `courses`
   - Lärarens testchatt-session raderas automatiskt
3. Läraren väljer valfri **Instruktion** (`instruction_id` på kursen) med:
   - `compile_prompt` – systemprompt till Opus vid materialgenerering
   - `chat_prompt` – systemprompt till Sonnet i chatt-AI:n

### 2. Elev chattar
- `POST /api/chat/:courseId` (SSE streaming)
- Sonnet 4.6 svarar baserat på `compiled_material` + `chat_prompt` från instruktionen
- Undervisar ett Moment i taget – bekräftar avklarat Moment och introducerar nästa
- Intro-grejen: `{ intro: true }` i body → AI hälsar välkommen (hidden prompt, sparas ej som user-tur)
- Chatthistorik sparas i `chat_sessions` (JSONB)
- Efter varje svar: Haiku analyserar historiken → returnerar `{ currentSection, completedSections[], summary, reasons }`
- `goalAchievement` = `completedSections.length / toc.length * 100`
- Resultat sparas i `ai_summaries`, skickas live via **Socket.io** (`analysis_complete`-event)

### 3. Progress-visning
- Progressbar = andel avklarade Moment (inte AI-bedömt 0-100)
- Vänsterpanel (sm+): rubrik "Moment", visar TOC med grön bock på klara Moment, blå markering på pågående
- `compiled_toc` extraheras automatiskt från `##`-rubriker i kompilerat material

### 4. Lärare testar arbetsområde
- `CourseEditorPage` steg 4 → navigerar till `TestChatPage`
- Läraren chattar precis som en elev men progress sparas inte
- "Rensa"-knapp återstartar sessionen

---

## Projektstruktur

```
/home/pars/git/lärmig/
  frontend/src/
    lib/
      api.js          # Axios, baseURL = http://49.12.195.247:5210/api
      auth.js         # JWT: getUser(), clearAuth()
      socket.js       # Socket.io-klient
    pages/
      teacher/
        TeacherCoursesPage.jsx   # Lista över arbetsområden
        CourseEditorPage.jsx     # Steg 1-4: läromedel, kompilering, instruktion, testa
        TestChatPage.jsx         # Fullskärms testchatt (lärarens elev-vy)
        InstructionsPage.jsx     # CRUD instruktioner (compile_prompt + chat_prompt)
        DashboardPage.jsx        # Elevframsteg per kurs
        StudentsPage.jsx         # Elever + exporterar Sidebar-komponent
        ClassesPage.jsx          # Klasser: elever + kurser
      student/
        StudentCoursesPage.jsx
        CoursePage.jsx           # AI-chatt + progress-panel
        CourseQuizPage.jsx
  backend/src/
    db.js
    compileCourse.js             # Opus 4.6: sammanställer dokument → Markdown + TOC
    middleware/auth.js           # authMiddleware, requireRole()
    routes/
      auth.js          # /api/auth/register, /login
      courses.js       # CRUD kurser + enroll + test-session + compile
      documents.js     # Upload (multer), extrahera text
      chat.js          # POST /api/chat/:courseId – SSE + Haiku-analys + socket
      student.js       # GET /api/student/courses/:id (med aiSummary + messages)
      instructions.js  # CRUD /api/instructions (compile_prompt + chat_prompt)
      teacher.js       # GET /api/teacher/courses/:id/progress
      students.js      # GET/POST/DELETE /api/students
      classes.js       # CRUD klasser + members + courses
      quiz.js          # Quiz-frågor och resultat
      sections.js      # Kvarvarande sections-routes (legacy)
    migrations/        # 27 st Knex-migrationer
```

---

## Databasschema (aktuellt)

| Tabell | Viktiga fält |
|--------|-------------|
| users | id, email, password_hash, name, role (teacher/student), birth_year, gender |
| courses | id, teacher_id, title, description, **compiled_material** (text), **compiled_toc** (JSONB), **instruction_id** |
| section_documents | id, course_id, filename, original_name, extracted_text |
| enrollments | id, student_id, course_id |
| section_progress | id, student_id, course_id, status |
| **chat_sessions** | id, student_id, **course_id**, messages (JSONB) |
| **ai_summaries** | id, student_id, **course_id**, summary, goal_achievement, reasons, **current_section**, **completed_sections** (JSONB) |
| course_instructions | id, teacher_id, name, **compile_prompt**, **chat_prompt**, is_default |
| quiz_questions | id, course_id, question, options (JSONB), correct_index |
| quiz_results | id, student_id, course_id, score, answers (JSONB) |
| classes | id, teacher_id, name, birth_year |
| class_members | id, class_id, student_id |
| course_classes | id, course_id, class_id |
| ai_teachers | id, ... (legacy, används ej längre) |

> **Notera:** Sections-tabellen droppades (migration 20240021). Allt är nu direkt på `courses`.

---

## API-rutter (aktuellt)

### Auth
- `POST /api/auth/register` / `/login`

### Kurser (lärare)
- `GET/POST /api/courses`
- `GET/PUT/DELETE /api/courses/:id`
- `POST /api/courses/:id/compile` – generera material (Opus), raderar testchatt
- `GET/DELETE /api/courses/:id/test-session` – lärarens testchatt
- `GET /api/courses/:id/enrollments`
- `POST /api/courses/:id/enroll`
- `DELETE /api/courses/:id/enrollments/:studentId`

### Dokument
- `POST /api/documents/courses/:id` – ladda upp
- `GET /api/documents/courses/:id`
- `DELETE /api/documents/:id`

### Instruktioner
- `GET/POST /api/instructions`
- `GET/PUT/DELETE /api/instructions/:id`

### Chatt (elever + lärare i testläge)
- `POST /api/chat/:courseId` – SSE-stream, body: `{ message }` eller `{ intro: true }`

### Student
- `GET /api/student/courses` – kurser + aiSummary + messages
- `GET /api/student/courses/:id` – kursdetaljer + chatthistorik
- `POST /api/student/courses/:id/complete` – markera avklarad (ger stjärna)

### Lärare / Dashboard
- `GET /api/teacher/courses/:id/progress`
- `GET/POST/DELETE /api/students`
- `GET/POST /api/classes`
- `POST/DELETE /api/classes/:id/members`
- `POST/DELETE /api/classes/:id/courses`

---

## Viktiga Tekniska Detaljer

- **PDF-parsing**: `pdf2json` (INTE pdf-parse – kraschar med Node 18)
- **DOCX**: `mammoth`
- **Modeller**:
  - Opus 4.6 (`claude-opus-4-6`) – kompilering av kursmaterial (8192 tokens)
  - Sonnet 4.6 (`claude-sonnet-4-6`) – chattundervisning (1024 tokens, prompt caching)
  - Haiku 4.5 (`claude-haiku-4-5-20251001`) – analys av progress (512 tokens)
- **Prompt caching**: systemprompten i chat.js har `cache_control: { type: 'ephemeral' }`
- **Socket.io**: backend emittar `analysis_complete` till `student:{id}` rummet
- **Intro-flöde**: `{ intro: true }` → hidden user-prompt injiceras, poppas bort före sparning
- **TOC/Moment**: extraheras automatiskt ur `##`-rubriker i compiled_material, aldrig `###`. Varje `##`-rubrik = ett Moment
- **Sidebar-komponent**: exporteras från `StudentsPage.jsx`, importeras av andra lärarsidor
- **Enrollment via klasser**: tilldela kurs till klass → alla klassmedlemmar auto-enrollas

## Vanliga Problem & Tips

- Om nodemon inte startar om – kör `touch index.js` för att trigga restart
- Docker-kommandon: använd `sg docker -c "..."` (användaren är inte i docker-gruppen)
- Kontrollera processer: `pgrep -a node` och `pgrep -a vite`
- `ai_teachers`-tabellen finns kvar i databasen men används inte längre (kan städas bort)
- `HjalplararePage.jsx` finns kvar som fil men är inte länkad i routing
