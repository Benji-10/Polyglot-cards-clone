// String similarity utilities for auto-grading typing/cloze answers.
// Uses Damerau-Levenshtein distance, with accent-stripping tolerance.

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalize(s: string, strictAccents: boolean): string {
  let out = s.trim().toLowerCase();
  if (!strictAccents) out = stripAccents(out);
  // Collapse internal whitespace
  out = out.replace(/\s+/g, " ");
  return out;
}

// Damerau-Levenshtein distance (allows adjacent transpositions)
export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const d: number[][] = Array.from({ length: la + 1 }, () =>
    new Array(lb + 1).fill(0)
  );
  for (let i = 0; i <= la; i++) d[i][0] = i;
  for (let j = 0; j <= lb; j++) d[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[la][lb];
}

export function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - damerauLevenshtein(a, b) / maxLen;
}

export function containsCJK(s: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uf900-\ufaff]/.test(s);
}

// Decide the similarity threshold for marking an answer correct.
export function thresholdFor(
  expected: string,
  strictMode: boolean,
  isCJK: boolean
): number {
  if (strictMode) return 1;
  if (isCJK) return 0.9;
  if (expected.length <= 2) return 1;
  if (expected.length <= 4) return 0.75;
  return 0.85;
}

export interface GradeResult {
  correct: boolean;
  similarity: number;
  exact: boolean;
}

export function gradeAnswer(
  expected: string,
  given: string,
  strictMode: boolean,
  strictAccents: boolean
): GradeResult {
  const isCJK = containsCJK(expected);
  const e = normalize(expected, strictAccents);
  const g = normalize(given, strictAccents);
  const sim = similarity(e, g);
  const thr = thresholdFor(e, strictMode, isCJK);
  return {
    correct: sim >= thr,
    similarity: sim,
    exact: e === g,
  };
}

// Map a grading result to an SRS rating (1=Again, 3=Good)
export function gradeToRating(grade: GradeResult): 1 | 3 {
  return grade.correct ? 3 : 1;
}
