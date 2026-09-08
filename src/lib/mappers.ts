// Mapping helpers between Prisma rows and our typed API shapes.

import type { Deck, Card, BlueprintField, ReviewLog } from "@prisma/client";
import type {
  DeckData,
  DeckStats,
  DeckWithStats,
  CardData,
  BlueprintFieldDef,
  ReviewLogData,
  CardFields,
  Phonetics,
} from "./types";
import { isDue } from "./srs";

export function mapDeck(deck: Deck & { _count?: { cards: number } }): DeckData {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    sourceLanguage: deck.sourceLanguage,
    targetLanguage: deck.targetLanguage,
    cardDirection: deck.cardDirection as DeckData["cardDirection"],
    contextLanguage: deck.contextLanguage as DeckData["contextLanguage"],
    strictAccents: deck.strictAccents,
    strictMode: deck.strictMode,
    latinTyping: deck.latinTyping,
    romanisationField: deck.romanisationField,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
  };
}

export function computeDeckStats(
  cards: Pick<
    Card,
    "srsState" | "interval" | "seen" | "dueAt" | "repetitions"
  >[]
): DeckStats {
  const now = new Date();
  const stats: DeckStats = {
    total: cards.length,
    new: 0,
    learning: 0,
    review: 0,
    relearning: 0,
    due: 0,
    seen: 0,
    mature: 0,
  };
  for (const c of cards) {
    const state = c.srsState as DeckStats["new"] extends string
      ? (typeof c.srsState)
      : never;
    switch (state) {
      case "new":
        stats.new++;
        break;
      case "learning":
        stats.learning++;
        break;
      case "review":
        stats.review++;
        break;
      case "relearning":
        stats.relearning++;
        break;
    }
    if (c.seen) stats.seen++;
    if (c.interval >= 21) stats.mature++;
    if (isDue(c.dueAt, now)) stats.due++;
  }
  // Cards that are new and have never been seen also count as due.
  return stats;
}

export function mapDeckWithStats(
  deck: Deck & { _count: { cards: number }; cards: Card[] }
): DeckWithStats {
  return {
    ...mapDeck(deck),
    _count: { cards: deck._count.cards },
    stats: computeDeckStats(deck.cards),
  };
}

export function mapCard(card: Card): CardData {
  return {
    id: card.id,
    deckId: card.deckId,
    word: card.word,
    fields: JSON.parse(card.fields) as CardFields,
    tags: JSON.parse(card.tags || "[]") as string[],
    srsState: card.srsState as CardData["srsState"],
    stability: card.stability,
    difficulty: card.difficulty,
    repetitions: card.repetitions,
    interval: card.interval,
    seen: card.seen,
    learningStep: card.learningStep,
    suspended: card.suspended,
    lastReviewedAt: card.lastReviewedAt ? card.lastReviewedAt.toISOString() : null,
    dueAt: card.dueAt.toISOString(),
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

export function mapBlueprintField(
  field: BlueprintField
): BlueprintFieldDef {
  return {
    id: field.id,
    key: field.key,
    label: field.label,
    description: field.description,
    fieldType: field.fieldType as BlueprintFieldDef["fieldType"],
    showOnFront: field.showOnFront,
    phonetics: JSON.parse(field.phonetics) as Phonetics,
    position: field.position,
  };
}

export function mapReviewLog(log: ReviewLog): ReviewLogData {
  return {
    id: log.id,
    cardId: log.cardId,
    rating: log.rating as ReviewLogData["rating"],
    state: log.state as ReviewLogData["state"],
    elapsedDays: log.elapsedDays,
    scheduledDays: log.scheduledDays,
    reviewedAt: log.reviewedAt.toISOString(),
    timeSpentMs: log.timeSpentMs,
  };
}
