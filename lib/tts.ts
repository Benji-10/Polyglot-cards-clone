// Text-to-speech using the Web Speech API (SpeechSynthesis).
// No external service required — works in the browser for any language
// that has a system voice installed.

let cachedVoices: SpeechSynthesisVoice[] | null = null;

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!isTtsSupported()) return [];
  if (cachedVoices && cachedVoices.length) return cachedVoices;
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

export function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (!voices.length) return null;
  const langLower = lang.toLowerCase();
  const base = langLower.split("-")[0];
  // Exact match first, then base-language match.
  return (
    voices.find((v) => v.lang.toLowerCase() === langLower) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ||
    null
  );
}

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isTtsSupported() || !text.trim()) return;
  // Cancel any ongoing speech so rapid taps don't queue up.
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  if (opts.lang) {
    utter.lang = opts.lang;
    const v = pickVoice(opts.lang);
    if (v) utter.voice = v;
  }
  utter.rate = opts.rate ?? 0.9;
  utter.pitch = opts.pitch ?? 1;
  utter.volume = opts.volume ?? 1;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (isTtsSupported()) window.speechSynthesis.cancel();
}

// Ensure voices are loaded (Chrome loads them asynchronously).
export function primeVoices(): void {
  if (!isTtsSupported()) return;
  getVoices();
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }
}
