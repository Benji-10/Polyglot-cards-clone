"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  DeckWithStats,
  DeckData,
  BlueprintFieldDef,
  CardData,
  OverviewStats,
  AppSettings,
} from "@/lib/types";

const KEYS = {
  decks: ["decks"] as const,
  deck: (id: string) => ["deck", id] as const,
  blueprint: (id: string) => ["blueprint", id] as const,
  cards: (id: string, params?: Record<string, string>) =>
    ["cards", id, params] as const,
  study: (id: string, params?: Record<string, string>) =>
    ["study", id, params] as const,
  stats: ["stats"] as const,
  settings: ["settings"] as const,
};

// ---- Decks ----
export function useDecks() {
  return useQuery({
    queryKey: KEYS.decks,
    queryFn: () => api.get<DeckWithStats[]>("/api/decks"),
  });
}

export function useDeck(id: string | null) {
  return useQuery({
    queryKey: id ? KEYS.deck(id) : ["deck", "none"],
    queryFn: () => api.get<{ id: string } & DeckData & { fields: BlueprintFieldDef[] }>(`/api/decks/${id}`),
    enabled: !!id,
  });
}

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<DeckData> & { name: string }) =>
      api.post<DeckWithStats>("/api/decks", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.decks }),
  });
}

export function useUpdateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<DeckData>) =>
      api.patch<DeckWithStats>(`/api/decks/${id}`, data),
    onSuccess: (deck) => {
      qc.invalidateQueries({ queryKey: KEYS.decks });
      qc.invalidateQueries({ queryKey: KEYS.deck(deck.id) });
    },
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/decks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.decks });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

export function useDuplicateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      api.post<DeckWithStats>(`/api/decks/${id}/duplicate`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.decks });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

// ---- Blueprint ----
export function useBlueprint(deckId: string | null) {
  return useQuery({
    queryKey: deckId ? KEYS.blueprint(deckId) : ["blueprint", "none"],
    queryFn: () => api.get<BlueprintFieldDef[]>(`/api/decks/${deckId}/blueprint`),
    enabled: !!deckId,
  });
}

export function useDeckTags(deckId: string | null) {
  return useQuery({
    queryKey: deckId ? ["tags", deckId] : ["tags", "none"],
    queryFn: () => api.get<{ tags: string[] }>(`/api/decks/${deckId}/tags`),
    enabled: !!deckId,
  });
}

export interface DeckStatsData {
  totalCards: number;
  stateBreakdown: { state: string; count: number }[];
  averageInterval: number;
  matureCount: number;
  dueCount: number;
  seenCount: number;
  suspendedCount: number;
  retentionRate: number;
  totalReviews: number;
  correctReviews: number;
}

export function useDeckStats(deckId: string | null) {
  return useQuery({
    queryKey: deckId ? ["deckStats", deckId] : ["deckStats", "none"],
    queryFn: () => api.get<DeckStatsData>(`/api/decks/${deckId}/stats`),
    enabled: !!deckId,
  });
}

export function useSaveBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deckId, fields }: { deckId: string; fields: BlueprintFieldDef[] }) =>
      api.put<BlueprintFieldDef[]>(`/api/decks/${deckId}/blueprint`, { fields }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.blueprint(vars.deckId) });
      qc.invalidateQueries({ queryKey: KEYS.deck(vars.deckId) });
    },
  });
}

// ---- Cards ----
export function useCards(
  deckId: string | null,
  params?: Record<string, string>
) {
  return useQuery({
    queryKey: deckId ? KEYS.cards(deckId, params) : ["cards", "none"],
    queryFn: () => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return api.get<{ cards: CardData[]; total: number }>(
        `/api/decks/${deckId}/cards${qs}`
      );
    },
    enabled: !!deckId,
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deckId,
      word,
      fields,
      tags,
    }: {
      deckId: string;
      word: string;
      fields: Record<string, unknown>;
      tags?: string[];
    }) =>
      api.post<CardData>(`/api/decks/${deckId}/cards`, { word, fields, tags }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.cards(vars.deckId) });
      qc.invalidateQueries({ queryKey: KEYS.deck(vars.deckId) });
      qc.invalidateQueries({ queryKey: KEYS.decks });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

