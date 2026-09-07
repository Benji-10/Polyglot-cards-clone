# Polyglot Cards — Project Worklog

A flashcard SRS (spaced repetition) app for language learners, cloning the
features of polyglot-cards.netlify.app. Built with Next.js 16, TypeScript,
Tailwind CSS 4, shadcn/ui, Prisma, Netlify Identity + Neon Postgres.

## Project status
Foundation + API + auth/shell are COMPLETE and compiling. The remaining work is
building the 6 main view components. This worklog is the shared contract for
parallel agents.

## Tech & conventions (MANDATORY for all agents)
- Next.js 16 App Router, TypeScript, Tailwind CSS 4, shadcn/ui (New York).
- All UI components already exist in `src/components/ui/*`. USE THEM — do not
  build new primitives.
- Theme is a dark-mode-first purple/teal palette driven by CSS variables
  (--bg-primary, --bg-surface, --bg-card, --bg-elevated, --border,
  --border-subtle, --text-primary, --text-secondary, --text-muted,
  --accent-primary, --accent-secondary, --accent-warm, --accent-danger,
  --accent-glow). Use the utility classes defined in globals.css:
  `bg-app`, `bg-surface`, `bg-card-base`, `bg-elevated`, `surface-border`,
  `subtle-border`, `pc-card`, `pc-card-elevated`, `pc-tag`, `section-title`,
  `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `text-gradient`,
  `text-secondary`, `text-muted`, `progress-track`, `progress-fill`,
  `card-3d`, `card-inner`, `card-face`, `card-back`, `rating-btn` (with
  `.again/.hard/.good/.easy`), `cloze-input`, `shimmer`, `scrollbar-thin`,
  `animate-slide-up`, `animate-fade-in`, `font-display`, `font-cjk`.
- Fonts: DM Sans (body), Playfair Display (headings via `.font-display`),
  JetBrains Mono. For CJK text use className `font-cjk` or `.cjk`.
- Layout rule: the app shell uses `h-screen flex`. Views render inside
  `<main className="flex-1 overflow-y-auto scrollbar-thin">`. Use
  `p-4 md:p-6 lg:p-8` padding and `max-w-*` containers per view. NO separate
  footer needed in views (the shell handles chrome).
- Toasts: `import { useToast } from "@/hooks/use-toast"` → `const { toast } = useToast();`
  call `toast({ title, description?, variant? })`.

## Available infrastructure (already built — read these before coding)

### Libs (`src/lib/`)
- `types.ts` — ALL shared types: `DeckData`, `DeckWithStats`, `DeckStats`,
  `CardData`, `BlueprintFieldDef`, `Phonetics`, `RubyType`, `ExtraType`,
  `CardFields`, `FieldValue`, `AnnotatedText`, `ReviewLogData`, `Rating`,
  `StudyMode`, `SessionResult`, `User`, `AppSettings`, `OverviewStats`,
  `DEFAULT_SETTINGS`.
- `constants.ts` — `LANGUAGES` (21 + Other, each `{name,flag,bcp47}`),
  `getLanguage`, `getLanguageFlag`, `getLanguageBcp47`, `RUBY_TYPES`,
  `EXTRA_TYPES`, `DEFAULT_BLUEPRINT` (5 fields), `QUICK_ADD_FIELDS`,
  `LEARNING_STEPS` = [1,10] min, `MATURE_THRESHOLD` = 21 days,
  `RATING_INFO` (4 ratings with colors), `THEME_PRESETS` (6 themes),
  `getTheme`.
- `srs.ts` — FSRS-5 scheduler. Exports `schedule(prev, rating, now?)`,
  `predictInterval(prev, rating)` → string like "5d"/"1m"/"10m",
  `formatIntervalDays(days)`, `isMature(intervalDays)`, `isDue(dueAt, now?)`.
  The `SrsStateData` interface = the card's SRS fields.
- `auth.ts` — `AuthUser`, `isNetlifyIdentityConfigured()`, client helpers
  `getStoredAuthUser/storeAuthUser/getOrCreateLocalGuest`, GoTrue calls
  `netlifySignup/netlifyLogin/netlifyRecover`, server `resolveServerUser`.
- `api-client.ts` — `api.get/post/put/patch/del(url, body?)` auto-attaches
  auth headers. `ApiError` with `.status`.
- `ruby.ts` — `parseFurigana(text, furigana)`, `splitExamples(raw)`,
  `parseCloze(sentence)` → `{display, answer, hasCloze, before, after}`,
  `fieldValueToString`, `fieldValueToAnnotated`, `phoneticsFor(ann, phonetics)`.
- `similarity.ts` — `gradeAnswer(expected, given, strictMode, strictAccents)`
  → `{correct, similarity, exact}`, `gradeToRating(grade)` → 1|3,
  `normalize`, `stripAccents`, `containsCJK`.
- `tts.ts` — Web Speech API wrapper: `speak(text, {lang, rate})`,
  `stopSpeaking()`, `isTtsSupported()`, `primeVoices()`, `getVoices()`.
- `mappers.ts` — server-side Prisma→type mappers (not needed in UI).
- `seed.ts` — sample decks (Japanese furigana, Mandarin pinyin, French IPA,
  Spanish cloze).

### Hooks (`src/hooks/`)
- `use-auth.tsx` — `useAuth()` → `{user, loading, isNetlify, signIn, signUp,
  recover, continueAsGuest, signOut}`. AuthProvider wraps the app.
- `use-data.ts` — React Query hooks:
  - `useDecks()` → `DeckWithStats[]`
  - `useDeck(id)` → `DeckData & {id, fields: BlueprintFieldDef[]}`
  - `useCreateDeck()`, `useUpdateDeck()`, `useDeleteDeck()` mutations
  - `useBlueprint(deckId)` → `BlueprintFieldDef[]`
  - `useSaveBlueprint()` mutation `{deckId, fields}`
  - `useCards(deckId, params?)` → `{cards: CardData[], total}`. params:
    `state` (new|learning|review|relearning|due), `search`, `sort`
    (createdAt|word|due), `dir` (asc|desc), `limit`, `offset`.
  - `useCreateCard()`, `useUpdateCard(deckId)`, `useDeleteCard(deckId)`
  - `useStudyCards(deckId, {mode:'learn'|'freestyle', pool?:'all'|'seen'|
    'unseen', randomise?, limit?})` → `{cards: CardData[], total}`
  - `useReviewCard(deckId)` mutation `{cardId, rating:1|2|3|4, timeSpentMs?}`
  - `useStats()` → `OverviewStats`
  - `useCloudSettings()`, `useSaveSettings()`, `useSeed()`
- `use-toast.ts` — shadcn toast.

### Store (`src/store/ui-store.ts`)
- `useUi()` → `{view, sidebarOpen, studyMode, setView, setSidebarOpen,
  setStudyMode}`. `view` is a discriminated union:
  `{name:'dashboard'}|{name:'decks'}|{name:'deck',deckId}|{name:'study',deckId}|
  {name:'stats'}|{name:'settings'}`. Navigate via `setView({name:'deck',deckId})`.

### Components (already built)
- `components/app-shell.tsx` — sidebar + main. Renders `<AppShell>{children}`.
- `components/providers.tsx` — QueryClient + theme. `useAppSettings()` →
  `{settings, setSettings, applyTheme}`.
- `components/ruby-text.tsx` — `<RubyText value={fieldValue}
  phonetics={Phonetics} renderCloze?/>` renders ruby/rt annotations + cloze
  blanks. USE THIS to display any field value.
- `components/decks/deck-form-dialog.tsx` — `<DeckFormDialog open onOpenChange
  trigger? deck?/>` create/edit deck.
- `components/auth/auth-landing.tsx` — landing page.

### API routes (contract)
- `GET /api/auth/me`, `GET /api/decks`, `POST /api/decks`,
  `GET/PATCH/DELETE /api/decks/[id]`, `GET/PUT /api/decks/[id]/blueprint`,
  `GET/POST /api/decks/[id]/cards` (POST accepts single `{word,fields}` or
  batch `{cards:[{word,fields}]}`), `GET /api/decks/[id]/study?mode=&pool=&
  randomise=&limit=`, `GET/PATCH/DELETE /api/cards/[id]`,
  `POST /api/cards/[id]/review {rating, timeSpentMs}`,
  `GET /api/stats`, `GET/PUT /api/settings`, `POST /api/seed`,
  `GET /api/decks/[id]/export?format=csv|json`, `POST /api/decks/[id]/export
  {cards:[...]}` (bulk import).

## Remaining work — view components to build

The main `src/app/page.tsx` already imports and renders these 6 views based on
`useUi().view`. They MUST be created at these exact paths with these exact
default-export names:

1. `src/components/dashboard/dashboard-view.tsx` → `DashboardView`
2. `src/components/decks/decks-view.tsx` → `DecksView`
3. `src/components/decks/deck-detail-view.tsx` → `DeckDetailView` (prop: `deckId: string`)
4. `src/components/study/study-view.tsx` → `StudyView` (prop: `deckId: string`)
5. `src/components/stats/stats-view.tsx` → `StatsView`
6. `src/components/settings/settings-view.tsx` → `SettingsView`

### Task assignment
- Task ID 5 — DashboardView (agent A)
- Task ID 6 — DecksView + DeckDetailView (agent B)
- Task ID 7 — StudyView (agent C)
- Task ID 8 — StatsView + SettingsView (agent D)

## Work log sections below (append, do not overwrite)

---
Task ID: 1-4 (foundation + API)
Agent: main
Task: Set up Prisma schema, core libs, theme/layout, all API routes, auth context, data hooks, app shell.

Work Log:
- prisma/schema.prisma: User, Deck, BlueprintField, Card (FSRS-5 fields), ReviewLog, UserSetting. SQLite locally, PostgreSQL-ready for Neon.
- bun run db:push applied schema.
- src/lib/types.ts, constants.ts (21 languages, 6 theme presets, default blueprint), srs.ts (FSRS-5 scheduler with 4-state model, learning steps [1,10]min, predictInterval), auth.ts (Netlify Identity GoTrue + local guest fallback), similarity.ts (Damerau-Levenshtein grading), ruby.ts (furigana/pinyin/cloze parsing), tts.ts (Web Speech API), api-client.ts, mappers.ts, seed.ts (4 sample decks).
- src/app/globals.css: dark purple/teal theme via CSS vars + utility classes (pc-card, rating-btn, card-3d, etc.).
- src/components/providers.tsx: QueryClient + theme context (useAppSettings).
- src/app/layout.tsx: DM Sans + Playfair + JetBrains Mono fonts; loads Netlify Identity widget on netlify hosts.
- API routes: /api/auth/me, /api/decks (GET/POST), /api/decks/[id] (GET/PATCH/DELETE), /api/decks/[id]/blueprint (GET/PUT), /api/decks/[id]/cards (GET/POST with batch), /api/decks/[id]/study, /api/cards/[id] (GET/PATCH/DELETE), /api/cards/[id]/review, /api/stats, /api/settings (GET/PUT), /api/seed, /api/decks/[id]/export (GET csv/json, POST bulk import).
- src/hooks/use-auth.tsx (AuthProvider), use-data.ts (all React Query hooks), src/store/ui-store.ts (view routing), src/components/app-shell.tsx (sidebar), ruby-text.tsx, decks/deck-form-dialog.tsx, auth/auth-landing.tsx.
- src/app/page.tsx: AuthProvider + view router (dashboard/decks/deck/study/stats/settings).

Stage Summary:
- Foundation complete and compiling. Dev server runs. Contract for the 6 view components is documented above.
- Next: build the 6 view components (Dashboard, Decks, DeckDetail, Study, Stats, Settings).

---
Task ID: 5-8 (UI views + verification + Netlify config)
Agent: main
Task: Build all 6 view components, fix runtime bugs, verify with agent-browser, create Netlify config.

Work Log:
- DashboardView: greeting, 4 stat cards (streak/due/reviewed/retention), due-now deck list, 30-day review area chart, recent decks grid, library summary.
- DecksView: search + grid of deck cards with stats bars (New/Learning/Review/Relearning segments), edit/delete dropdown, create dialog, empty state.
- DeckDetailView: header + stats bar + tabs (Collection / Blueprint / Import-Export). Collection = searchable/filterable/sortable card table with bulk select + delete. BlueprintEditor = reorderable field editor with ruby/extras config. ImportExportPanel = CSV/JSON import + export with header preview.
- CardFormDialog: keyed remount (no set-state-in-effect), per-blueprint-field editors with annotation inputs (furigana/pinyin/ipa/tones/english), example-sentence multi-row editor.
- StudyView: setup screen (Learn/Freestyle + 4 interaction modes + batch size + pool + randomise) → 3D flip card session → session-complete stats. Passive/Typing/Multiple/Cloze modes, FSRS predicted-interval rating buttons, keyboard shortcuts (Space/1-4/Esc), TTS pronunciation.
- StatsView: 4 big stats + 30-day review heatmap + bar chart + card-state pie + deck breakdown.
- SettingsView: account, 6 theme presets (live apply), study defaults, TTS config, connections test.

Bug fixes during verification (agent-browser):
- Nested <button> hydration error in dashboard (outer button wrapping Button) → changed to <div onClick>.
- Prisma race condition: concurrent API calls creating guest user hit unique email constraint (P2002) → wrapped create in try/catch that re-fetches on conflict.
- RubyText crash on undefined phonetics → made phoneticsFor + Extras defensive against undefined.

Netlify config:
- scripts/build-netlify.sh: auto-swaps Prisma provider sqlite→postgresql when DATABASE_URL is a Postgres URL, runs prisma generate + db push + next build.
- netlify.toml: build command, env vars, @netlify/plugin-nextjs, included prisma files.
- .env.example: SQLite local + Neon production examples + Identity URL.
- README.md: full setup guide (Neon + Netlify + Identity).

Verification (agent-browser):
- Landing auto-logs in as guest ✓, Load Sample Decks ✓ (4 decks seeded).
- Dashboard renders with charts ✓. Study session: card flip + FSRS rating buttons with predicted intervals ✓, card advances on rating ✓, due count decrements ✓.
- Decks grid ✓. Deck detail: collection table + tabs ✓. Stats: heatmap + charts + breakdown ✓. Settings: theme switch works ✓.
- Mobile (375px): sidebar collapses to drawer with hamburger toggle ✓. Desktop (1440px): sidebar visible ✓.
- Console clean, no errors.

Stage Summary:
- App is fully functional end-to-end and verified via agent-browser. All 6 views work, SRS scheduling works, phonetic annotations render, themes apply live, mobile responsive.
- Remaining: create 15-min recurring webDevReview cron task.
