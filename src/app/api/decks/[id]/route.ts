import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapDeckWithStats } from "@/lib/mappers";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/decks/[id]
export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const deck = await db.deck.findFirst({
    where: { id, userId: user.id },
    include: {
      _count: { select: { cards: true } },
      cards: {
        select: {
          srsState: true,
          interval: true,
          seen: true,
          dueAt: true,
          repetitions: true,
        },
      },
      fields: { orderBy: { position: "asc" } },
    },
  });
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  return NextResponse.json({ ...mapDeckWithStats(deck), fields: deck.fields });
}

// PATCH /api/decks/[id]
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const existing = await db.deck.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  const allowed = [
    "name",
    "description",
    "sourceLanguage",
    "targetLanguage",
    "cardDirection",
    "contextLanguage",
    "strictAccents",
    "strictMode",
    "latinTyping",
    "romanisationField",
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) data[k] = body[k];
  }
  const deck = await db.deck.update({
    where: { id },
    data,
    include: {
      _count: { select: { cards: true } },
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
  return NextResponse.json(mapDeckWithStats(deck));
}

// DELETE /api/decks/[id]
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const existing = await db.deck.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  await db.deck.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
