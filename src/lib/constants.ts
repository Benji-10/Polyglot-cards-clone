import type { RubyType, ExtraType, BlueprintFieldDef } from "./types";

export interface LanguageDef {
  name: string;
  flag: string;
  bcp47: string; // for speech synthesis
}

// 21 languages + "Other", matching the reference app's set.
export const LANGUAGES: LanguageDef[] = [
  { name: "English", flag: "🇬🇧", bcp47: "en-US" },
  { name: "German", flag: "🇩🇪", bcp47: "de-DE" },
  { name: "French", flag: "🇫🇷", bcp47: "fr-FR" },
  { name: "Spanish", flag: "🇪🇸", bcp47: "es-ES" },
  { name: "Italian", flag: "🇮🇹", bcp47: "it-IT" },
  { name: "Portuguese", flag: "🇵🇹", bcp47: "pt-PT" },
  { name: "Dutch", flag: "🇳🇱", bcp47: "nl-NL" },
  { name: "Swedish", flag: "🇸🇪", bcp47: "sv-SE" },
  { name: "Polish", flag: "🇵🇱", bcp47: "pl-PL" },
  { name: "Turkish", flag: "🇹🇷", bcp47: "tr-TR" },
  { name: "Greek", flag: "🇬🇷", bcp47: "el-GR" },
  { name: "Hebrew", flag: "🇮🇱", bcp47: "he-IL" },
  { name: "Hindi", flag: "🇮🇳", bcp47: "hi-IN" },
  { name: "Russian", flag: "🇷🇺", bcp47: "ru-RU" },
  { name: "Arabic", flag: "🇸🇦", bcp47: "ar-SA" },
  { name: "Thai", flag: "🇹🇭", bcp47: "th-TH" },
  { name: "Vietnamese", flag: "🇻🇳", bcp47: "vi-VN" },
  { name: "Chinese (Cantonese)", flag: "🇭🇰", bcp47: "yue-HK" },
  { name: "Chinese (Mandarin)", flag: "🇨🇳", bcp47: "zh-CN" },
  { name: "Japanese", flag: "🇯🇵", bcp47: "ja-JP" },
  { name: "Korean", flag: "🇰🇷", bcp47: "ko-KR" },
  { name: "Other", flag: "📚", bcp47: "en-US" },
];

export function getLanguage(name: string): LanguageDef {
  return (
    LANGUAGES.find(
      (l) => l.name.toLowerCase() === name.toLowerCase()
    ) ?? LANGUAGES[0]
  );
}

export function getLanguageFlag(name: string): string {
  return getLanguage(name).flag;
}

export function getLanguageBcp47(name: string): string {
  return getLanguage(name).bcp47;
}

export const RUBY_TYPES: { value: RubyType; label: string; hint: string }[] = [
  { value: "none", label: "None", hint: "—" },
  { value: "furigana", label: "Furigana", hint: "Japanese" },
  { value: "romaji", label: "Rōmaji", hint: "Japanese" },
  { value: "pinyin", label: "Pīnyīn", hint: "Mandarin" },
  { value: "bopomofo", label: "Bopomofo", hint: "Mandarin" },
  { value: "jyutping", label: "Jyutping", hint: "Cantonese" },
  { value: "hangulRomanisation", label: "Romanisation", hint: "Korean" },
  { value: "romanisation", label: "Transliteration", hint: "Arabic / Russian" },
  { value: "cyrillicTranslit", label: "Cyrillic Translit.", hint: "Russian" },
  { value: "cantoneseRomanisation", label: "Yale", hint: "Cantonese" },
];

export const EXTRA_TYPES: { value: ExtraType; label: string; hint: string }[] = [
  { value: "tones", label: "Tone marks", hint: "Mandarin / Thai / Vietnamese" },
  { value: "diacritics", label: "Diacritics", hint: "Arabic / Hebrew" },
  { value: "ipa", label: "IPA", hint: "International Phonetic Alphabet" },
  { value: "english", label: "English gloss", hint: "Translation" },
];

