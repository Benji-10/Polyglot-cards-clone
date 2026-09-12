import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapCard } from "@/lib/mappers";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/decks/[id]/study?mode=learn|freestyle&pool=all|seen|unseen&limit=&tag=
export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const deck = await db.deck.findFirst({ where: { id, userId: user.id } });
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "learn";
  const pool = url.searchParams.get("pool") || "all";
  const randomise = url.searchParams.get("randomise") === "true";
  const limit = Math.min(500, Number(url.searchParams.get("limit") || 50));
  const tag = url.searchParams.get("tag");

  let where: Record<string, unknown> = { deckId: id, suspended: false };
  if (mode === "learn") {
    where = {
      deckId: id,
      suspended: false,
      OR: [{ srsState: "new" }, { dueAt: { lte: new Date() } }],
    };
  } else {
    // freestyle — all cards in chosen pool
    if (pool === "seen") where = { deckId: id, suspended: false, seen: true };
    else if (pool === "unseen") where = { deckId: id, suspended: false, seen: false };
  }

  let cards = await db.card.findMany({ where, take: limit });

  // Filter by tag (tags stored as JSON array string)
  if (tag) {
    cards = cards.filter((c) => {
      try {
        const tags = JSON.parse(c.tags || "[]") as string[];
        return tags.includes(tag);
      } catch {
        return false;
      }
    });
  }
  if (randomise) {
    cards = cards
      .map((c) => ({ c, k: Math.random() }))
      .sort((a, b) => a.k - b.k)
      .map(({ c }) => c);
  } else {
    // New cards first, then by due date
    cards.sort((a, b) => {
      if (a.srsState === "new" && b.srsState !== "new") return -1;
      if (b.srsState === "new" && a.srsState !== "new") return 1;
      return a.dueAt.getTime() - b.dueAt.getTime();
    });
  }

  return NextResponse.json({
    cards: cards.slice(0, limit).map(mapCard),
    total: cards.length,
  });
}
