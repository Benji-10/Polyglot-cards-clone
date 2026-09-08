import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapDeckWithStats } from "@/lib/mappers";
import { DEFAULT_BLUEPRINT } from "@/lib/constants";
import { z } from "zod";

const createDeckSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  sourceLanguage: z.string().default("English"),
  targetLanguage: z.string().default("Japanese"),
  cardDirection: z.enum(["target", "cloze"]).default("target"),
  contextLanguage: z.enum(["target", "source"]).default("target"),
  strictAccents: z.boolean().default(true),
  strictMode: z.boolean().default(false),
  latinTyping: z.boolean().default(false),
  romanisationField: z.string().default(""),
});

// GET /api/decks — list user's decks with stats
export async function GET(req: NextRequest) {
  const user = await resolveServerUser(req.headers);
  const decks = await db.deck.findMany({
    where: { userId: user.id },
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
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(decks.map(mapDeckWithStats));
}

// POST /api/decks — create a new deck (with default blueprint)
export async function POST(req: NextRequest) {
  const user = await resolveServerUser(req.headers);
  const body = await req.json().catch(() => ({}));
  const parsed = createDeckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid deck data" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const deck = await db.deck.create({
    data: {
      userId: user.id,
      name: d.name,
      description: d.description,
      sourceLanguage: d.sourceLanguage,
      targetLanguage: d.targetLanguage,
      cardDirection: d.cardDirection,
      contextLanguage: d.contextLanguage,
      strictAccents: d.strictAccents,
      strictMode: d.strictMode,
      fields: {
        create: DEFAULT_BLUEPRINT.map((f, i) => ({
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
    include: {
      _count: { select: { cards: true } },
      cards: true,
      fields: { orderBy: { position: "asc" } },
    },
  });
  return NextResponse.json({
    ...mapDeckWithStats(deck),
    fields: deck.fields,
  });
}
