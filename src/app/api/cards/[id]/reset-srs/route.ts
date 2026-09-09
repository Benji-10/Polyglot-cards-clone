import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapCard } from "@/lib/mappers";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/cards/[id]/reset-srs — reset the SRS state of a card to "new".
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const card = await db.card.findUnique({
    where: { id },
    include: { deck: { select: { userId: true } } },
  });
  if (!card || card.deck.userId !== user.id)
    return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const updated = await db.card.update({
    where: { id },
    data: {
      srsState: "new",
      stability: 0,
      difficulty: 5,
      repetitions: 0,
      interval: 0,
      seen: false,
      learningStep: 0,
      lastReviewedAt: null,
      dueAt: new Date(),
    },
  });
  return NextResponse.json(mapCard(updated));
}