export function useUpdateCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      word,
      fields,
      tags,
    }: {
      id: string;
      word?: string;
      fields?: Record<string, unknown>;
      tags?: string[];
    }) => api.patch<CardData>(`/api/cards/${id}`, { word, fields, tags }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cards(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.deck(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.decks });
    },
  });
}

export function useDeleteCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/cards/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cards(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.deck(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.decks });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

export function useBatchTagCards(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      cardIds,
      tags,
      mode,
    }: {
      cardIds: string[];
      tags: string[];
      mode: "add" | "remove";
    }) =>
      api.post<{ updated: number }>(`/api/decks/${deckId}/cards/batch-tag`, {
        cardIds,
        tags,
        mode,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cards(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.deck(deckId) });
      qc.invalidateQueries({ queryKey: ["tags", deckId] });
    },
  });
}

export function useResetCardSrs(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<CardData>(`/api/cards/${id}/reset-srs`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cards(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.deck(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.decks });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

export function useEnhanceCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields?: string[] }) =>
      api.post<CardData>(`/api/cards/${id}/enhance`, { fields }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cards(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.deck(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.decks });
    },
  });
}

export function useToggleSuspendCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended?: boolean }) =>
      api.post<CardData>(`/api/cards/${id}/suspend`, { suspended }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cards(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.deck(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.decks });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

// ---- Study ----
export function useStudyCards(
  deckId: string | null,
  params: { mode: string; pool?: string; randomise?: boolean; limit?: number; tag?: string | null }
) {
  return useQuery({
    queryKey: deckId
      ? KEYS.study(deckId, params as Record<string, string>)
      : ["study", "none"],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set("mode", params.mode);
      if (params.pool) sp.set("pool", params.pool);
      if (params.randomise) sp.set("randomise", "true");
      if (params.limit) sp.set("limit", String(params.limit));
      if (params.tag) sp.set("tag", params.tag);
      return api.get<{ cards: CardData[]; total: number }>(
        `/api/decks/${deckId}/study?${sp.toString()}`
      );
    },
    enabled: !!deckId,
  });
}

export function useReviewCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      cardId,
      rating,
      timeSpentMs,
    }: {
      cardId: string;
      rating: 1 | 2 | 3 | 4;
      timeSpentMs?: number;
    }) =>
      api.post<CardData>(`/api/cards/${cardId}/review`, {
        rating,
        timeSpentMs,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cards(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.deck(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.decks });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

// ---- Stats ----
export function useStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn: () => api.get<OverviewStats>("/api/stats"),
  });
}

// ---- Settings ----
export function useCloudSettings() {
  return useQuery({
    queryKey: KEYS.settings,
    queryFn: () => api.get<AppSettings>("/api/settings"),
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: AppSettings) => api.put("/api/settings", settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.settings }),
  });
}

// ---- Seed ----
export function useSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ seeded: number }>("/api/seed"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.decks });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

// ---- AI Generation ----
export function useGenerateCards(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (words: string[]) =>
      api.post<{ cards: { word: string; fields: Record<string, unknown> }[] }>(
        `/api/decks/${deckId}/generate`,
        { words }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cards(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.deck(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.decks });
    },
  });
}

// ---- Batch create cards (from AI generation or import) ----
export function useBatchCreateCards(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      cards: { word: string; fields: Record<string, unknown> }[]
    ) => api.post<{ created: number }>(`/api/decks/${deckId}/cards`, { cards }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cards(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.deck(deckId) });
      qc.invalidateQueries({ queryKey: KEYS.decks });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}