export const DEFAULT_BLUEPRINT = [
  {
    key: "reading",
    label: "Reading / Phonetic",
    description: "Pronunciation guide or romanisation for the word",
    fieldType: "text" as const,
    showOnFront: true,
    phonetics: { ruby: "none" as RubyType, extras: [] as ExtraType[] },
    position: 0,
  },
  {
    key: "example",
    label: "Example Sentence",
    description:
      "A natural example sentence using the word. Wrap ONLY the target word with {{word}}.",
    fieldType: "example" as const,
    showOnFront: false,
    phonetics: { ruby: "none" as RubyType, extras: [] as ExtraType[] },
    position: 1,
  },
  {
    key: "definition",
    label: "Definition",
    description: "A brief definition in the source language",
    fieldType: "text" as const,
    showOnFront: false,
    phonetics: { ruby: "none" as RubyType, extras: [] as ExtraType[] },
    position: 2,
  },
  {
    key: "notes",
    label: "Notes",
    description: "Grammar notes, register, usage tips, or mnemonics",
    fieldType: "text" as const,
    showOnFront: false,
    phonetics: { ruby: "none" as RubyType, extras: [] as ExtraType[] },
    position: 3,
  },
  {
    key: "etymology",
    label: "Etymology",
    description: "Word origin or root breakdown",
    fieldType: "text" as const,
    showOnFront: false,
    phonetics: { ruby: "none" as RubyType, extras: [] as ExtraType[] },
    position: 4,
  },
];

export const QUICK_ADD_FIELDS = [
  {
    key: "source_translation",
    label: "Translation",
    description:
      "A single short translation of the word in the source language.",
  },
  {
    key: "context",
    label: "Context",
    description:
      "Grammatical or usage context to disambiguate — e.g. (masculine singular).",
  },
];

// Mandatory fields always prepended to every blueprint (locked, can't delete).
export const MANDATORY_FIELD_KEYS = ["source_translation", "context"];

export const MANDATORY_FIELDS: Omit<BlueprintFieldDef, "position">[] = [
  {
    key: "source_translation",
    label: "Translation",
    description:
      "A single short translation of the word in the source language. One word or a very short phrase only.",
    fieldType: "text",
    showOnFront: false,
    phonetics: { ruby: "none", extras: [] },
  },
  {
    key: "context",
    label: "Context",
    description:
      "Grammatical or usage context to disambiguate — e.g. (masculine singular), (verb, informal), (pl.).",
    fieldType: "text",
    showOnFront: false,
    phonetics: { ruby: "none", extras: [] },
  },
];

export const LEARNING_STEPS = [1, 10]; // minutes
export const MATURE_THRESHOLD = 21; // days

export const RATING_INFO = [
  { value: 1 as const, label: "Again", color: "var(--accent-danger)" },
  { value: 2 as const, label: "Hard", color: "var(--accent-warm)" },
  { value: 3 as const, label: "Good", color: "var(--accent-secondary)" },
  { value: 4 as const, label: "Easy", color: "var(--accent-primary)" },
];

