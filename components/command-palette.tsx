"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Layers, BookOpen, ArrowRight } from "lucide-react";
import { useDecks } from "@/hooks/use-data";
import { useUi } from "@/store/ui-store";
import { api } from "@/lib/api-client";
import type { DeckWithStats, CardData } from "@/lib/types";
import { getLanguageFlag } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Global command palette — press Cmd/Ctrl+K anywhere to open. Search across
// decks and cards, jump to any result instantly.
export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, setView } = useUi();
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<CardData[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const { data: decks } = useDecks();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const open = paletteOpen;
  const setOpen = setPaletteOpen;

  // Toggle with Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      } else if (e.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletteOpen, setPaletteOpen]);

  // Focus input when opened (DOM-only side effect, no setState).
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Search cards across all decks (debounced). Only fires when query > 2 chars.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let active = true;
    const t = setTimeout(async () => {
      setLoadingCards(true);
      const deckList = decks || [];
      const results = await Promise.all(
        deckList.map((d) =>
          api
            .get<{ cards: CardData[] }>(
              `/api/decks/${d.id}/cards?search=${encodeURIComponent(q)}&limit=10`
            )
            .then((r) => r.cards.map((c) => ({ ...c, deckId: d.id })))
            .catch(() => [])
        )
      );
      if (active) {
        setCards(results.flat().slice(0, 10));
        setLoadingCards(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, decks]);

  // Clear cards + reset selection when the palette closes or query clears.
  // Done via derived state — cards are only shown when query.length >= 2.
  const visibleCards = query.trim().length >= 2 ? cards : [];

  const matchedDecks = useMemo(() => {
    if (!query.trim()) return decks || [];
    const q = query.toLowerCase();
    return (decks || []).filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.targetLanguage.toLowerCase().includes(q) ||
        d.sourceLanguage.toLowerCase().includes(q)
    );
  }, [query, decks]);

  const allResults = [
    ...matchedDecks.map((d) => ({ type: "deck" as const, deck: d })),
    ...visibleCards.map((c) => ({ type: "card" as const, card: c })),
  ];

  const clampedIndex = Math.min(selectedIndex, Math.max(allResults.length - 1, 0));

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = allResults[clampedIndex];
      if (r) selectResult(r);
    }
  };

  const selectResult = (r: { type: "deck"; deck: DeckWithStats } | { type: "card"; card: CardData }) => {
    if (r.type === "deck") {
      setView({ name: "deck", deckId: r.deck.id });
    } else {
      setView({ name: "deck", deckId: r.card.deckId });
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="pc-card-elevated w-full max-w-xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyNav}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b subtle-border">
          <Search className="size-4 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search decks and cards..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted"
          />
          <kbd className="font-mono text-[0.65rem] px-1.5 py-0.5 rounded bg-elevated border surface-border text-muted">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin">
          {allResults.length === 0 && !loadingCards && (
            <div className="px-4 py-8 text-center text-sm text-muted">
              {query.trim()
                ? "No results found."
                : "Type to search across all decks and cards."}
            </div>
          )}

          {matchedDecks.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-1 section-title">Decks</div>
              {matchedDecks.map((d, i) => {
                const idx = i;
                return (
                  <button
                    key={d.id}
                    onClick={() => selectResult({ type: "deck", deck: d })}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                      clampedIndex === idx
                        ? "bg-[var(--accent-glow)]"
                        : "hover:bg-elevated"
                    )}
                  >
                    <Layers className="size-4 text-[var(--accent-primary)]" />
                    <span className="text-lg">{getLanguageFlag(d.targetLanguage)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.name}</div>
                      <div className="text-xs text-muted">
                        {d.sourceLanguage} → {d.targetLanguage} · {d._count.cards} cards
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-muted" />
                  </button>
                );
              })}
            </div>
          )}

          {(cards.length > 0 || loadingCards) && (
            <div className="py-2 border-t subtle-border">
              <div className="px-4 py-1 section-title">
                {loadingCards ? "Searching cards..." : "Cards"}
              </div>
              {visibleCards.map((c, i) => {
                const idx = matchedDecks.length + i;
                return (
                  <button
                    key={c.id}
                    onClick={() => selectResult({ type: "card", card: c })}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                      clampedIndex === idx
                        ? "bg-[var(--accent-glow)]"
                        : "hover:bg-elevated"
                    )}
                  >
                    <BookOpen className="size-4 text-[var(--accent-secondary)]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.word}</div>
                      <div className="text-xs text-muted truncate">
                        {c.srsState} · in this deck
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-muted" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t subtle-border flex items-center justify-between text-[0.7rem] text-muted">
          <span>
            <kbd className="font-mono px-1 py-0.5 rounded bg-elevated border surface-border">↑↓</kbd>{" "}
            navigate ·{" "}
            <kbd className="font-mono px-1 py-0.5 rounded bg-elevated border surface-border">↵</kbd>{" "}
            open
          </span>
          <span>Global search</span>
        </div>
      </div>
    </div>
  );
}
