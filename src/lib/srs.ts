// FSRS-5-inspired spaced repetition scheduler.
// Implements a 4-state model (new/learning/review/relearning) with
// stability/d Difficulty tracking, learning steps, and predicted intervals.

import type { Rating, SrsState } from "./types";
import { LEARNING_STEPS, MATURE_THRESHOLD } from "./constants";

export interface SrsStateData {
  srsState: SrsState;
  stability: number;
  difficulty: number;
  repetitions: number;
  interval: number; // days
  seen: boolean;
  learningStep: number;
  lastReviewedAt: Date | null;
  dueAt: Date;
}

export interface ScheduleResult extends SrsStateData {
  elapsedDays: number;
  scheduledDays: number;
}

// FSRS weights (simplified FSRS-5 parameters tuned for good defaults)
const W = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
  0.34, 1.26, 0.29, 2.61, 0.86, 0.26, 0.26,
];

const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // ~1 / 19/81

function initDifficulty(rating: Rating): number {
  const d = W[4] - (rating - 3) * W[5];
  return clamp(d, 1, 10);
}

function initStability(rating: Rating): number {
  return Math.max(W[0], W[rating - 1]);
}

function nextDifficulty(d: number, rating: Rating): number {
  const nextD = d - W[6] * (rating - 3);
  return clamp(meanReversion(W[4], nextD), 1, 10);
}

function meanReversion(init: number, current: number): number {
  return init * W[7] + current * (1 - W[7]);
}

function nextStability(
  d: number,
  s: number,
  rating: Rating,
  state: SrsState,
  reps: number
): number {
  if (rating === 1) {
    // Lapse: stability shrinks
    return Math.max(W[11], s * W[11] * Math.pow(d, -W[12]));
  }
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  const initSFactor =
    state === "review" ? Math.pow(d, -W[9]) : 1;
  return Math.max(
    0.1,
    s *
      (1 + W[8] * initSFactor * hardPenalty * easyBonus * Math.exp(d * -W[9]) *
        (1 - Math.exp(1 / (1 + reps))))
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function powerProgressFuzz(days: number): number {
  if (days <= 2.5) return days * (1 + 0.1 * fuzz(days));
  return days * (1 + 0.05 * fuzz(days));
}

function fuzz(days: number): number {
  const min = Math.max(2, days * 0.05);
  const max = Math.min(0.5, days * 0.4);
  return min + (max - min) * pseudoRandom(days);
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 1000) * 10000;
  return x - Math.floor(x);
}

const MINUTES = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export function schedule(
  prev: SrsStateData,
  rating: Rating,
  now: Date = new Date()
): ScheduleResult {
  const elapsedDays = prev.lastReviewedAt
    ? Math.max(0, (now.getTime() - prev.lastReviewedAt.getTime()) / DAY)
    : 0;

  let {
    srsState: state,
    stability: s,
    difficulty: d,
    repetitions: reps,
    interval,
    learningStep,
    seen,
    lastReviewedAt,
  } = prev;

  // First time seeing the card
  if (!seen) {
    s = initStability(rating);
    d = initDifficulty(rating);
    seen = true;
    reps = rating === 1 ? 0 : 1;
    if (rating === 1) {
      state = "learning";
      learningStep = 0;
    } else {
      // Graduate from new
      interval = Math.max(1, Math.round(s));
      state = "review";
    }
  } else if (state === "learning" || state === "relearning") {
    if (rating === 1) {
      // Stay in learning, restart steps
      learningStep = 0;
      d = nextDifficulty(d, rating);
      s = nextStability(d, s, rating, state, reps);
    } else {
      learningStep += 1;
      if (learningStep >= LEARNING_STEPS.length) {
        // Graduate
        state = "review";
        s = rating === 4 ? s * W[2] : s * W[1];
        d = nextDifficulty(d, rating);
        interval = Math.max(1, Math.round(s));
        reps += 1;
      } else {
        d = nextDifficulty(d, rating);
      }
    }
  } else if (state === "review") {
    if (rating === 1) {
      // Lapse → relearning
      state = "relearning";
      learningStep = 0;
      reps = 0;
      d = nextDifficulty(d, rating);
      s = nextStability(d, s, rating, state, reps);
      interval = Math.max(1, Math.round(s));
    } else {
      d = nextDifficulty(d, rating);
      s = nextStability(d, s, rating, state, reps);
      reps += 1;
      interval = Math.max(1, Math.round(powerProgressFuzz(s)));
    }
  }

  // Compute the next due time
  let dueAt: Date;
  if (state === "learning" || state === "relearning") {
    const stepIdx = Math.min(learningStep, LEARNING_STEPS.length - 1);
    const minutes = LEARNING_STEPS[stepIdx];
    dueAt = new Date(now.getTime() + minutes * MINUTES);
    interval = 0;
  } else {
    dueAt = new Date(now.getTime() + interval * DAY);
  }

  return {
    srsState: state,
    stability: s,
    difficulty: d,
    repetitions: reps,
    interval,
    seen,
    learningStep,
    lastReviewedAt: now,
    dueAt,
    elapsedDays,
    scheduledDays: interval,
  };
}

// Predict the next interval (in human-readable form) for display on rating buttons.
export function predictInterval(
  prev: SrsStateData,
  rating: Rating
): string {
  const result = schedule(prev, rating);
  if (result.srsState === "learning" || result.srsState === "relearning") {
    const stepIdx = Math.min(result.learningStep, LEARNING_STEPS.length - 1);
    return `${LEARNING_STEPS[stepIdx]}m`;
  }
  return formatIntervalDays(result.interval);
}

export function formatIntervalDays(days: number): string {
  if (days < 1) return "<1d";
  if (days === 1) return "1d";
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 60) return "1mo";
  if (days < 365) return `${Math.round(days / 30)}mo`;
  const years = days / 365;
  if (years < 1.5) return "1y";
  return `${years.toFixed(1)}y`;
}

export function isMature(intervalDays: number): boolean {
  return intervalDays >= MATURE_THRESHOLD;
}

// Is a card due now (or overdue)?
export function isDue(dueAt: Date, now: Date = new Date()): boolean {
  return dueAt.getTime() <= now.getTime();
}
