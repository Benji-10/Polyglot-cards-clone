import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { schedule, type SrsStateData } from "@/lib/srs";
import { mapCard } from "@/lib/mappers";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const reviewSchema = z.object({
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  timeSpentMs: z.number().optional().default(0),
});

// POST /api/cards/[id]/review
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const card = await db.card.findUnique({
    where: { id },
    include: { deck: { select: { userId: true } } },
  });
  if (!card || card.deck.userId !== user.id)
    return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  const { rating, timeSpentMs } = parsed.data;

  const prev: SrsStateData = {
    srsState: card.srsState as SrsStateData["srsState"],
    stability: card.stability,
    difficulty: card.difficulty,
    repetitions: card.repetitions,
    interval: card.interval,
    seen: card.seen,
    learningStep: card.learningStep,
    lastReviewedAt: card.lastReviewedAt,
    dueAt: card.dueAt,
  };

  const next = schedule(prev, rating, new Date());

  const [updated] = await db.$transaction([
    db.card.update({
      where: { id },
      data: {
        srsState: next.srsState,
        stability: next.stability,
        difficulty: next.difficulty,
        repetitions: next.repetitions,
        interval: next.interval,
        seen: next.seen,
        learningStep: next.learningStep,
        lastReviewedAt: next.lastReviewedAt,
        dueAt: next.dueAt,
      },
    }),
    db.reviewLog.create({
      data: {
        cardId: id,
        userId: user.id,
        rating,
        state: prev.srsState,
        elapsedDays: next.elapsedDays,
        scheduledDays: next.scheduledDays,
        timeSpentMs,
      },
    }),
  ]);

  return NextResponse.json(mapCard(updated));
}
