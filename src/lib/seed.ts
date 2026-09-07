// Sample decks & cards to seed a new user's library with.
// Demonstrates furigana (Japanese), pinyin (Mandarin), romanisation (Korean),
// and IPA accents (French) across multiple deck types.

import type { BlueprintFieldDef, CardFields } from "./types";

interface SampleCard {
  word: string;
  fields: CardFields;
}

interface SampleDeck {
  name: string;
  description: string;
  sourceLanguage: string;
  targetLanguage: string;
  cardDirection: "target" | "cloze";
  contextLanguage: "target" | "source";
  strictAccents: boolean;
  strictMode: boolean;
  fields: BlueprintFieldDef[];
  cards: SampleCard[];
}

const basePhonetics = { ruby: "none" as const, extras: [] as const };

export function buildSampleDecks(userId: string): SampleDeck[] {
  void userId;
  return [
    // ---- Japanese with furigana ----
    {
      name: "Japanese Core Nouns",
      description: "Essential Japanese nouns with furigana readings.",
      sourceLanguage: "English",
      targetLanguage: "Japanese",
      cardDirection: "target",
      contextLanguage: "target",
      strictAccents: false,
      strictMode: false,
      fields: [
        {
          key: "reading",
          label: "Reading / Phonetic",
          description: "Hiragana reading of the word",
          fieldType: "text",
          showOnFront: true,
          phonetics: { ruby: "furigana", extras: ["ipa"] },
          position: 0,
        },
        {
          key: "example",
          label: "Example Sentence",
          description: "Natural sentence using {{word}}.",
          fieldType: "example",
          showOnFront: false,
          phonetics: basePhonetics,
          position: 1,
        },
        {
          key: "definition",
          label: "Definition",
          description: "English meaning",
          fieldType: "text",
          showOnFront: false,
          phonetics: basePhonetics,
          position: 2,
        },
        {
          key: "notes",
          label: "Notes",
          description: "Usage notes",
          fieldType: "text",
          showOnFront: false,
          phonetics: basePhonetics,
          position: 3,
        },
      ],
      cards: [
        {
          word: "猫",
          fields: {
            reading: { text: "猫", annotations: { furigana: "猫:ねこ", ipa: "neko" } },
            example: [
              { text: "{{猫}}が寝ている。", annotations: { furigana: "猫:ねこ 寝:ね" } },
            ],
            definition: "cat",
            notes: "Counter: 匹 (hiki) → 一匹の猫",
          },
        },
        {
          word: "本",
          fields: {
            reading: { text: "本", annotations: { furigana: "本:ほん", ipa: "hon" } },
            example: [{ text: "この{{本}}を読んだ。", annotations: { furigana: "本:ほん 読:よ" } }],
            definition: "book",
            notes: "Counter: 冊 (satsu)",
          },
        },
        {
          word: "水",
          fields: {
            reading: { text: "水", annotations: { furigana: "水:みず", ipa: "mizu" } },
            example: [{ text: "{{水}}を飲む。", annotations: { furigana: "水:みず 飲:の" } }],
            definition: "water",
            notes: "",
          },
        },
        {
          word: "学校",
          fields: {
            reading: { text: "学校", annotations: { furigana: "学校:がっこう", ipa: "gakkō" } },
            example: [{ text: "{{学校}}へ行く。", annotations: { furigana: "学校:がっこう 行:い" } }],
            definition: "school",
            notes: "",
          },
        },
        {
          word: "友達",
          fields: {
            reading: { text: "友達", annotations: { furigana: "友達:ともだち", ipa: "tomodachi" } },
            example: [{ text: "{{友達}}に会った。", annotations: { furigana: "友達:ともだち 会:あ" } }],
            definition: "friend",
            notes: "",
          },
        },
        {
          word: "車",
          fields: {
            reading: { text: "車", annotations: { furigana: "車:くるま", ipa: "kuruma" } },
            example: [{ text: "{{車}}を運転する。", annotations: { furigana: "車:くるま 運転:うんてん" } }],
            definition: "car",
            notes: "",
          },
        },
      ],
    },

    // ---- Mandarin with pinyin ----
    {
      name: "Mandarin Greetings",
      description: "Common Mandarin phrases with pinyin and tones.",
      sourceLanguage: "English",
      targetLanguage: "Chinese (Mandarin)",
      cardDirection: "target",
      contextLanguage: "target",
      strictAccents: true,
      strictMode: false,
      fields: [
        {
          key: "reading",
          label: "Reading / Phonetic",
          description: "Pinyin with tone marks",
          fieldType: "text",
          showOnFront: true,
          phonetics: { ruby: "pinyin", extras: ["tones"] },
          position: 0,
        },
        {
          key: "example",
          label: "Example Sentence",
          description: "Natural sentence using {{word}}.",
          fieldType: "example",
          showOnFront: false,
          phonetics: basePhonetics,
          position: 1,
        },
        {
          key: "definition",
          label: "Definition",
          description: "English meaning",
          fieldType: "text",
          showOnFront: false,
          phonetics: basePhonetics,
          position: 2,
        },
        {
          key: "notes",
          label: "Notes",
          description: "Usage notes",
          fieldType: "text",
          showOnFront: false,
          phonetics: basePhonetics,
          position: 3,
        },
      ],
      cards: [
        {
          word: "你好",
          fields: {
            reading: { text: "你好", annotations: { pinyin: "nǐ hǎo", tones: "3-2" } },
            example: [{ text: "{{你好}}，很高兴见到你。", annotations: { pinyin: "nǐ hǎo, hěn gāoxìng jiàndào nǐ" } }],
            definition: "hello",
            notes: "Literally 'you good'",
          },
        },
        {
          word: "谢谢",
          fields: {
            reading: { text: "谢谢", annotations: { pinyin: "xièxie", tones: "4-0" } },
            example: [{ text: "{{谢谢}}你的帮助。", annotations: { pinyin: "xièxie nǐ de bāngzhù" } }],
            definition: "thank you",
            notes: "Second syllable is neutral tone",
          },
        },
        {
          word: "再见",
          fields: {
            reading: { text: "再见", annotations: { pinyin: "zàijiàn", tones: "4-4" } },
            example: [{ text: "明天{{再见}}。", annotations: { pinyin: "míngtiān zàijiàn" } }],
            definition: "goodbye",
            notes: "Literally 'again see'",
          },
        },
        {
          word: "请问",
          fields: {
            reading: { text: "请问", annotations: { pinyin: "qǐngwèn", tones: "3-4" } },
            example: [{ text: "{{请问}}，洗手间在哪里？", annotations: { pinyin: "qǐngwèn, xǐshǒujiān zài nǎlǐ?" } }],
            definition: "excuse me (may I ask)",
            notes: "Polite way to ask a question",
          },
        },
        {
          word: "对不起",
          fields: {
            reading: { text: "对不起", annotations: { pinyin: "duìbuqǐ", tones: "4-0-3" } },
            example: [{ text: "{{对不起}}，我迟到了。", annotations: { pinyin: "duìbuqǐ, wǒ chídào le" } }],
            definition: "sorry",
            notes: "",
          },
        },
      ],
    },

    // ---- French with IPA ----
    {
      name: "French Essentials",
      description: "Everyday French words with IPA pronunciation.",
      sourceLanguage: "English",
      targetLanguage: "French",
      cardDirection: "cloze",
      contextLanguage: "target",
      strictAccents: true,
      strictMode: false,
      fields: [
        {
          key: "reading",
          label: "Reading / Phonetic",
          description: "IPA transcription",
          fieldType: "text",
          showOnFront: true,
          phonetics: { ruby: "none", extras: ["ipa"] },
          position: 0,
        },
        {
          key: "example",
          label: "Example Sentence",
          description: "Natural sentence using {{word}}.",
          fieldType: "example",
          showOnFront: false,
          phonetics: basePhonetics,
          position: 1,
        },
        {
          key: "definition",
          label: "Definition",
          description: "English meaning",
          fieldType: "text",
          showOnFront: false,
          phonetics: basePhonetics,
          position: 2,
        },
        {
          key: "notes",
          label: "Notes",
          description: "Gender, register, usage",
          fieldType: "text",
          showOnFront: false,
          phonetics: basePhonetics,
          position: 3,
        },
      ],
      cards: [
        {
          word: "bonjour",
          fields: {
            reading: { text: "bonjour", annotations: { ipa: "bɔ̃.ʒuʁ" } },
            example: [{ text: "{{Bonjour}}, comment allez-vous ?", annotations: {} }],
            definition: "hello / good day",
            notes: "Used both as greeting and farewell during daytime",
          },
        },
        {
          word: "merci",
          fields: {
            reading: { text: "merci", annotations: { ipa: "mɛʁ.si" } },
            example: [{ text: "{{Merci}} beaucoup pour votre aide.", annotations: {} }],
            definition: "thank you",
            notes: "",
          },
        },
        {
          word: "café",
          fields: {
            reading: { text: "café", annotations: { ipa: "ka.fe" } },
            example: [{ text: "Je prends un {{café}} le matin.", annotations: {} }],
            definition: "coffee / café",
            notes: "masculine",
          },
        },
        {
          word: "maison",
          fields: {
            reading: { text: "maison", annotations: { ipa: "mɛ.zɔ̃" } },
            example: [{ text: "Je rentre à la {{maison}}.", annotations: {} }],
            definition: "house / home",
            notes: "feminine",
          },
        },
        {
          word: "voiture",
          fields: {
            reading: { text: "voiture", annotations: { ipa: "vwa.tyʁ" } },
            example: [{ text: "Ma {{voiture}} est en panne.", annotations: {} }],
            definition: "car",
            notes: "feminine",
          },
        },
      ],
    },

    // ---- Spanish (cloze) ----
    {
      name: "Spanish Verbs",
      description: "Common Spanish verbs with example sentences (cloze).",
      sourceLanguage: "English",
      targetLanguage: "Spanish",
      cardDirection: "cloze",
      contextLanguage: "target",
      strictAccents: true,
      strictMode: false,
      fields: [
        {
          key: "reading",
          label: "Reading / Phonetic",
          description: "IPA pronunciation",
          fieldType: "text",
          showOnFront: false,
          phonetics: { ruby: "none", extras: ["ipa"] },
          position: 0,
        },
        {
          key: "example",
          label: "Example Sentence",
          description: "Sentence with {{word}} blanked.",
          fieldType: "example",
          showOnFront: true,
          phonetics: basePhonetics,
          position: 1,
        },
        {
          key: "definition",
          label: "Definition",
          description: "English meaning",
          fieldType: "text",
          showOnFront: false,
          phonetics: basePhonetics,
          position: 2,
        },
        {
          key: "notes",
          label: "Notes",
          description: "Conjugation notes",
          fieldType: "text",
          showOnFront: false,
          phonetics: basePhonetics,
          position: 3,
        },
      ],
      cards: [
        {
          word: "hablar",
          fields: {
            reading: { text: "hablar", annotations: { ipa: "a.ˈβlaɾ" } },
            example: [{ text: "Me gusta {{hablar}} con mis amigos.", annotations: {} }],
            definition: "to speak",
            notes: "-ar verb, regular",
          },
        },
        {
          word: "comer",
          fields: {
            reading: { text: "comer", annotations: { ipa: "ko.ˈmeɾ" } },
            example: [{ text: "Vamos a {{comer}} en el restaurante.", annotations: {} }],
            definition: "to eat",
            notes: "-er verb, regular",
          },
        },
        {
          word: "vivir",
          fields: {
            reading: { text: "vivir", annotations: { ipa: "bi.ˈβiɾ" } },
            example: [{ text: "Ella {{vive}} en Madrid.", annotations: {} }],
            definition: "to live",
            notes: "-ir verb, regular",
          },
        },
        {
          word: "estudiar",
          fields: {
            reading: { text: "estudiar", annotations: { ipa: "es.tu.ˈðjaɾ" } },
            example: [{ text: "Tengo que {{estudiar}} para el examen.", annotations: {} }],
            definition: "to study",
            notes: "-ar verb, regular",
          },
        },
        {
          word: "trabajar",
          fields: {
            reading: { text: "trabajar", annotations: { ipa: "tɾa.βa.ˈxaɾ" } },
            example: [{ text: "Mi padre {{trabaja}} en un banco.", annotations: {} }],
            definition: "to work",
            notes: "-ar verb, regular",
          },
        },
      ],
    },
  ];
}
