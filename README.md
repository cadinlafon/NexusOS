# NEXUS OS

A school-focused operating system, as one application. You sign in, and your
role decides which workspace opens:

```
NEXUS Login → Firebase Authentication → NEXUS profile (users/{uid}) → role
    student → StudentOS      /student
    teacher → ClassroomOS    /classroom
    admin   → AdminOS        /admin   (a placeholder for now)
```

Sign-in and profiles are real (Firebase). The school itself (classes,
timetables, assignments, messages) is still example data on your computer.

## Run NEXUS

```bash
npm install
```

Then one of:

```bash
npm run dev:local   # no Firebase project needed: uses the local Firebase emulator
npm run dev         # uses your Firebase project, from .env.local
```

Either way, open **http://localhost:5173**. That one address is all of NEXUS:
StudentOS, ClassroomOS, the classroom link and NEXUS AI.

`npm run build` type-checks and builds. The native NEXUS Browser (Chromium
Embedded Framework) is described in
[docs/BROWSER_ENGINE.md](docs/BROWSER_ENGINE.md).

## Accounts and roles

### Option A — the local emulator (quickest)

`npm run dev:local` starts the Firebase Local Emulator Suite (Authentication
and Firestore, with the real `firestore.rules`) and NEXUS together. It needs
the Firebase CLI (`npm install -g firebase-tools`) and Java. Accounts are saved
in `.firebase-data/` when you stop it with Ctrl+C.

With it running, make the two test accounts from a second terminal:

```bash
npm run dev:users
```

| Role    | Email                 |
| ------- | --------------------- |
| Student | `student@nexus.local` |
| Teacher | `teacher@nexus.local` |

Both use the password in `.env.emulator` (`NEXUS_DEV_PASSWORD`). The script is
development-only: it refuses to run against anything but the emulator. You can
also look at accounts and profiles in the Emulator UI at http://127.0.0.1:4000.

### Option B — your own Firebase project

1. In the [Firebase console](https://console.firebase.google.com), create a
   project and add a **Web app** to it.
2. **Authentication → Sign-in method**: enable **Email/Password**.
3. **Firestore Database**: create a database (production mode).
4. Publish the security rules: paste `firestore.rules` into **Firestore →
   Rules**, or run `firebase deploy --only firestore:rules --project YOUR_PROJECT_ID`.
5. Create `.env.local` with the web app's configuration (Project settings →
   General → Your apps):

   ```
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   ```

   `.env.local` is ignored by Git. If any value is missing, NEXUS says which
   one instead of failing.
6. `npm run dev`.

**Create a student test account.** On NEXUS Login choose *Create account* and
use, for example, `student@nexus.local`. Every new account gets a student
profile. (An account added in the console under Authentication → Users also
becomes a student the first time it signs in.) Do not use real student
information.

**Create a teacher test account.** Create the account the same way (for
example `teacher@nexus.local`), then in the console open **Firestore → users →
that account's document** and change `role` from `student` to `teacher`. NEXUS
moves the account to ClassroomOS straight away. There is deliberately no way
to do this from inside NEXUS: the rules refuse it.

### The profile

`users/{uid}` is the only Firestore collection so far:

```
{ uid, email, displayName, role: "student" | "teacher" | "admin", schoolId: "demo-school", createdAt }
```

### What enforces what

- **Firebase Authentication** proves who someone is. NEXUS never handles or
  stores a password.
- **The Firestore profile** says what role they have.
- **`firestore.rules`** is the security boundary. An account can read only its
  own profile, create it only as a student, and afterwards change only its
  display name. It cannot change its role, school, email or uid, read anyone
  else's profile, delete its profile, or touch any other collection.
- **Routing** (`src/auth/ProtectedRoute.tsx`) keeps each role in its own
  workspace: a student who opens `/classroom` is sent to `/student`, a teacher
  who opens `/student` is sent to `/classroom`, and anyone signed out is sent
  to `/login`. This is for getting people to the right place. It is not
  security.

**Not protected yet.** The classroom link (`classroom/relayPlugin.mjs`, at
`/__classroom`) and the NEXUS AI service (`/__ai`) are development stand-ins
inside the dev server. They do not check who is calling, so anything on this
computer can use them. Real versions must verify the caller's Firebase ID
token and role on a server.

**Still example data.** A signed-in student's name and email are real, but
their timetable, classes and assignments come from one example school record,
and a signed-in teacher manages an example teacher's classes (chosen under
*Prototype controls* in ClassroomOS Settings). Two students signed in at once
therefore look like the same student to a teacher. Linking accounts to school
records is a later milestone.

### Where things are

```
src/services/firebase/   firebase.ts (the one initialisation), auth.ts, firestore.ts
src/auth/                AuthProvider, authService, ProtectedRoute, LoginScreen, types (roles)
src/routing/router.tsx   the small path router
src/student/StudentOS    the student desktop
src/teacher/             ClassroomOS
src/admin/AdminOS        placeholder
firestore.rules          security rules
scripts/seed-dev-users   emulator-only test accounts
```

## NEXUS AI

