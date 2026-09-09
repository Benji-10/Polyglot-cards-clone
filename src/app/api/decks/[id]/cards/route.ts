import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapCard } from "@/lib/mappers";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/decks/[id]/cards?state=&search=&sort=&limit=&offset=
export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const deck = await db.deck.findFirst({ where: { id, userId: user.id } });
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const url = new URL(req.url);
  const state = url.searchParams.get("state"); // new|learning|review|relearning|due
  const search = url.searchParams.get("search")?.toLowerCase();
  const sort = url.searchParams.get("sort") || "createdAt";
  const dir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
  const limit = Math.min(500, Number(url.searchParams.get("limit") || 500));
  const offset = Number(url.searchParams.get("offset") || 0);

  const where: Record<string, unknown> = { deckId: id };
  if (state && state !== "due") where.srsState = state;
  if (state === "due") where.dueAt = { lte: new Date() };

  let cards = await db.card.findMany({
    where,
    orderBy: sort === "due" ? { dueAt: dir } : sort === "word" ? { word: dir } : { createdAt: dir },
    take: limit + offset,
  });

  if (search) {
    cards = cards.filter((c) => {
      if (c.word.toLowerCase().includes(search)) return true;
      try {
        const fields = JSON.parse(c.fields) as Record<string, unknown>;
        return JSON.stringify(fields).toLowerCase().includes(search);
      } catch {
        return false;
      }
    });
  }

  return NextResponse.json({
    cards: cards.slice(offset, offset + limit).map(mapCard),
    total: cards.length,
  });
}

// POST /api/decks/[id]/cards — create a card (or batch via {cards:[]})
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const deck = await db.deck.findFirst({ where: { id, userId: user.id } });
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  // Batch creation
  if (Array.isArray(body.cards)) {
    const rows = body.cards
      .filter((c: { word?: string }) => c && c.word)
      .map((c: { word: string; fields?: unknown; tags?: string[] }) => ({
        deckId: id,
        word: c.word,
        fields: JSON.stringify(c.fields || {}),
        tags: JSON.stringify(c.tags || []),
      }));
    if (!rows.length)
      return NextResponse.json({ created: 0 }, { status: 200 });
    await db.card.createMany({ data: rows });
    return NextResponse.json({ created: rows.length });
  }

  if (!body.word || typeof body.word !== "string")
    return NextResponse.json({ error: "word is required" }, { status: 400 });

  const card = await db.card.create({
    data: {
      deckId: id,
      word: body.word,
      fields: JSON.stringify(body.fields || {}),
      tags: JSON.stringify(body.tags || []),
    },
  });
  return NextResponse.json(mapCard(card));
}
