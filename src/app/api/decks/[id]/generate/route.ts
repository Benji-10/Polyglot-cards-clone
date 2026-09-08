import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";
import type { BlueprintFieldDef, Phonetics } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/decks/[id]/generate — AI-generate flashcard content from a list
// of words. Uses the z-ai-web-dev-sdk LLM to fill in the blueprint fields for
// each word.
//
// Request body: { words: string[], batchSize?: number }
// Response: { cards: GeneratedCard[] }
//
// Each GeneratedCard = { word: string, fields: Record<string, unknown> }
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await resolveServerUser(req.headers);
  const { id } = await params;
  const deck = await db.deck.findFirst({
    where: { id, userId: user.id },
    include: { fields: { orderBy: { position: "asc" } } },
  });
  if (!deck)
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const words: string[] = (body.words || [])
    .map((w: unknown) => String(w).trim())
    .filter(Boolean);
  if (!words.length)
    return NextResponse.json({ error: "No words provided" }, { status: 400 });

  // Build the blueprint description for the LLM.
  const blueprintFields = deck.fields.map((f) => {
    const phonetics = JSON.parse(f.phonetics) as Phonetics;
    return {
      key: f.key,
      label: f.label,
      description: f.description,
      fieldType: f.fieldType,
      showOnFront: f.showOnFront,
      phonetics,
    } as BlueprintFieldDef;
  });

  const fieldDescriptions = blueprintFields
    .map(
      (f) =>
        `- "${f.key}" (${f.label}): ${f.description}${
          f.fieldType === "example"
            ? ". For example fields, wrap the target word with {{word}} for cloze."
            : ""
        }`
    )
    .join("\n");

  try {
    const zai = await ZAI.create();

    // Process in batches of 10 to keep responses fast and manageable.
    const batchSize = 10;
    const allCards: { word: string; fields: Record<string, unknown> }[] = [];

    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      const prompt = buildPrompt(
        batch,
        deck.sourceLanguage,
        deck.targetLanguage,
        fieldDescriptions,
        blueprintFields
      );

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content:
              "You are a language-learning flashcard generator. You output ONLY valid JSON, no markdown, no explanation.",
          },
          { role: "user", content: prompt },
        ],
        thinking: { type: "disabled" },
      });

      const content = completion.choices[0]?.message?.content || "";
      const cards = parseGeneratedCards(content, batch, blueprintFields);
      allCards.push(...cards);
    }

    return NextResponse.json({ cards: allCards });
  } catch (e) {
    console.error("AI generation error:", e);
    return NextResponse.json(
      { error: "AI generation failed", detail: (e as Error).message },
      { status: 500 }
    );
  }
}

function buildPrompt(
  words: string[],
  sourceLanguage: string,
  targetLanguage: string,
  fieldDescriptions: string,
  blueprintFields: BlueprintFieldDef[]
): string {
  return `Generate flashcard content for the following ${targetLanguage} words.
The source language (for translations) is ${sourceLanguage}.

Words: ${JSON.stringify(words)}

For EACH word, fill in these fields:
${fieldDescriptions}

Respond with a JSON array where each element has:
- "word": the original word
- "fields": an object with keys matching the field keys above
  - For text fields: provide a string value
  - For example fields: provide a string with the target word wrapped in {{word}}
  - For annotated fields (with phonetics), provide an object: { "text": "...", "annotations": { "ipa": "...", "furigana": "...", etc. } }

Example response for a Japanese word "猫" with fields reading, example, definition:
[
  {
    "word": "猫",
    "fields": {
      "source_translation": "cat",
      "context": "(noun)",
      "reading": { "text": "猫", "annotations": { "furigana": "猫:ねこ", "ipa": "neko" } },
      "example": "{{猫}}が寝ている。",
      "definition": "cat",
      "notes": "Counter: 匹 (hiki)"
    }
  }
]

Respond with ONLY the JSON array. No markdown, no explanation.`;
}

function parseGeneratedCards(
  content: string,
  words: string[],
  blueprintFields: BlueprintFieldDef[]
): { word: string; fields: Record<string, unknown> }[] {
  // Try to extract JSON from the response (it may have surrounding text).
  let jsonStr = content.trim();
  // Strip markdown code fences if present.
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((c: { word?: string }) => c && c.word)
      .map((c: { word: string; fields?: Record<string, unknown> }) => ({
        word: String(c.word),
        fields: c.fields || {},
      }));
  } catch {
    // If JSON parsing fails, return minimal cards with just the words.
    return words.map((w) => ({ word: w, fields: {} }));
  }
}