// ---- Theme presets ----
export interface ThemePreset {
  name: string;
  label: string;
  dark: boolean;
  swatch: string[];
  vars: Record<string, string>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "nebula",
    label: "Nebula",
    dark: true,
    swatch: ["#0a0a1a", "#7c6af0", "#00d4a8"],
    vars: {
      "--bg-primary": "#0a0a1a",
      "--bg-surface": "#12122a",
      "--bg-card": "#1a1a3a",
      "--bg-elevated": "#22224a",
      "--border": "#2a2a5a",
      "--border-subtle": "#1e1e40",
      "--text-primary": "#e8e8f8",
      "--text-secondary": "#b0b0d8",
      "--text-muted": "#a8a8d0",
      "--accent-primary": "#7c6af0",
      "--accent-secondary": "#00d4a8",
      "--accent-warm": "#fdcb6e",
      "--accent-danger": "#e17055",
      "--accent-glow": "rgba(124,106,240,0.15)",
      "--shadow-card": "0 4px 24px rgba(0,0,0,0.4)",
      "--shadow-elevate": "0 8px 48px rgba(0,0,0,0.6)",
    },
  },
  {
    name: "cyber",
    label: "Cyber",
    dark: true,
    swatch: ["#050510", "#00e5ff", "#ff2d78"],
    vars: {
      "--bg-primary": "#050510",
      "--bg-surface": "#0d0d1a",
      "--bg-card": "#141422",
      "--bg-elevated": "#1c1c2e",
      "--border": "#2a2a44",
      "--border-subtle": "#1a1a30",
      "--text-primary": "#e8f0ff",
      "--text-secondary": "#9aaac8",
      "--text-muted": "#8a9ab8",
      "--accent-primary": "#00e5ff",
      "--accent-secondary": "#ff2d78",
      "--accent-warm": "#fbbf24",
      "--accent-danger": "#ff4757",
      "--accent-glow": "rgba(0,229,255,0.15)",
      "--shadow-card": "0 4px 24px rgba(0,0,0,0.5)",
      "--shadow-elevate": "0 8px 48px rgba(0,0,0,0.7)",
    },
  },
  {
    name: "forest",
    label: "Forest",
    dark: true,
    swatch: ["#0a1612", "#22c55e", "#34d399"],
    vars: {
      "--bg-primary": "#0a1612",
      "--bg-surface": "#0f1d18",
      "--bg-card": "#152620",
      "--bg-elevated": "#1b2f28",
      "--border": "#243832",
      "--border-subtle": "#1a2a24",
      "--text-primary": "#e8f5ee",
      "--text-secondary": "#a8c8b8",
      "--text-muted": "#8aaa98",
      "--accent-primary": "#22c55e",
      "--accent-secondary": "#34d399",
      "--accent-warm": "#fbbf24",
      "--accent-danger": "#ef4444",
      "--accent-glow": "rgba(34,197,94,0.15)",
      "--shadow-card": "0 4px 24px rgba(0,0,0,0.4)",
      "--shadow-elevate": "0 8px 48px rgba(0,0,0,0.6)",
    },
  },
  {
    name: "ember",
    label: "Ember",
    dark: true,
    swatch: ["#1a0e08", "#f97316", "#fbbf24"],
    vars: {
      "--bg-primary": "#1a0e08",
      "--bg-surface": "#241308",
      "--bg-card": "#2e1a0e",
      "--bg-elevated": "#382014",
      "--border": "#4a2a18",
      "--border-subtle": "#36200f",
      "--text-primary": "#fbeee0",
      "--text-secondary": "#d8b898",
      "--text-muted": "#c09878",
      "--accent-primary": "#f97316",
      "--accent-secondary": "#fbbf24",
      "--accent-warm": "#fcd34d",
      "--accent-danger": "#ef4444",
      "--accent-glow": "rgba(249,115,22,0.15)",
      "--shadow-card": "0 4px 24px rgba(0,0,0,0.4)",
      "--shadow-elevate": "0 8px 48px rgba(0,0,0,0.6)",
    },
  },
  {
    name: "rose",
    label: "Rose",
    dark: true,
    swatch: ["#1a0810", "#f43f5e", "#fb923c"],
    vars: {
      "--bg-primary": "#1a0810",
      "--bg-surface": "#240e16",
      "--bg-card": "#2e141e",
      "--bg-elevated": "#381a26",
      "--border": "#4a2430",
      "--border-subtle": "#361822",
      "--text-primary": "#fbe8ee",
      "--text-secondary": "#d898b0",
      "--text-muted": "#c09098",
      "--accent-primary": "#f43f5e",
      "--accent-secondary": "#fb923c",
      "--accent-warm": "#fcd34d",
      "--accent-danger": "#ef4444",
      "--accent-glow": "rgba(244,63,94,0.15)",
      "--shadow-card": "0 4px 24px rgba(0,0,0,0.4)",
      "--shadow-elevate": "0 8px 48px rgba(0,0,0,0.6)",
    },
  },
  {
    name: "parchment",
    label: "Parchment",
    dark: false,
    swatch: ["#faf6f0", "#b45309", "#059669"],
    vars: {
      "--bg-primary": "#faf6f0",
      "--bg-surface": "#f3ede2",
      "--bg-card": "#ffffff",
      "--bg-elevated": "#f9f3e8",
      "--border": "#e0d6c2",
      "--border-subtle": "#ece4d2",
      "--text-primary": "#3a2a14",
      "--text-secondary": "#5a4a28",
      "--text-muted": "#8a7858",
      "--accent-primary": "#b45309",
      "--accent-secondary": "#059669",
      "--accent-warm": "#d97706",
      "--accent-danger": "#dc2626",
      "--accent-glow": "rgba(180,83,9,0.12)",
      "--shadow-card": "0 4px 24px rgba(120,90,40,0.12)",
      "--shadow-elevate": "0 8px 48px rgba(120,90,40,0.16)",
    },
  },
];

export function getTheme(name: string): ThemePreset {
  return THEME_PRESETS.find((t) => t.name === name) ?? THEME_PRESETS[0];
}
