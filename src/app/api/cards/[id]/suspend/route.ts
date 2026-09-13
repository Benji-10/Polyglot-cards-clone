import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapCard } from "@/lib/mappers";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/cards/[id]/suspend — toggle the suspended state of a card.
// Body: { suspended: boolean }
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const card = await db.card.findUnique({
    where: { id },
    include: { deck: { select: { userId: true } } },
  });
  if (!card || card.deck.userId !== user.id)
    return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const suspended =
    typeof body.suspended === "boolean" ? body.suspended : !card.suspended;

  const updated = await db.card.update({
    where: { id },
    data: { suspended },
  });
  return NextResponse.json(mapCard(updated));
}
