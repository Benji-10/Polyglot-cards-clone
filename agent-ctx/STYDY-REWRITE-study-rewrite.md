# Task STYDY-REWRITE — Study Session Card Rendering Rewrite

**Agent**: study-rewrite (main)
**Task ID**: STYDY-REWRITE
**Date**: 2024-Q4 (during development)

## Goal

Rewrite the study session card rendering in `src/components/study/study-view.tsx`
to fix critical UX issues across all 4 study modes (cloze / typing / passive /
multiple), add a diacritic / special-character input bar, and clean up debug
`console.log`s.

## Files Changed

1. **`src/lib/diacritics.ts`** (NEW)
   - Per-language special-character map for the diacritic bar.
   - Languages covered: French, Spanish, German, Italian, Portuguese,
     Vietnamese, Polish, Turkish, Czech, Slovak, Croatian, Romanian, Hungarian,
     Swedish, Danish, Norwegian, Finnish, Icelandic, Dutch.
   - Pinyin tone marks (`ā á ǎ à … ǖ ǘ ǚ ǜ`) for `Chinese (Mandarin)`.
   - Empty arrays for CJK / Cyrillic / Arabic / Hebrew / Hindi / Greek / Thai
     (these are typed via IME, not the diacritic bar).
   - `getAnswerLanguage(opts)` — resolves which language's script the user is
     typing the answer in, so the correct diacritic bar is shown.
   - `getSpecialChars(language)` — returns the array of clickable characters
     (or `[]` when none are needed).
   - `hasSpecialChars(language)` — convenience boolean.

2. **`src/components/study/diacritic-bar.tsx`** (NEW)
   - `<DiacriticBar chars onInsert />` — horizontal scrollable row of buttons,
     each with the character + a tiny number label (1-9, 0) for the first 10.
   - `insertAtCursor(inputEl, ch, currentValue, onChange, refocusEl?)` —
     inserts `ch` at the cursor of a controlled input, restores the cursor
     just after the inserted char via `requestAnimationFrame` + `setSelectionRange`.
   - `handleDiacriticKey(e, chars, onInsert)` — for the parent input's
     `onKeyDown`. Returns true (and inserts) when a plain number key 0-9 is
     pressed and the diacritic bar has a matching char. Skips when a modifier
     (Ctrl/Cmd/Alt) is held so Cmd+1 etc. keep working.

3. **`src/components/study/study-view.tsx`** (REWRITTEN — `StudySession`
   component only)
   - **Cloze mode (CRITICAL FIX)**: the cloze sentence + inline input is now
     rendered AS THE CARD FRONT (replacing the word display). The target word
     is no longer shown on the front (was giving the answer away). The hint
     (source translation + context) appears above the sentence; the diacritic
     bar appears below the sentence. Below the card there is only a "Check"
     button (or "Skip" if the card has no cloze sentence). On submit, the card
     flips to the back face showing the word + result + all fields.
   - **Typing mode**: front shows the target word + reading/phonetic
     (target→source) or source word only (source→target). The
     `frontShowField` lookup now excludes the typing answer field, so a
     misconfigured blueprint can never leak the answer on the front. The
     diacritic bar is rendered below the input.
   - **Passive mode**: no functional change (the dead `clozePreview` /
     `contextLanguage === "cloze"` branch was removed since `contextLanguage`
     is `"target" | "source"`).
   - **Multiple choice mode**: no functional change.
   - **Latin typing**: when `latinTyping + romanisationField` are set on the
     deck, typing source→target uses the romanisation field value as the answer
     (already handled by `getAnswer`). The diacritic bar shows pinyin tone
     marks for `Chinese (Mandarin)`. Strict-accents grading (`ma` ≠ `māo` when
     on, `ma` = `māo` when off) was already implemented in `gradeAnswer` —
     verified it's wired through unchanged.
   - Number-key shortcuts for the diacritic bar are wired through both the
     typing input's `onKeyDown` and the cloze input's `onKeyDown`.
   - Card height is bumped to 380 for cloze mode (room for hint + sentence +
     diacritic bar) and stays at 300 for other modes.
   - Added `Latin` badge in the mode-badge row when latin typing is active.
   - `ShortcutsHelp` overlay now lists the `1-9 0 (in input)` shortcut for
     inserting diacritics.
   - `useCallback` hooks (`insertTyping`, `insertCloze`) are declared BEFORE
     the `if (!card) return null` early return to satisfy React's
     rules-of-hooks lint.

4. **`src/hooks/use-auth.tsx`** (CLEANUP)
   - Removed every `console.log` / `console.error` statement (~17 of them).
   - Behaviour is unchanged — just quieter.

5. **`src/components/app-shell.tsx`** (CLEANUP + sign-out fix)
   - Removed the `useEffect` that attached a native `click` listener to the
     sign-out button (was a workaround for a stale-closure issue).
   - Removed the `showToast` helper and the `handleSignOut` React onClick
     stub.
   - Sign-out button now uses a plain `onClick={signOut}` — `isNetlify` is
     reactive (re-checked by the `useEffect` in `use-auth.tsx` when the widget
     script loads), so the closure is no longer stale.
   - Removed the now-unused `useRef` and `useEffect` imports.

## Verification

- `bun run lint`: **0 errors, 1 pre-existing warning** (the warning is in
  `deck-form-dialog.tsx` and is unrelated to this task — it's the known
  React-Hook-Form `useForm().watch()` incompatibility with React Compiler).
- Dev server compiles cleanly (no compile errors in `dev.log`).
- Manual trace of the cloze flow:
  - Card front renders the cloze sentence + inline `<input>` between
    `clozeData.before` and `clozeData.after`, plus the hint above and the
    diacritic bar below. Word is NOT rendered on the front.
  - Pressing Enter in the input calls `submitCloze` → `reveal()` → card flips
    → back face shows word + result + all fields.
  - Pressing "Check · Enter" button calls `submitCloze` (same path).
- Manual trace of the diacritic bar in typing mode (French deck):
  - `answerLanguage = "French"`, `specialChars` = 13 French diacritics.
  - Clicking the `é` button inserts `é` at the cursor of the typing input.
  - Pressing `1` while the typing input is focused inserts `é` (first char).
  - With Ctrl/Cmd held, `1` is NOT intercepted (so Cmd+1 still works).

## Issues Encountered

- **`useCallback` after early return**: lint flagged `useCallback` being called
  conditionally (after the `if (!card) return null` early return). Fixed by
  moving the `insertTyping` and `insertCloze` callbacks BEFORE the early
  return (they don't depend on `card`).
- **Duplicate definitions**: after moving the callbacks up, I left the old
  definitions in place by mistake — removed them in a follow-up edit.
- **Stale `contextLanguage === "cloze"` check**: the existing code had dead
  code paths checking `props.contextLanguage === "cloze"`, but `ContextLanguage`
  is `"target" | "source"` — those branches never fired. Removed during the
  rewrite so the front face logic is now clean.

## No Other Agent Files Touched

This task created `agent-ctx/` for the first time (the directory didn't exist
yet). No other agents' work records were present to consult.