NEXUS AI is in both workspaces: the **NEXUS AI** window in StudentOS and the
**NEXUS AI** page in ClassroomOS. It answers through
[OpenRouter](https://openrouter.ai), using **free models only**.

### Setup

1. Create an OpenRouter API key (openrouter.ai → *Keys*).
2. Put it in `.env.local` (or `.env`); both are ignored by Git:

   ```
   OPENROUTER_API_KEY=your_key_here
   ```

   `VITE_OPENROUTER_API_KEY` is accepted too, but prefer the name without
   `VITE_`. Vite hands every `VITE_` variable to the page during development,
   and NEXUS does not need the key there: only the local NEXUS AI service
   reads it.
3. Start NEXUS (`npm run dev:local` or `npm run dev`), sign in, and open
   NEXUS AI.
4. Check everything at once, while NEXUS is running:

   ```bash
   npm run ai:test
   ```

   It makes one small real request per capability, prints the model that
   answered, and checks that a paid model cannot be reached. The **Models**
   tab in NEXUS AI has the same tests as buttons.

### Models

Every model id lives in one file, [`ai/models.json`](ai/models.json). The
first model in a list is tried first; the rest are fallbacks, in order. All
were checked against OpenRouter's catalog and called successfully on
2026-10-09.

| Capability | Model id | Notes |
| --- | --- | --- |
| Chat | `nvidia/nemotron-3-super-120b-a12b:free` | Main chat |
| Chat (fallback) | `liquid/lfm-2.5-2.6b:free` | Used if the main model is busy |
| Coding | `cohere/north-mini-code:free` | Falls back to Nemotron 3 Super |
| Long context | `nvidia/nemotron-3-ultra-550b-a55b:free` | 1,000,000-token context. Configured and tested; no screen uses it yet |
| Image | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | Understands an attached picture. Does not create pictures |
| Decisions | `inception/mercury-decide:free` | Yes/no and multiple choice. Teachers only |
| Decisions (fallback) | `respan/span-01-lite:free` | Yes/no questions only |
| Embeddings | `nvidia/nemotron-3-embed-1b:free` | 2048 dimensions |
| Reranking | `nvidia/llama-nemotron-rerank-vl-1b-v2:free` | Configured and tested; no screen uses it yet |
| Voice | `fish-audio/s2.1-pro-free:free` | Text to speech only |
| Transcription | — | Unavailable: OpenRouter has no free transcription model |
| Video | — | Unavailable: every video model is billed per second |
| Audio generation | — | Unavailable: no `:free` model |

**Daily limit.** OpenRouter gives an account with no credits 50 free requests
a day, shared across all free models (adding 10 credits to the account raises
that to 1,000 a day; the models stay free). When it is used up, NEXUS AI says
"NEXUS AI has used up today's free requests" until it resets. `npm run ai:test`
uses about a dozen of them.

**No paid model, ever.** The service only uses an id that is in
`ai/models.json` *and* ends in `:free`. A page cannot name another model, and
when every model for a capability fails you get an error, not a paid fallback.

**Labels are truthful.** A conversation shows `Chat · NVIDIA Nemotron 3 Super`
before anything is sent (what will be tried) and `Chat · Using …` once a model
has answered. If a fallback answers, the label and the reply's footer name the
fallback.

### How it is put together

```
NEXUS AI (StudentOS window, ClassroomOS page)   src/ai/, src/apps/NexusAIApp.tsx, src/teacher/pages/AIPage.tsx
      ↓
aiService                    src/services/ai/aiService.ts
      ↓
OpenRouter provider          src/services/ai/openRouterProvider.ts
      ↓
NEXUS AI service             ai/aiServicePlugin.mjs   (/__ai: holds the key, picks the model)
      ↓
OpenRouter  →  a free model from ai/models.json
```

- **The interface only talks to `aiService`.** To use another provider, or a
  school's own server, write one more `AIProvider`
  (`src/services/ai/types.ts`) and select it in `aiService.ts`.
- **The capability registry** is `src/services/ai/models.ts`, read from
  `ai/models.json`.
- **System prompts** are in `src/services/ai/systemPrompt.ts`: one for
  students, one for teachers, plus a short addition per capability.
- **The student context** sent with Chat and Coding is built in
  `src/services/ai/context.ts`: the current class, today's classes, the
  current assignment, open and allowed applications, class websites and Test
  Mode. It leaves out the student's name and number, messages and teacher
  names. Teacher chats are sent no school data at all.
- **Policy is decided outside the model.** During Test Mode, or when a teacher
  turns AI off for a class, the student window shows "AI is unavailable during
  this activity" and no request is sent.
- **Classroom Intelligence** (`src/services/ai/classroomIntelligence.ts`,
  shown under *Class insights*) counts assignment progress in ordinary code
  from the teacher's classes and what connected desktops report. A model is
  only asked for an opinion on those totals, and for draft reminders and
  review questions. It is sent totals and the assignment's title, never a
  student's name. It sends, grades and changes nothing; a student NEXUS has no
  report from is counted as "Not known", not as behind.
- **Search** (`src/services/ai/embeddingService.ts`) compares the documents it
  is handed, in memory, each time. It is only ever handed the signed-in
  student's own documents. There is no vector database: searching a school's
  files needs a stored index, which is a later step.
- **Tools** (`src/services/ai/tools.ts`) are definitions only. None is given
  to a model and none runs.

### The key, and what production needs

The key is read by `ai/aiServicePlugin.mjs`, which runs inside the Vite dev
server (Node). It is not in the browser bundle and is not sent to the page.
That file is a development stand-in, not a backend: it does not check who is
calling (so, for example, it cannot tell a teacher from a student), and it
only runs with `npm run dev`, `npm run dev:local` or `npm run preview`.

In a school the same `/__ai` address must be an authenticated service on the
school's side:

```
NEXUS Desktop  →  NEXUS AI Service  →  authenticated school backend  →  the AI provider
```

That service should verify the caller's Firebase ID token and role, own the
system prompts, check policy itself, and log and limit use. Free and preview
models may also keep or train on what they are sent: review each provider's
data terms before any real student work goes through them.
