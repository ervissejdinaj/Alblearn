# AlbLearn — Project Requirements

**Qëllimi:**
AlbLearn është një aplikacion për mësimin e gjuhës shqipe i dizajnuar për përdorues të huaj. Aplikacioni do të jetë i disponueshëm fillimisht në anglisht dhe do të kërkojë regjistrim për të ndjekur ecurinë e përdoruesve.

---

## Përmbledhje funksionale

- Përdoruesit mund të regjistrohen dhe të identifikohen (email si username).
- Aplikacioni përmban *module* tematike; çdo modul përbëhet nga *seksione* të renditura.
- Çdo seksion përmban një pjesë përshkruese (teori / content HTML) dhe një test (quiz) kur është e nevojshme.
- Pasi përdoruesi përfundon një seksion/quiz ai fiton pikë që i lejojnë qasje në seksionin tjetër.
- Roli **Administrator** menaxhon instruktorët, modulet, dhe mund të shikojë ecurinë e përdoruesve.
- Roli **Instruktor** redakton përmbajtjen e moduleve që i caktohen deri në publikim. Pasi një modul publikohet, përmbajtja e tij bëhet e pandryshueshme.

---

## Aktorët & Të drejtat

### Administrator
- CRUD instruktorë
- CRUD module
- CRUD përmbajtje module (shtim / fshirje / edit) përpara publikimit
- Lidhje (assign) instruktor ↔ modul
- Akses në bazën e të dhënave të përdoruesve dhe ecurisë së tyre

### Instruktori
- Ka akses vetëm ndaj moduleve të caktoara
- CRUD mbi përmbajtjen e atij moduli para publikimit
- Shikon listën e përdoruesve që ndoqën modul (progress dhe level)

### Përdoruesi
- Regjistrim vetë-shërbyes
- Zgjedh modul dhe ndjek seksionet
- Ruajtje e ecurisë (progress)
- Shikim i pikëve të grumbulluara

---

## Baza e të dhënave (schema)

### Tabela `USER`
- `id` (PK)
- `first_name` (string)
- `last_name` (string)
- `date_of_birth` (date)
- `email` (string, unique) — përdoret si username
- `password_hash` (string)
- `role` (enum: `admin`, `instructor`, `user`)
- `created_at` (timestamp)
- `total_points` (int)

### Tabela `MODULE`
- `id` (PK)
- `name` (string)
- `description` (text)
- `module_points` (int) — pikët që fitohen në përfundim të modulit
- `prerequisite_module_id` (FK nullable) — self-join
- `is_published` (boolean)
- `created_at`, `published_at`

### Tabela `SECTION`
- `id` (PK)
- `module_id` (FK → MODULE.id)
- `content_html` (longtext) — përshkrimi i teorisë, mund të përmbajë HTML për formatim
- `order` (int) — numri rendor brenda modulit
- `created_at`, `updated_at`

### Tabela `QUIZES` (ose `QUIZZES`)
- `id` (PK)
- `module_id` (FK → MODULE.id)
- `type` (enum: `open`, `closed`)
- `question` (text)
- `answer` (text) — për pyetjet closed mund të ruajmë alternativat dhe përgjigjen e saktë

> Mund të zgjerohet me tabela të ndara për `quiz_questions` dhe `quiz_options` në rast skenarësh më kompleks.

### Tabela `PROGRESS`
- `id` (PK)
- `user_id` (FK → USER.id)
- `module_id` (FK → MODULE.id)
- `section_number_completed` (int)
- `completed` (boolean)
- `module_score` (int)
- `updated_at`

---

## UI / Pages (React + Tailwind + TypeScript)

### Auth
- `/login` — formë me `email` + `password`, link për `/signup`
- `/signup` — fushat: emër, mbiemër, datëlindje, email, password, confirm password
- (Opsionale) verifikim emaili

### Admin
- `/admin` — Dashboard me tre seksione kryesore: Menaxhim Moduleve, Menaxhim Instruktorëve & Atribuimi, Shfaqja e Përdoruesve (paging + search by name)
- CRUD forms për module dhe për instruktorë

### Instructor
- `/instructor` — Lista e moduleve të caktuara
- `/instructor/modules/:id` — Menaxhim i modulit: shto/edit seksione, menaxho quiz-e, publikim
- Panel për të parë përdoruesit që ndoqën modul (progress)

