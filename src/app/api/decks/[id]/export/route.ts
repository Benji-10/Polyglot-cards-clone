import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_BLUEPRINT } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/decks/[id]/export?format=csv|json
export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const deck = await db.deck.findFirst({
    where: { id, userId: user.id },
    include: {
      fields: { orderBy: { position: "asc" } },
      cards: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "csv";

  const fieldKeys = deck.fields.map((f) => f.key);

  if (format === "json") {
    return NextResponse.json({
      deck: {
        name: deck.name,
        description: deck.description,
        sourceLanguage: deck.sourceLanguage,
        targetLanguage: deck.targetLanguage,
        cardDirection: deck.cardDirection,
        contextLanguage: deck.contextLanguage,
        strictAccents: deck.strictAccents,
        strictMode: deck.strictMode,
      },
      blueprint: deck.fields.map((f) => ({
        key: f.key,
        label: f.label,
        description: f.description,
        fieldType: f.fieldType,
        showOnFront: f.showOnFront,
        phonetics: JSON.parse(f.phonetics),
        position: f.position,
      })),
      cards: deck.cards.map((c) => ({
        word: c.word,
        fields: JSON.parse(c.fields),
        srsState: c.srsState,
        stability: c.stability,
        difficulty: c.difficulty,
        repetitions: c.repetitions,
        interval: c.interval,
        seen: c.seen,
        lastReviewedAt: c.lastReviewedAt,
        dueAt: c.dueAt,
      })),
    });
  }

  // CSV: header row + blueprint metadata row + card rows
  const headers = [
    "word",
    ...fieldKeys,
    "srs_state",
    "last_reviewed",
    "interval",
    "stability",
    "difficulty",
    "repetitions",
  ];

  const esc = (v: unknown): string => {
    const s = typeof v === "string" ? v : v == null ? "" : JSON.stringify(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines: string[] = [];
  lines.push(headers.map(esc).join(","));
  // Blueprint metadata row
  const metaRow = [
    "word",
    ...deck.fields.map((f) =>
      esc({
        label: f.label,
        description: f.description,
        fieldType: f.fieldType,
        showOnFront: f.showOnFront,
        phonetics: JSON.parse(f.phonetics),
      })
    ),
    "",
    "",
    "",
    "",
    "",
    "",
  ];
  lines.push(metaRow.join(","));

  for (const c of deck.cards) {
    const fields = JSON.parse(c.fields) as Record<string, unknown>;
    const row = [
      esc(c.word),
      ...fieldKeys.map((k) => esc(fields[k] ?? "")),
      esc(c.srsState),
      esc(c.lastReviewedAt ? c.lastReviewedAt.toISOString() : ""),
      esc(c.interval),
      esc(c.stability),
      esc(c.difficulty),
      esc(c.repetitions),
    ];
    lines.push(row.join(","));
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${deck.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

// POST /api/decks/[id]/export with { cards: [...] } — bulk add cards (used by import)
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const deck = await db.deck.findFirst({ where: { id, userId: user.id } });
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const cards = Array.isArray(body.cards) ? body.cards : [];
  const rows = cards
    .filter((c: { word?: string }) => c && c.word)
    .map((c: { word: string; fields?: unknown }) => ({
      deckId: id,
      word: String(c.word),
      fields: JSON.stringify(c.fields || {}),
    }));

  if (rows.length) {
    await db.card.createMany({ data: rows });
    const fieldCount = await db.blueprintField.count({ where: { deckId: id } });
    if (fieldCount === 0) {
      await db.blueprintField.createMany({
        data: DEFAULT_BLUEPRINT.map((f, i) => ({
          deckId: id,
          key: f.key,
          label: f.label,
          description: f.description,
          fieldType: f.fieldType,
          showOnFront: f.showOnFront,
          phonetics: JSON.stringify(f.phonetics),
          position: i,
        })),
      });
    }
  }
  return NextResponse.json({ imported: rows.length });
}
