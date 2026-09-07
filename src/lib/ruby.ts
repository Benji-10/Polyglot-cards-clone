// Ruby / phonetic annotation rendering helpers.
// Builds proper <ruby>/<rt> structures for furigana, pinyin, etc.
// This module is safe for both server and client (returns React nodes
// only when imported from a client component via renderAnnotated).

import type { AnnotatedText, Phonetics, RubyType } from "./types";

// Detect if a string contains CJK characters
export function isCJK(s: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uf900-\ufaff]/.test(s);
}

export function hasKanji(s: string): boolean {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(s);
}

// Furigana format: "kanji:reading kanji:reading" → pairs
export interface RubySegment {
  base: string;
  ruby: string | null;
}

export function parseFurigana(text: string, furigana: string): RubySegment[] {
  if (!furigana) return [{ base: text, ruby: null }];
  // Format: "base:reading base:reading" — split by space
  const pairs = furigana.trim().split(/\s+/).map((p) => {
    const [base, reading] = p.split(":");
    return { base: base || "", ruby: reading || "" };
  });
  // Walk through text matching consecutive bases
  const segments: RubySegment[] = [];
  let i = 0;
  for (const pair of pairs) {
    if (!pair.base) continue;
    const idx = text.indexOf(pair.base, i);
    if (idx === -1) continue;
    if (idx > i) segments.push({ base: text.slice(i, idx), ruby: null });
    segments.push({ base: pair.base, ruby: pair.ruby || null });
    i = idx + pair.base.length;
  }
  if (i < text.length) segments.push({ base: text.slice(i), ruby: null });
  return segments.length ? segments : [{ base: text, ruby: null }];
}

// Split example sentences by " ;;; "
export function splitExamples(raw: string): string[] {
  return raw
    .split(/\s*;;;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Parse a cloze sentence "私は{{猫}}を飼っている"
export interface ClozeParse {
  display: string; // "私は___を飼っている"
  answer: string; // "猫"
  hasCloze: boolean;
  before: string;
  after: string;
}

export function parseCloze(sentence: string): ClozeParse {
  const match = sentence.match(/^(.*?)\{\{(.+?)\}\}(.*?)$/);
  if (!match) {
    return {
      display: sentence,
      answer: "",
      hasCloze: false,
      before: sentence,
      after: "",
    };
  }
  const [, before, answer, after] = match;
  const blank = "_".repeat(Math.max(3, answer.length + 2));
  return {
    display: `${before}${blank}${after}`,
    answer,
    hasCloze: true,
    before,
    after,
  };
}

// Extract a plain string from a FieldValue (for search/display)
export function fieldValueToString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" ? v : v?.text || "")).join(" ");
  }
  if (value && typeof value === "object" && "text" in value) {
    return (value as AnnotatedText).text || "";
  }
  return "";
}

export function fieldValueToAnnotated(
  value: unknown
): AnnotatedText | AnnotatedText[] | null {
  if (typeof value === "string") return { text: value };
  if (Array.isArray(value)) return value as AnnotatedText[];
  if (value && typeof value === "object" && "text" in value)
    return value as AnnotatedText;
  return null;
}

export function getRubyLabel(ruby: RubyType): string {
  const map: Record<RubyType, string> = {
    none: "",
    furigana: "ふ",
    romaji: "Rōmaji",
    pinyin: "Pīnyīn",
    bopomofo: "ㄅㄆㄇ",
    jyutping: "Jyutping",
    hangulRomanisation: "Rom.",
    romanisation: "Translit",
    cyrillicTranslit: "Cyr.",
    cantoneseRomanisation: "Yale",
  };
  return map[ruby];
}

export function phoneticsFor(
  annotations: AnnotatedText["annotations"] | undefined,
  phonetics: Phonetics | undefined
): string[] {
  if (!annotations || !phonetics) return [];
  const out: string[] = [];
  if (phonetics.extras?.includes("ipa") && annotations.ipa) {
    out.push(`/${annotations.ipa}/`);
  }
  if (phonetics.extras?.includes("tones") && annotations.tones) {
    out.push(annotations.tones);
  }
  if (phonetics.extras?.includes("english") && annotations.english) {
    out.push(annotations.english);
  }
  if (phonetics.extras?.includes("diacritics") && annotations.ipa) {
    if (!out.includes(`/${annotations.ipa}/`)) out.push(`/${annotations.ipa}/`);
  }
  return out;
}
