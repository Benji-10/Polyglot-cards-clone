// Shared types for the Polyglot Cards app.
// These define the contract between API and UI.

export type SrsState = "new" | "learning" | "review" | "relearning";

export type CardDirection = "target" | "cloze";
export type ContextLanguage = "target" | "source";
export type FieldType = "text" | "example";

// Ruby annotation systems
export type RubyType =
  | "none"
  | "furigana"
  | "romaji"
  | "pinyin"
  | "bopomofo"
  | "jyutping"
  | "hangulRomanisation"
  | "romanisation"
  | "cyrillicTranslit"
  | "cantoneseRomanisation";

export type ExtraType = "tones" | "diacritics" | "ipa" | "english";

export interface Phonetics {
  ruby: RubyType;
  extras: ExtraType[];
}

// A blueprint field definition for a deck
export interface BlueprintFieldDef {
  id?: string;
  key: string;
  label: string;
  description: string;
  fieldType: FieldType;
  showOnFront: boolean;
  phonetics: Phonetics;
  position: number;
}

// A field value on a card can be:
//  - string (plain text)
//  - { text, annotations } (text with phonetic annotations)
//  - Array of { text, annotations } (example field with multiple sentences)
export interface AnnotatedText {
  text: string;
  annotations?: {
    furigana?: string;
    romaji?: string;
    pinyin?: string;
    bopomofo?: string;
    jyutping?: string;
    ipa?: string;
    tones?: string;
    english?: string;
    [key: string]: string | undefined;
  };
}

export type FieldValue = string | AnnotatedText | AnnotatedText[];

export type CardFields = Record<string, FieldValue>;

export interface DeckData {
  id: string;
  name: string;
  description: string;
  sourceLanguage: string;
  targetLanguage: string;
  cardDirection: CardDirection;
  contextLanguage: ContextLanguage;
  strictAccents: boolean;
  strictMode: boolean;
  latinTyping: boolean;
  romanisationField: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeckWithStats extends DeckData {
  _count: { cards: number };
  stats: DeckStats;
}

export interface DeckStats {
  total: number;
  new: number;
  learning: number;
  review: number;
  relearning: number;
  due: number;
  seen: number;
  mature: number;
}

export interface CardData {
  id: string;
  deckId: string;
  word: string;
  fields: CardFields;
  tags: string[];
  srsState: SrsState;
  stability: number;
  difficulty: number;
  repetitions: number;
  interval: number;
  seen: boolean;
  learningStep: number;
  suspended: boolean;
  lastReviewedAt: string | null;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewLogData {
  id: string;
  cardId: string;
  rating: Rating;
  state: SrsState;
  elapsedDays: number;
  scheduledDays: number;
  reviewedAt: string;
  timeSpentMs: number;
}

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface StudyMode {
  interaction: "passive" | "typing" | "multiple" | "cloze";
  batchSize: number;
  randomise: boolean;
  cardPool?: "all" | "seen" | "unseen";
}

export interface SessionResult {
  reviewed: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
  correct: number;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
}

// ---- Settings ----
export interface AppSettings {
  theme: string; // theme preset name
  customTheme: Record<string, string>;
  defaultBatchSize: number;
  defaultSourceLanguage: string;
  animationsEnabled: boolean;
  strictAccents: boolean;
  strictMode: boolean;
  ttsEnabled: boolean;
  ttsRate: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "nebula",
  customTheme: {},
  defaultBatchSize: 20,
  defaultSourceLanguage: "English",
  animationsEnabled: true,
  strictAccents: true,
  strictMode: false,
  ttsEnabled: true,
  ttsRate: 0.9,
};

// ---- Stats ----
export interface OverviewStats {
  totalDecks: number;
  totalCards: number;
  dueToday: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  reviewedToday: number;
  streak: number;
  retentionRate: number;
  reviewsLast30Days: { date: string; count: number; correct: number }[];
  stateBreakdown: { state: SrsState; count: number }[];
  forecast: { date: string; count: number; isNew: boolean }[];
}
