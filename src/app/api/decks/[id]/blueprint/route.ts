import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapBlueprintField } from "@/lib/mappers";
import type { BlueprintFieldDef } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/decks/[id]/blueprint
export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const deck = await db.deck.findFirst({ where: { id, userId: user.id } });
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  const fields = await db.blueprintField.findMany({
    where: { deckId: id },
    orderBy: { position: "asc" },
  });
  return NextResponse.json(fields.map(mapBlueprintField));
}

// PUT /api/decks/[id]/blueprint — replace the entire blueprint
export async function PUT(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const deck = await db.deck.findFirst({ where: { id, userId: user.id } });
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { fields: BlueprintFieldDef[] };
  const fields = Array.isArray(body.fields) ? body.fields : [];
  // Replace: delete old, create new
  await db.blueprintField.deleteMany({ where: { deckId: id } });
  await db.blueprintField.createMany({
    data: fields.map((f, i) => ({
      deckId: id,
      key: f.key,
      label: f.label,
      description: f.description || "",
      fieldType: f.fieldType,
      showOnFront: !!f.showOnFront,
      phonetics: JSON.stringify(f.phonetics || { ruby: "none", extras: [] }),
      position: f.position ?? i,
    })),
  });
  const updated = await db.blueprintField.findMany({
    where: { deckId: id },
    orderBy: { position: "asc" },
  });
  return NextResponse.json(updated.map(mapBlueprintField));
}
