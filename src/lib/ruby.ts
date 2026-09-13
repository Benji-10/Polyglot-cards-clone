// Ruby / phonetic annotation rendering helpers.
// Builds proper <ruby>/<rt> structures for furigana, pinyin, etc.
// This module is safe for both server and client (returns React nodes
// only when imported from a client component via renderAnnotated).

import type { AnnotatedText, Phonetics, RubyType, FieldValue } from "./types";

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

// Pick a random example from a multi-sentence field (separated by " ;;; ").
export function pickRandomExample(raw: string): string {
  if (!raw) return "";
  const parts = splitExamples(raw);
  if (parts.length <= 1) return raw.trim();
  return parts[Math.floor(Math.random() * parts.length)];
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
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : v?.text || ""))
      .join(" ");
  }
  if (typeof value === "object" && "text" in value) {
    return (value as AnnotatedText).text || "";
  }
  return "";
}

// Resolve a field value into a single { text, annotations } object (the first
// one if it's an array). Returns null when empty.
export function fieldValueToAnnotated(
  value: unknown
): AnnotatedText | null {
  if (value == null) return null;
  if (typeof value === "string") return value ? { text: value } : null;
  if (Array.isArray(value)) {
    const first = value[0];
    if (!first) return null;
    if (typeof first === "string") return { text: first };
    return first as AnnotatedText;
  }
  if (typeof value === "object" && "text" in value)
    return value as AnnotatedText;
  return null;
}

// Get the annotation keys active for a field's phonetics config — used to know
// which sub-inputs to render in the card form.
export function getAnnotationKeys(phonetics: Phonetics | undefined): string[] {
  if (!phonetics) return [];
  const keys: string[] = [];
  const rubyMap: Record<string, string> = {
    furigana: "furigana",
    pinyin: "pinyin",
    bopomofo: "bopomofo",
    jyutping: "jyutping",
    hangulRomanisation: "romaji",
    romanisation: "romaji",
    cyrillicTranslit: "romaji",
    cantoneseRomanisation: "jyutping",
  };
  if (phonetics.ruby && phonetics.ruby !== "none") {
    const k = rubyMap[phonetics.ruby] || "romaji";
    if (!keys.includes(k)) keys.push(k);
  }
  if (phonetics.extras) {
    for (const e of phonetics.extras) {
      if (e === "ipa" && !keys.includes("ipa")) keys.push("ipa");
      else if (e === "tones" && !keys.includes("tones")) keys.push("tones");
      else if (e === "english" && !keys.includes("english")) keys.push("english");
      else if (e === "diacritics" && !keys.includes("ipa")) keys.push("ipa");
    }
  }
  return keys;
}

// Normalise a phonetics value that may be missing or in a legacy shape.
export function normalisePhonetics(p: unknown): Phonetics {
  if (!p || typeof p !== "object") return { ruby: "none", extras: [] };
  const obj = p as Partial<Phonetics> & { ruby?: unknown; extras?: unknown };
  const ruby = (typeof obj.ruby === "string" ? obj.ruby : "none") as RubyType;
  const extras = Array.isArray(obj.extras)
    ? obj.extras.filter((e): e is string => typeof e === "string")
    : [];
  return { ruby, extras: extras as Phonetics["extras"] };
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
