// Diacritic / special character helpers for typing + cloze modes.
//
// Provides:
//  - getSpecialChars(language, { latinTyping, romanisationField })
//    Returns the list of clickable special characters for the answer
//    language, or an empty list when none are needed.
//  - getAnswerLanguage(...)
//    Resolves which language's script the user is typing in, so the
//    correct diacritic bar is shown.

export interface SpecialCharGroup {
  label: string;
  chars: string[];
}

// Per-language special characters (latin-script only).
const SPECIAL_CHARS: Record<string, string[]> = {
  French: ["é", "è", "ê", "ë", "à", "â", "î", "ï", "ô", "û", "ç", "œ", "æ"],
  Spanish: ["á", "é", "í", "ó", "ú", "ñ", "¿", "¡"],
  German: ["ä", "ö", "ü", "ß"],
  Italian: ["à", "è", "é", "ì", "ò", "ù"],
  Portuguese: ["á", "â", "ã", "à", "é", "ê", "í", "ó", "ô", "õ", "ú", "ç"],
  // Pinyin tone marks for Mandarin typed in latin script.
  "Chinese (Mandarin)": [
    "ā", "á", "ǎ", "à",
    "ē", "é", "ě", "è",
    "ī", "í", "ǐ", "ì",
    "ō", "ó", "ǒ", "ò",
    "ū", "ú", "ǔ", "ù",
    "ǖ", "ǘ", "ǚ", "ǜ",
  ],
  Vietnamese: [
    "á", "à", "ả", "ã", "ạ",
    "ă", "ắ", "ằ", "ẳ", "ẵ", "ặ",
    "â", "ấ", "ầ", "ẩ", "ẫ", "ậ",
    "é", "è", "ẻ", "ẽ", "ẹ",
    "ê", "ế", "ề", "ể", "ễ", "ệ",
    "í", "ì", "ỉ", "ĩ", "ị",
    "ó", "ò", "ỏ", "õ", "ọ",
    "ô", "ố", "ồ", "ổ", "ỗ", "ộ",
    "ơ", "ớ", "ờ", "ở", "ỡ", "ợ",
    "ú", "ù", "ủ", "ũ", "ụ",
    "ư", "ứ", "ừ", "ử", "ữ", "ự",
    "ý", "ỳ", "ỷ", "ỹ", "ỵ",
    "đ",
  ],
  Polish: ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"],
  Turkish: ["ç", "ğ", "ı", "İ", "ö", "ş", "ü"],
  Czech: ["á", "č", "ď", "é", "ě", "í", "ň", "ó", "ř", "š", "ť", "ú", "ů", "ý", "ž"],
  Slovak: ["á", "ä", "č", "ď", "é", "í", "ĺ", "ľ", "ň", "ó", "ô", "ŕ", "š", "ť", "ú", "ý", "ž"],
  Croatian: ["č", "ć", "đ", "š", "ž"],
  Romanian: ["ă", "â", "î", "ș", "ț", "ş", "ţ"],
  Hungarian: ["á", "é", "í", "ó", "ö", "ő", "ú", "ü", "ű"],
  Swedish: ["å", "ä", "ö"],
  Danish: ["æ", "ø", "å"],
  Norwegian: ["æ", "ø", "å"],
  Finnish: ["å", "ä", "ö"],
  Icelandic: ["á", "é", "í", "ó", "ú", "ý", "þ", "æ", "ö", "ð"],
  Dutch: ["é", "ë", "ï", "ó", "ö", "ü"],
  "Chinese (Cantonese)": [], // jyutping uses plain ASCII letters
  Japanese: [], // romaji uses plain ASCII
  Korean: [], // romanisation uses plain ASCII
  Russian: [], // cyrillic — not latin-typed
  Arabic: [], // different script — not latin-typed
  Hebrew: [], // different script — not latin-typed
  Hindi: [], // different script — not latin-typed
  Greek: [], // different script — not latin-typed
  Thai: [], // different script — not latin-typed
  English: [],
  Other: [],
};

/**
 * Resolve the language whose script the user is typing the answer in.
 *
 * The "answer" is the side they have to produce. In target→source, the answer
 * is in the source language. In source→target, the answer is in the target
 * language — UNLESS latinTyping + romanisationField are set, in which case
 * the answer is the romanised (latin) form of the target word.
 */
export function getAnswerLanguage(opts: {
  direction: "targetToSource" | "sourceToTarget";
  targetLanguage: string;
  sourceLanguage: string;
  latinTyping: boolean;
  romanisationField: string;
}): string {
  if (opts.direction === "targetToSource") {
    return opts.sourceLanguage;
  }
  // sourceToTarget
  if (opts.latinTyping && opts.romanisationField) {
    // The answer is the romanised form — which uses latin-script tone marks
    // for Chinese (Mandarin) but plain ASCII for most others.
    return opts.targetLanguage;
  }
  return opts.targetLanguage;
}

/**
 * Get the list of clickable special characters for the answer language.
 *
 * Returns an empty array when:
 *  - The language has no diacritics (Japanese romaji, Korean romanisation)
 *  - The language uses a non-latin script (CJK, Cyrillic, Arabic, etc.) and
 *    latinTyping isn't enabled (the user will use an IME)
 *
 * When latinTyping is enabled for a CJK target language, we show pinyin tone
 * marks (Mandarin) — for Cantonese/Japanese/Korean, latin typing uses plain
 * ASCII so the bar is hidden.
 */
export function getSpecialChars(language: string): string[] {
  return SPECIAL_CHARS[language] ?? [];
}

/**
 * True when the answer language has special characters worth showing a bar for.
 */
export function hasSpecialChars(language: string): boolean {
  return getSpecialChars(language).length > 0;
}
