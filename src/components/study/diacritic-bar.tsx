"use client";

import { useCallback } from "react";

/**
 * Insert a character at the cursor position of a controlled input.
 *
 * Updates the value via `onChange`, then restores the cursor just after the
 * inserted character on the next animation frame (after React re-renders
 * the input with its new value).
 */
export function insertAtCursor(
  inputEl: HTMLInputElement | null,
  ch: string,
  currentValue: string,
  onChange: (next: string) => void,
  refocusEl?: HTMLInputElement | null
): void {
  if (!inputEl) {
    // Fallback — append to end if the ref isn't ready.
    onChange(currentValue + ch);
    return;
  }
  const start = inputEl.selectionStart ?? currentValue.length;
  const end = inputEl.selectionEnd ?? currentValue.length;
  const next = currentValue.slice(0, start) + ch + currentValue.slice(end);
  onChange(next);
  const pos = start + ch.length;
  const target = refocusEl ?? inputEl;
  requestAnimationFrame(() => {
    if (!target) return;
    target.focus();
    try {
      target.setSelectionRange(pos, pos);
    } catch {
      /* Safari throws on number inputs — ignore. */
    }
  });
}

/**
 * DiacriticBar — clickable buttons for special characters (é, ü, ñ, pinyin
 * tones, etc.) that the answer language requires.
 *
 * - Renders a horizontal scrollable row of buttons, each showing the character
 *   plus a tiny number label (1-9, 0) for the first 10 characters.
 * - Clicking a button calls `onInsert(ch)` — the parent is responsible for
 *   actually inserting the character at the cursor of the relevant input.
 * - The number-key shortcut is wired via the `handleDiacriticKey` helper in
 *   the parent input's onKeyDown.
 */
export function DiacriticBar({
  chars,
  onInsert,
}: {
  chars: string[];
  onInsert: (ch: string) => void;
}) {
  const handleClick = useCallback(
    (ch: string) => {
      onInsert(ch);
    },
    [onInsert]
  );

  if (!chars.length) return null;

  return (
    <div className="mt-2 flex items-center gap-1 overflow-x-auto scrollbar-thin pb-1">
      {chars.map((ch, i) => {
        const num = i < 9 ? String(i + 1) : i === 9 ? "0" : null;
        return (
          <button
            key={`${ch}-${i}`}
            type="button"
            onClick={() => handleClick(ch)}
            className="shrink-0 min-w-[2rem] h-9 px-2 rounded-md bg-elevated border surface-border hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-glow)] hover:text-[var(--accent-primary)] transition-colors text-sm font-medium relative flex items-center justify-center"
            aria-label={`Insert ${ch}`}
            title={num ? `${ch}  (${num})` : `Insert ${ch}`}
          >
            <span>{ch}</span>
            {num && (
              <span className="absolute top-0 right-0.5 text-[0.6rem] text-muted leading-none pt-0.5">
                {num}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Wire this into the parent input's onKeyDown to allow number-key shortcuts.
 * Returns true if the key was handled (so the parent can preventDefault).
 *
 * Only triggers when no modifier (Ctrl/Cmd/Alt) is held, so shortcuts like
 * Cmd+1 keep working.
 */
export function handleDiacriticKey(
  e: React.KeyboardEvent<HTMLInputElement>,
  chars: string[],
  onInsert: (ch: string) => void
): boolean {
  if (!chars.length) return false;
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (e.key < "0" || e.key > "9") return false;
  const idx = e.key === "0" ? 9 : Number(e.key) - 1;
  const ch = chars[idx];
  if (!ch) return false;
  onInsert(ch);
  return true;
}
