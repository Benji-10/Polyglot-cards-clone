import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { SrsState } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/decks/[id]/stats — per-deck statistics
export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const deck = await db.deck.findFirst({ where: { id, userId: user.id } });
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const cards = await db.card.findMany({
    where: { deckId: id },
    select: {
      srsState: true,
      interval: true,
      seen: true,
      dueAt: true,
      repetitions: true,
      suspended: true,
    },
  });

  const now = new Date();
  const stateMap: Record<SrsState, number> = {
    new: 0,
    learning: 0,
    review: 0,
    relearning: 0,
  };

  let totalInterval = 0;
  let matureCount = 0;
  let dueCount = 0;
  let seenCount = 0;
  let suspendedCount = 0;

  for (const c of cards) {
    stateMap[c.srsState as SrsState]++;
    totalInterval += c.interval;
    if (c.interval >= 21) matureCount++;
    if (c.srsState === "new" || c.dueAt.getTime() <= now.getTime()) dueCount++;
    if (c.seen) seenCount++;
    if (c.suspended) suspendedCount++;
  }

  // Get retention rate from review logs
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const logs = await db.reviewLog.findMany({
    where: {
      card: { deckId: id },
      reviewedAt: { gte: thirtyDaysAgo },
    },
    select: { rating: true },
  });

  const totalReviews = logs.length;
  const correctReviews = logs.filter((l) => l.rating >= 3).length;
  const retentionRate = totalReviews > 0 ? correctReviews / totalReviews : 0;

  return NextResponse.json({
    totalCards: cards.length,
    stateBreakdown: (Object.keys(stateMap) as SrsState[]).map((state) => ({
      state,
      count: stateMap[state],
    })),
    averageInterval:
      cards.length > 0 ? Math.round((totalInterval / cards.length) * 10) / 10 : 0,
    matureCount,
    dueCount,
    seenCount,
    suspendedCount,
    retentionRate: Math.round(retentionRate * 100) / 100,
    totalReviews,
    correctReviews,
  });
}
