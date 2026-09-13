import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapCard } from "@/lib/mappers";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedCard(req: NextRequest, id: string) {
  const user = await resolveServerUser(req.headers);
  const card = await db.card.findUnique({
    where: { id },
    include: { deck: { select: { userId: true } } },
  });
  if (!card || card.deck.userId !== user.id) return null;
  return card;
}

// GET /api/cards/[id]
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const card = await getOwnedCard(req, id);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  const { deck: _deck, ...data } = card;
  return NextResponse.json(mapCard(data));
}

// PATCH /api/cards/[id]
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const card = await getOwnedCard(req, id);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.word === "string") data.word = body.word;
  if (body.fields !== undefined) data.fields = JSON.stringify(body.fields || {});
  if (Array.isArray(body.tags)) data.tags = JSON.stringify(body.tags);
  const updated = await db.card.update({ where: { id }, data });
  return NextResponse.json(mapCard(updated));
}

// DELETE /api/cards/[id]
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const card = await getOwnedCard(req, id);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  await db.card.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
