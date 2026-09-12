import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapDeckWithStats } from "@/lib/mappers";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/decks/[id]/duplicate — clone a deck (its settings, blueprint, and
// all cards) into a new deck. The new deck's cards start fresh (SRS reset).
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const newName =
    (body.name as string) || `${body.originalName || "Deck"} (copy)`;

  const source = await db.deck.findFirst({
    where: { id, userId: user.id },
    include: {
      fields: { orderBy: { position: "asc" } },
      cards: true,
    },
  });
  if (!source)
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  // Create the new deck.
  const clone = await db.deck.create({
    data: {
      userId: user.id,
      name: newName,
      description: source.description,
      sourceLanguage: source.sourceLanguage,
      targetLanguage: source.targetLanguage,
      cardDirection: source.cardDirection,
      contextLanguage: source.contextLanguage,
      strictAccents: source.strictAccents,
      strictMode: source.strictMode,
      fields: {
        create: source.fields.map((f, i) => ({
          key: f.key,
          label: f.label,
          description: f.description,
          fieldType: f.fieldType,
          showOnFront: f.showOnFront,
          phonetics: f.phonetics,
          position: i,
        })),
      },
    },
    include: {
      _count: { select: { cards: true } },
      cards: true,
    },
  });

  // Copy all cards (with fresh SRS state — new, no reviews).
  if (source.cards.length > 0) {
    await db.card.createMany({
      data: source.cards.map((c) => ({
        deckId: clone.id,
        word: c.word,
        fields: c.fields,
      })),
    });
  }

  return NextResponse.json({
    ...mapDeckWithStats({
      ...clone,
      _count: { cards: source.cards.length },
    }),
  });
}
