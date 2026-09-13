import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapCard } from "@/lib/mappers";
import ZAI from "z-ai-web-dev-sdk";
import type { BlueprintFieldDef } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/cards/[id]/enhance — AI-generate or improve the content of a
// single card's fields based on its blueprint. Returns the updated card.
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const card = await db.card.findUnique({
    where: { id },
    include: {
      deck: {
        select: { userId: true, sourceLanguage: true, targetLanguage: true, fields: true },
      },
    },
  });
  if (!card || card.deck.userId !== user.id)
    return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  // Which fields to enhance (default: all empty fields + example)
  const fieldsToEnhance: string[] = body.fields || [];

  const deck = card.deck;
  const blueprintFields = deck.fields.map((f) => ({
    key: f.key,
    label: f.label,
    description: f.description,
    fieldType: f.fieldType,
    showOnFront: f.showOnFront,
  })) as BlueprintFieldDef[];

  // Build context about the card's current state
  const currentFields = JSON.parse(card.fields) as Record<string, unknown>;
  const fieldDescriptions = blueprintFields
    .map((f) => {
      const currentVal = currentFields[f.key];
      const currentText =
        typeof currentVal === "string"
          ? currentVal
          : currentVal && typeof currentVal === "object" && "text" in currentVal
          ? (currentVal as { text: string }).text
          : Array.isArray(currentVal)
          ? (currentVal[0] as { text?: string })?.text || ""
          : "";
      const status = currentText ? `[current: "${currentText}"]` : "[empty]";
      return `- "${f.key}" (${f.label}): ${f.description} ${status}`;
    })
    .join("\n");

  try {
    const zai = await ZAI.create();

    const prompt = `Enhance the flashcard content for the ${deck.targetLanguage} word "${card.word}".
Source language: ${deck.sourceLanguage}

Fill in these fields:
${fieldDescriptions}

${
  fieldsToEnhance.length > 0
    ? `Focus on enhancing these fields: ${fieldsToEnhance.join(", ")}.`
    : "Fill in any empty fields and improve existing ones."
}

For example fields, wrap the target word with {{word}} for cloze.
For annotated fields (reading/phonetic), provide { "text": "...", "annotations": { "furigana": "...", "ipa": "..." } }.

Respond with ONLY a JSON object mapping field keys to their values. No markdown, no explanation.

Example: {"reading": {"text":"猫","annotations":{"furigana":"猫:ねこ","ipa":"neko"}}, "example": "{{猫}}が寝ている。", "definition": "cat", "notes": "Counter: 匹"}`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are a language-learning flashcard content generator. You output ONLY valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });

    const content = completion.choices[0]?.message?.content || "";
    let jsonStr = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    let generatedFields: Record<string, unknown>;
    try {
      generatedFields = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON" },
        { status: 500 }
      );
    }

    // Merge: only update fields that the AI provided, keep existing ones
    const mergedFields = { ...currentFields, ...generatedFields };

    const updated = await db.card.update({
      where: { id },
      data: { fields: JSON.stringify(mergedFields) },
    });

    return NextResponse.json(mapCard(updated));
  } catch (e) {
    console.error("AI enhance error:", e);
    return NextResponse.json(
      { error: "AI enhancement failed", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