### User
- `/dashboard` — Lista e moduleve me indikacione (lock icon për modulet me kusht)
- `/modules/:id` — Hap modul; të shfaqet seksioni i fundit i vizituar
- `/modules/:id/sections/:order` — Përmbajtja dhe buton “Mark as read”/në rast testi, lidhet me quiz
- `/modules/:id/quiz` — Testi aktiv vetëm pasi të jenë vizituar të gjitha seksionet

---

## API (propozim RESTful endpoints)

- `POST /api/auth/signup` — regjistrim
- `POST /api/auth/login` — login (kthen JWT)
- `GET /api/modules` — listë module (filtrim sipas aksesit)
- `GET /api/modules/:id` — detajet e modulit + seksionet
- `POST /api/modules` — krijim modul (admin)
- `PUT /api/modules/:id` — edit modul (admin)
- `DELETE /api/modules/:id` — fshirje modul (admin)
- `POST /api/modules/:id/sections` — shto seksion (instruktor i caktuar)
- `PUT /api/sections/:id` — update section (instruktor)
- `POST /api/quiz/:moduleId/submit` — dorëzo quiz, llogarit pikët dhe përditëson `PROGRESS`
- `GET /api/users` — listë përdoruesish (admin) me pagination & search

---

## Tech stack & Tools

- **Frontend:** React + TypeScript, Tailwind CSS
- **Routing:** React Router v6 (ose Next.js pages/app router nëse zgjidhet Next.js)
- **State:** React Context / Redux Toolkit (ose TanStack Query për fetch dhe caching)
- **Auth:** JWT (backend) ose Firebase Auth (opsional) — vendos shkallëzueshmërinë
- **Backend:** Node.js + Express (ose NestJS për strukturë më të fortë)
- **DB:** PostgreSQL (ose MySQL) — përdor migrations (Prisma / TypeORM / Sequelize)
- **Storage:** S3 (për pasqyrime/media) ose Firebase Storage
- **Hosting:** Vercel/Netlify (frontend), Render/Heroku/Cloud provider (backend)
- **Testing:** Jest + React Testing Library

---

## Strukturë projekti (propozim)

```
AlbLearn/
├─ frontend/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ pages/ (or app/)
│  │  ├─ hooks/
│  │  ├─ services/ (api clients)
│  │  ├─ styles/
│  │  └─ types/
├─ backend/
│  ├─ src/
│  │  ├─ controllers/
│  │  ├─ routes/
│  │  ├─ models/
│  │  ├─ services/
│  │  └─ migrations/
└─ infra/
   ├─ docker-compose.yml
   └─ k8s/ (opsionale)
```

---

## Development roadmap (MVP)

1. Setup repo + toolchain (TS, ESLint, Prettier, Tailwind)
2. Auth (signup/login) + user model
3. CRUD modules & sections (admin/instructor flows)
4. User dashboard + progress tracking
5. Quiz flow + scoring
6. Publishing flow (publish module → freeze content)
7. Admin reports (list users, search, paging)
8. Tests + deployment

---

## Acceptance criteria

- Regjistrim dhe login funksional (JWT + proteksion rutesh)
- Admin mund krijojë/editojë/fshij module dhe instruktorë
- Instruktori mund të shtojë/editojë seksione para publikimit
- Përdoruesit ruajnë progresin dhe marrin pikë pas quiz
- Një modul i publikuar nuk mund të ndryshohet pa versioning

---

## Notes & sugjerime

- Siguro ruajtjen e `password_hash` dhe përdor `bcrypt` ose saktësisht mekanizma të sigurta.
- Konsidero versioning për module (p.sh. `module_versions`) nëse dëshiron të lehtësojë ndryshimet pas publikimit.
- Përdor pagination në endpoint-et që kthejnë lista të mëdha (users/modules).
- Shto logging dhe basic metrics (p.sh. për vëzhgim të përdorimit të moduleve).

---

*Dokument përgatitur për zhvillim me React + TypeScript + Tailwind. Nëse dëshironi, mund ta përkthej dokumentin në anglisht, të nxjerr skemën SQL për migrime (Postgres), ose të krijoj një backlog me user stories/epics.*

