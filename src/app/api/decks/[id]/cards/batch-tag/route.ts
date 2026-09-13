import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/decks/[id]/cards/batch-tag — add or remove tags on multiple cards.
// Body: { cardIds: string[], tags: string[], mode: "add" | "remove" }
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const deck = await db.deck.findFirst({ where: { id, userId: user.id } });
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const cardIds: string[] = Array.isArray(body.cardIds) ? body.cardIds : [];
  const tags: string[] = Array.isArray(body.tags) ? body.tags : [];
  const mode: "add" | "remove" = body.mode === "remove" ? "remove" : "add";

  if (!cardIds.length || !tags.length)
    return NextResponse.json({ error: "cardIds and tags are required" }, { status: 400 });

  // Fetch all selected cards
  const cards = await db.card.findMany({
    where: { id: { in: cardIds }, deckId: id },
    select: { id: true, tags: true },
  });

  // Update each card's tags
  await Promise.all(
    cards.map(async (c) => {
      let currentTags: string[] = [];
      try {
        currentTags = JSON.parse(c.tags || "[]") as string[];
      } catch {
        currentTags = [];
      }

      let newTags: string[];
      if (mode === "add") {
        newTags = [...new Set([...currentTags, ...tags])];
      } else {
        newTags = currentTags.filter((t) => !tags.includes(t));
      }

      await db.card.update({
        where: { id: c.id },
        data: { tags: JSON.stringify(newTags) },
      });
    })
  );

  return NextResponse.json({ updated: cards.length });
}
