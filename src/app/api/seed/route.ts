import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildSampleDecks } from "@/lib/seed";

// POST /api/seed — populate the current user's library with sample decks & cards
export async function POST(req: NextRequest) {
  const user = await resolveServerUser(req.headers);
  const sample = buildSampleDecks(user.id);

  for (const deckData of sample) {
    const deck = await db.deck.create({
      data: {
        userId: user.id,
        name: deckData.name,
        description: deckData.description,
        sourceLanguage: deckData.sourceLanguage,
        targetLanguage: deckData.targetLanguage,
        cardDirection: deckData.cardDirection,
        contextLanguage: deckData.contextLanguage,
        strictAccents: deckData.strictAccents,
        strictMode: deckData.strictMode,
        fields: {
          create: deckData.fields.map((f, i) => ({
            key: f.key,
            label: f.label,
            description: f.description,
            fieldType: f.fieldType,
            showOnFront: f.showOnFront,
            phonetics: JSON.stringify(f.phonetics),
            position: i,
          })),
        },
      },
    });
    if (deckData.cards.length) {
      await db.card.createMany({
        data: deckData.cards.map((c) => ({
          deckId: deck.id,
          word: c.word,
          fields: JSON.stringify(c.fields || {}),
        })),
      });
    }
  }

  return NextResponse.json({ seeded: sample.length, decks: sample.map((s) => s.name) });
}
