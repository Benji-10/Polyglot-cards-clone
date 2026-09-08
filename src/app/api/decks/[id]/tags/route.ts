import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/decks/[id]/tags — get all unique tags used in this deck
export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const deck = await db.deck.findFirst({ where: { id, userId: user.id } });
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const cards = await db.card.findMany({
    where: { deckId: id },
    select: { tags: true },
  });

  const tagSet = new Set<string>();
  for (const c of cards) {
    try {
      const tags = JSON.parse(c.tags || "[]") as string[];
      tags.forEach((t) => t && tagSet.add(t));
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ tags: Array.from(tagSet).sort() });
}
