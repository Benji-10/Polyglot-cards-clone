# Polyglot Cards

AI-powered flashcards for multi-language learners. A full clone of
[polyglot-cards.netlify.app](https://polyglot-cards.netlify.app/) built with
**Next.js 16**, **FSRS-5 spaced repetition**, **Netlify Identity**, and a
**Neon PostgreSQL** database.

## Features

- **FSRS-5 spaced repetition** — 4-state model (new / learning / review /
  relearning), learning steps `[1, 10]` min, 4-button grading
  (Again / Hard / Good / Easy) with **predicted next interval** on each button.
- **Blueprint-per-deck system** — define custom fields per deck (text or
  example-sentence type), choose which appears on the card front.
- **Phonetic annotations** — render furigana, pinyin, bopomofo, jyutping,
  romanisation, IPA, tone marks, and English glosses as proper `<ruby>`
  elements.
- **4 study modes** — Passive (self-grade), Typing (Levenshtein auto-grade
  with accent tolerance), Multiple Choice, and Cloze (`{{word}}` templates).
- **Text-to-speech** — pronounce any target-language word using the browser's
  Web Speech API voices (no external service required).
- **CSV / JSON import & export** with blueprint metadata for round-trip imports.
- **Statistics** — streak counter, retention rate, 30-day review heatmap,
  per-day bar chart, card-state pie chart, and per-deck breakdown.
- **6 theme presets** (Nebula, Cyber, Forest, Ember, Rose, Parchment) applied
  live via CSS variables — including a light theme.
- **21 languages** with flags and BCP-47 tags for TTS.
- **Offline-aware** — React Query mutations queue when offline.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM → SQLite (dev) / Neon PostgreSQL (prod) |
| Auth | Netlify Identity (GoTrue) + local guest fallback |
| State | TanStack Query (server) + Zustand (UI/study session) |
| Charts | Recharts |
| Fonts | DM Sans, Playfair Display, JetBrains Mono |

## Local development

```bash
bun install
bun run db:push     # creates the SQLite database
bun run dev         # http://localhost:3000
```

The app works immediately in local mode: a guest user is auto-created so you
can explore every feature without configuring Netlify Identity. Click
**"Load Sample Decks"** on the dashboard to populate Japanese, Mandarin, French,
and Spanish sample decks with phonetic annotations.

## Deploying to Netlify (with Neon + Netlify Identity)

### 1. Create a Neon database

1. Go to [neon.tech](https://neon.tech) and create a free project.
2. Copy the **connection string** (it looks like
   `postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`).
3. Use the **pooled** connection (`-pooler` in the hostname) — it's free and
   ideal for serverless. The direct connection works too but the pooled one is
   recommended for Netlify Functions.

### 2. Deploy to Netlify

1. Push this repo to GitHub/GitLab.
2. In Netlify, **Add new site → Import an existing project** and pick the repo.
3. The `netlify.toml` is already configured — the build command is
   `bash scripts/build-netlify.sh`, which automatically:
   - Detects the PostgreSQL `DATABASE_URL` and switches the Prisma provider
     from `sqlite` to `postgresql`.
   - Runs `prisma generate` + `prisma db push` (creates tables on Neon).
   - Builds Next.js with the standalone output.
4. In **Site settings → Environment variables**, add:
   - `DATABASE_URL` → your Neon connection string
   - `NEXT_PUBLIC_NETLIFY_IDENTITY_URL` → `https://<your-site>.netlify.app`

### 3. Enable Netlify Identity

1. In the Netlify dashboard: **Site → Integrations → Identity → Enable**.
2. Set **Registration** to *Open* (or *Invite only* if you prefer).
3. Once enabled, the login/signup UI in this app will talk to the GoTrue API
   at `https://<your-site>.netlify.app/.netlify/identity` and real accounts
   are created. Data is scoped per-user and syncs across all devices.

> **Note:** The Netlify Identity widget script is auto-loaded on `*.netlify.app`
> hosts (see `src/app/layout.tsx`). The custom auth dialog in
> `src/components/auth/auth-landing.tsx` uses the GoTrue REST API directly for a
> polished, on-brand experience.

## Project structure

```
prisma/schema.prisma          # User, Deck, BlueprintField, Card, ReviewLog, UserSetting
src/lib/
  srs.ts                      # FSRS-5 scheduler (schedule, predictInterval)
  auth.ts                     # Netlify Identity (GoTrue) + local guest fallback
  ruby.ts                     # furigana / pinyin / cloze parsing
  similarity.ts               # Damerau-Levenshtein grading for typing mode
  tts.ts                      # Web Speech API wrapper
  constants.ts                # 21 languages, 6 themes, default blueprint
src/app/api/                  # REST API routes (decks, cards, srs, stats, ...)
src/components/               # App shell, views (dashboard/decks/study/stats/settings)
src/hooks/                    # use-auth, use-data (React Query), use-toast
src/store/                    # ui-store (view routing + study mode)
```

## Keyboard shortcuts (study session)

| Key | Action |
|---|---|
| `Space` / `Enter` | Flip card (passive) / submit answer / continue |
| `1` `2` `3` `4` | Grade Again / Hard / Good / Easy (passive, after flip) |
| `Enter` | Submit typing / cloze answer |
| `Esc` | Exit session |
