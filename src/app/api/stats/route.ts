import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { OverviewStats, SrsState } from "@/lib/types";

// GET /api/stats — aggregate overview stats for the current user
export async function GET(req: NextRequest) {
  const user = await resolveServerUser(req.headers);

  const decks = await db.deck.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      cards: {
        select: {
          srsState: true,
          interval: true,
          seen: true,
          dueAt: true,
          repetitions: true,
        },
      },
    },
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let totalCards = 0;
  let dueToday = 0;
  let newCards = 0;
  let learningCards = 0;
  let reviewCards = 0;
  const stateMap: Record<SrsState, number> = {
    new: 0,
    learning: 0,
    review: 0,
    relearning: 0,
  };

  for (const deck of decks) {
    for (const c of deck.cards) {
      totalCards++;
      stateMap[c.srsState as SrsState]++;
      if (c.srsState === "new") newCards++;
      if (c.srsState === "learning" || c.srsState === "relearning") learningCards++;
      if (c.srsState === "review") reviewCards++;
      if (c.srsState === "new" || c.dueAt.getTime() <= now.getTime()) dueToday++;
    }
  }

  // Reviews in the last 30 days (for chart + retention + streak)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const logs = await db.reviewLog.findMany({
    where: { userId: user.id, reviewedAt: { gte: thirtyDaysAgo } },
    select: { reviewedAt: true, rating: true },
    orderBy: { reviewedAt: "asc" },
  });

  // Build per-day buckets
  const dayBuckets: Record<string, { count: number; correct: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayBuckets[key] = { count: 0, correct: 0 };
  }
  let reviewedToday = 0;
  let totalReviews = 0;
  let totalCorrect = 0;
  for (const log of logs) {
    const key = log.reviewedAt.toISOString().slice(0, 10);
    if (dayBuckets[key]) {
      dayBuckets[key].count++;
      if (log.rating >= 3) dayBuckets[key].correct++;
    }
    totalReviews++;
    if (log.rating >= 3) totalCorrect++;
    if (log.reviewedAt.getTime() >= startOfToday.getTime()) reviewedToday++;
  }

  const reviewsLast30Days = Object.entries(dayBuckets).map(([date, v]) => ({
    date,
    count: v.count,
    correct: v.correct,
  }));

  // Streak: count consecutive days (ending today or yesterday) with >=1 review
  const dayKeys = Object.keys(dayBuckets).sort().reverse();
  let streak = 0;
  let streakIdx = 0;
  // Allow today to be empty (streak continues if yesterday has activity)
  if (dayKeys.length && dayBuckets[dayKeys[0]].count === 0) streakIdx = 1;
  for (let i = streakIdx; i < dayKeys.length; i++) {
    if (dayBuckets[dayKeys[i]].count > 0) streak++;
    else break;
  }

  const retentionRate = totalReviews > 0 ? totalCorrect / totalReviews : 0;

  const stateBreakdown = (Object.keys(stateMap) as SrsState[]).map((state) => ({
    state,
    count: stateMap[state],
  }));

  // Review forecast for the next 7 days
  const forecast: { date: string; count: number; isNew: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    let count = 0;
    for (const deck of decks) {
      for (const c of deck.cards) {
        if (c.srsState === "new" && i === 0) {
          count++;
        } else if (c.srsState !== "new" && c.dueAt >= dayStart && c.dueAt < dayEnd) {
          count++;
        }
      }
    }
    forecast.push({
      date: dayStart.toISOString().slice(0, 10),
      count,
      isNew: i === 0,
    });
  }

  const stats: OverviewStats = {
    totalDecks: decks.length,
    totalCards,
    dueToday,
    newCards,
    learningCards,
    reviewCards,
    reviewedToday,
    streak,
    retentionRate,
    reviewsLast30Days,
    stateBreakdown,
    forecast,
  };
  return NextResponse.json(stats);
}
