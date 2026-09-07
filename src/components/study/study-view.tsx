"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Eye,
  Keyboard,
  CheckSquare,
  Sparkles,
  Shuffle,
  Play,
  ArrowLeft,
  Check,
  Volume2,
} from "lucide-react";
import { useDeck, useStudyCards, useReviewCard } from "@/hooks/use-data";
import { useUi } from "@/store/ui-store";
import { useAppSettings } from "@/components/providers";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { RubyText } from "@/components/ruby-text";
import {
  predictInterval,
  formatIntervalDays,
  type SrsStateData,
} from "@/lib/srs";
import {
  gradeAnswer,
  gradeToRating,
  containsCJK,
} from "@/lib/similarity";
import { parseCloze, splitExamples } from "@/lib/ruby";
import { speak, isTtsSupported } from "@/lib/tts";
import { getLanguageBcp47 } from "@/lib/constants";
import type { CardData, BlueprintFieldDef, Rating, SessionResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type Phase = "setup" | "studying" | "complete";

export function StudyView({ deckId }: { deckId: string }) {
  const { data: deck, isLoading } = useDeck(deckId);
  const { setView } = useUi();
  const { settings } = useAppSettings();
  const { toast } = useToast();

  const [mode, setMode] = useState<"learn" | "freestyle">("learn");
  const [interaction, setInteraction] = useState<
    "passive" | "typing" | "multiple" | "cloze"
  >("passive");
  const [batchSize, setBatchSize] = useState(settings.defaultBatchSize || 20);
  const [randomise, setRandomise] = useState(false);
  const [pool, setPool] = useState<"all" | "seen" | "unseen">("all");
  const [phase, setPhase] = useState<Phase>("setup");

  const { data: studyData, isLoading: cardsLoading } = useStudyCards(
    deckId,
    { mode, pool: mode === "freestyle" ? pool : undefined, randomise, limit: batchSize }
  );

  const [queue, setQueue] = useState<CardData[]>([]);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);

  const startSession = () => {
    if (!studyData?.cards?.length) {
      toast({
        title: mode === "learn" ? "Nothing due" : "No cards in pool",
        description:
          mode === "learn"
            ? "You're all caught up! Try Freestyle to review ahead."
            : undefined,
      });
      return;
    }
    setQueue(studyData.cards);
    setIndex(0);
    setResult(null);
    setPhase("studying");
  };

  const onComplete = (r: SessionResult) => {
    setResult(r);
    setPhase("complete");
  };

  if (isLoading || !deck) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48 shimmer mb-4" />
        <Skeleton className="h-64 rounded-2xl shimmer" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => setView({ name: "deck", deckId })}
        className="flex items-center gap-1.5 text-sm text-secondary hover:text-[var(--text-primary)] mb-4 transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to deck
      </button>

      {phase === "setup" && (
        <StudySetup
          deckName={deck.name}
          targetLanguage={deck.targetLanguage}
          mode={mode}
          setMode={setMode}
          interaction={interaction}
          setInteraction={setInteraction}
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          randomise={randomise}
          setRandomise={setRandomise}
          pool={pool}
          setPool={setPool}
          dueCount={deck.stats?.due || 0}
          totalCards={studyData?.total || 0}
          loading={cardsLoading}
          onStart={startSession}
        />
      )}

      {phase === "studying" && queue.length > 0 && (
        <StudySession
          deckId={deckId}
          cards={queue}
          index={index}
          setIndex={setIndex}
          interaction={interaction}
          fields={deck.fields}
          targetLanguage={deck.targetLanguage}
          sourceLanguage={deck.sourceLanguage}
          strictAccents={deck.strictAccents}
          strictMode={deck.strictMode}
          cardDirection={deck.cardDirection}
          onComplete={onComplete}
          onExit={() => setPhase("setup")}
          ttsEnabled={settings.ttsEnabled}
          ttsRate={settings.ttsRate}
        />
      )}

      {phase === "complete" && result && (
        <StudyComplete result={result} onBack={() => setPhase("setup")} />
      )}
    </div>
  );
}

// ============== Setup ==============

function StudySetup(props: {
  deckName: string;
  targetLanguage: string;
  mode: "learn" | "freestyle";
  setMode: (m: "learn" | "freestyle") => void;
  interaction: string;
  setInteraction: (i: "passive" | "typing" | "multiple" | "cloze") => void;
  batchSize: number;
  setBatchSize: (n: number) => void;
  randomise: boolean;
  setRandomise: (b: boolean) => void;
  pool: "all" | "seen" | "unseen";
  setPool: (p: "all" | "seen" | "unseen") => void;
  dueCount: number;
  totalCards: number;
  loading: boolean;
  onStart: () => void;
}) {
  const interactions = [
    { v: "passive", label: "Passive", icon: Eye, desc: "Flip card, rate yourself" },
    { v: "typing", label: "Typing", icon: Keyboard, desc: "Type the answer" },
    { v: "multiple", label: "Multiple", icon: CheckSquare, desc: "Pick from 4 options" },
    { v: "cloze", label: "Cloze", icon: Sparkles, desc: "Fill in the blank" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-1">Study</h1>
      <p className="text-secondary mb-6">{props.deckName}</p>

      <div className="pc-card p-5 space-y-5">
        {/* Mode */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Study Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            <ModeButton
              active={props.mode === "learn"}
              onClick={() => props.setMode("learn")}
              title="Learn"
              desc={`${props.dueCount} due`}
              icon={Play}
            />
            <ModeButton
              active={props.mode === "freestyle"}
              onClick={() => props.setMode("freestyle")}
              title="Freestyle"
              desc="Practice all (no SRS)"
              icon={Shuffle}
            />
          </div>
        </div>

        {/* Interaction */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Interaction</Label>
          <div className="grid grid-cols-2 gap-2">
            {interactions.map((i) => (
              <ModeButton
                key={i.v}
                active={props.interaction === i.v}
                onClick={() => props.setInteraction(i.v as typeof props.interaction)}
                title={i.label}
                desc={i.desc}
                icon={i.icon}
              />
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Batch size</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={props.batchSize}
              onChange={(e) =>
                props.setBatchSize(
                  Math.max(1, Math.min(500, Number(e.target.value) || 20))
                )
              }
              className="bg-elevated border surface-border"
            />
            <p className="text-xs text-muted">Cards loaded per session</p>
          </div>

          {props.mode === "freestyle" && (
            <div className="space-y-1.5">
              <Label>Card pool</Label>
              <div className="flex gap-1.5">
                {(["all", "seen", "unseen"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => props.setPool(p)}
                    className={cn(
                      "flex-1 px-2 py-1.5 rounded-lg text-xs capitalize transition-colors",
                      props.pool === p
                        ? "bg-[var(--accent-glow)] text-[var(--accent-primary)]"
                        : "bg-elevated text-secondary hover:text-[var(--text-primary)]"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <Label>Randomise order</Label>
            <p className="text-xs text-muted">Shuffle card order each session</p>
          </div>
          <Switch
            checked={props.randomise}
            onCheckedChange={props.setRandomise}
          />
        </label>

        {/* Start */}
        <div className="pt-2 border-t subtle-border">
          {props.loading ? (
            <Skeleton className="h-11 rounded-lg shimmer" />
          ) : props.mode === "learn" && props.dueCount === 0 ? (
            <div className="text-center py-3">
              <p className="text-[var(--accent-secondary)] font-medium">
                ✓ Nothing due — great job!
              </p>
              <p className="text-xs text-muted mt-1">
                Switch to Freestyle to review ahead.
              </p>
            </div>
          ) : (
            <Button
              className="btn-primary w-full h-11 gap-2"
              onClick={props.onStart}
            >
              <Play className="size-4" />
              Start · {props.mode === "learn" ? props.dueCount : props.totalCards} cards
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  desc,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  icon: typeof Eye;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all",
        active
          ? "bg-[var(--accent-glow)] border-[var(--accent-primary)]/40"
          : "bg-elevated border surface-border hover:border-[var(--accent-primary)]/30"
      )}
    >
      <Icon
        className={cn(
          "size-4 mt-0.5",
          active ? "text-[var(--accent-primary)]" : "text-muted"
        )}
      />
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted truncate">{desc}</div>
      </div>
    </button>
  );
}

// ============== Session ==============

function StudySession(props: {
  deckId: string;
  cards: CardData[];
  index: number;
  setIndex: (i: number | ((p: number) => number)) => void;
  interaction: "passive" | "typing" | "multiple" | "cloze";
  fields: BlueprintFieldDef[];
  targetLanguage: string;
  sourceLanguage: string;
  strictAccents: boolean;
  strictMode: boolean;
  cardDirection: string;
  onComplete: (r: SessionResult) => void;
  onExit: () => void;
  ttsEnabled: boolean;
  ttsRate: number;
}) {
  const reviewMut = useReviewCard(props.deckId);
  const card = props.cards[props.index];
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<{
    correct: boolean;
    similarity: number;
    exact: boolean;
  } | null>(null);
  const [choices, setChoices] = useState<CardData[]>([]);
  const [counts, setCounts] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const startTimeRef = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset per card
  useEffect(() => {
    setFlipped(false);
    setAnswer("");
    setGrade(null);
    startTimeRef.current = Date.now();
    // Build multiple choice options
    if (props.interaction === "multiple") {
      const others = props.cards.filter((c) => c.id !== card.id);
      const shuffled = [...others]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      setChoices(
        [...shuffled, card].sort(() => Math.random() - 0.5)
      );
    }
    // Auto-speak the target word on new card (passive mode)
    if (props.ttsEnabled && props.interaction === "passive") {
      const word = getCardAnswer(card, props);
      setTimeout(() => speak(word, { lang: getLanguageBcp47(props.targetLanguage), rate: props.ttsRate }), 200);
    }
  }, [props.index, props.interaction, card, props]);

  const frontField = props.fields.find((f) => f.showOnFront);
  const exampleField = props.fields.find(
    (f) => f.fieldType === "example" && f.key === "example"
  );

  // Determine what's shown on the front
  const clozeText = exampleField
    ? getExampleText(card.fields[exampleField.key])
    : "";
  const clozeParsed = clozeText ? parseCloze(clozeText) : null;

  const expectedAnswer = getCardAnswer(card, props);

  const submitAnswer = (userAnswer: string) => {
    const g = gradeAnswer(
      expectedAnswer,
      userAnswer,
      props.strictMode,
      props.strictAccents
    );
    setGrade(g);
    setFlipped(true);
    const rating = gradeToRating(g);
    recordReview(rating);
  };

  const recordReview = (rating: Rating) => {
    const timeSpentMs = Date.now() - startTimeRef.current;
    reviewMut.mutate({
      cardId: card.id,
      rating,
      timeSpentMs,
    });
    setCounts((p) => ({
      again: p.again + (rating === 1 ? 1 : 0),
      hard: p.hard + (rating === 2 ? 1 : 0),
      good: p.good + (rating === 3 ? 1 : 0),
      easy: p.easy + (rating === 4 ? 1 : 0),
    }));
  };

  const next = () => {
    if (props.index + 1 >= props.cards.length) {
      props.onComplete({
        reviewed: props.index + 1,
        again: counts.again,
        hard: counts.hard,
        good: counts.good,
        easy: counts.easy,
        correct: counts.good + counts.easy,
      });
      return;
    }
    props.setIndex((i) => i + 1);
  };

  const rate = (rating: Rating) => {
    recordReview(rating);
    next();
  };

  // Keyboard shortcuts
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        if (e.key === "Enter" && props.interaction !== "passive") {
          e.preventDefault();
          if (!flipped) submitAnswer(answer);
          else next();
        }
        return;
      }
      if (e.key === "Escape") {
        props.onExit();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (props.interaction === "passive") {
          if (!flipped) setFlipped(true);
          else next();
        } else if (flipped) {
          next();
        }
      } else if (["1", "2", "3", "4"].includes(e.key) && flipped && props.interaction === "passive") {
        e.preventDefault();
        rate(Number(e.key) as Rating);
      }
    },
    [flipped, answer, props, card]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!card) return null;

  const progress = ((props.index + 1) / props.cards.length) * 100;

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={props.onExit}
          className="text-muted hover:text-[var(--accent-danger)] p-1"
        >
          <X className="size-5" />
        </button>
        <div className="flex-1 progress-track h-1.5">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted font-mono whitespace-nowrap">
          {props.index + 1} / {props.cards.length}
        </span>
      </div>

      {/* Interaction badge */}
      <div className="flex justify-center mb-4">
        <span className="pc-tag capitalize">
          {props.interaction === "multiple"
            ? "Multiple choice"
            : props.interaction}
          {props.interaction === "typing" && props.cardDirection === "cloze" && " · cloze"}
        </span>
      </div>

      {/* Card */}
      <div className="card-3d w-full max-w-lg mx-auto" style={{ height: 320 }}>
        <div
          className={cn("card-inner", flipped && "flipped")}
          onClick={() => props.interaction === "passive" && !flipped && setFlipped(true)}
        >
          {/* Front */}
          <div className="card-face pc-card-elevated rounded-2xl p-6 flex-col items-center justify-center text-center cursor-pointer">
            {props.cardDirection === "cloze" && clozeParsed?.hasCloze ? (
              <div className="space-y-3">
                <div className="section-title">Cloze</div>
                <div className={cn("text-lg", containsCJK(clozeText) && "font-cjk")}>
                  <RubyText
                    value={card.fields[exampleField!.key]}
                    phonetics={exampleField?.phonetics}
                    renderCloze
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="section-title">Word</div>
                <div
                  className={cn(
                    "text-5xl font-display font-semibold",
                    containsCJK(card.word) && "font-cjk"
                  )}
                >
                  {card.word}
                </div>
                {frontField && card.fields[frontField.key] && (
                  <div className="text-secondary">
                    <RubyText
                      value={card.fields[frontField.key]}
                      phonetics={frontField.phonetics}
                    />
                  </div>
                )}
              </div>
            )}
            {!flipped && (
              <div className="absolute bottom-4 text-xs text-muted">
                tap to reveal · Space
              </div>
            )}
            {props.ttsEnabled && isTtsSupported() && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speak(card.word, {
                    lang: getLanguageBcp47(props.targetLanguage),
                    rate: props.ttsRate,
                  });
                }}
                className="absolute top-4 right-4 text-muted hover:text-[var(--accent-primary)] p-1"
              >
                <Volume2 className="size-4" />
              </button>
            )}
          </div>

          {/* Back */}
          <div className="card-face card-back pc-card-elevated rounded-2xl p-5 flex-col overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-3">
              <div
                className={cn(
                  "text-2xl font-display font-semibold text-[var(--accent-primary)]",
                  containsCJK(card.word) && "font-cjk"
                )}
              >
                {card.word}
              </div>
              {card.interval > 0 && (
                <span className="pc-tag">{formatIntervalDays(card.interval)} interval</span>
              )}
            </div>

            {/* Grade result badge */}
            {grade && props.interaction !== "passive" && (
              <div
                className={cn(
                  "pc-tag mb-3 self-start",
                  grade.correct
                    ? "!bg-[var(--accent-secondary)]/15 !text-[var(--accent-secondary)] !border-transparent"
                    : "!bg-[var(--accent-danger)]/15 !text-[var(--accent-danger)] !border-transparent"
                )}
              >
                {grade.correct
                  ? `✓ ${Math.round(grade.similarity * 100)}%`
                  : `✗ ${answer || "—"}`}
              </div>
            )}

            {/* All fields */}
            <div className="space-y-2.5 flex-1">
              {props.fields
                .filter((f) => !f.showOnFront && card.fields[f.key])
                .map((f) => (
                  <div key={f.key}>
                    <div className="section-title mb-0.5">{f.label}</div>
                    <div
                      className={cn(
                        "text-sm",
                        containsCJK(String(card.fields[f.key] || "")) && "font-cjk"
                      )}
                    >
                      <RubyText
                        value={card.fields[f.key]}
                        phonetics={f.phonetics}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interaction area */}
      <div className="mt-6">
        {!flipped && props.interaction === "passive" && (
          <div className="text-center text-sm text-muted">
            Press Space or tap the card to reveal the answer
          </div>
        )}

        {/* Typing */}
        {!flipped && props.interaction === "typing" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitAnswer(answer);
            }}
            className="max-w-md mx-auto"
          >
            <Input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={`Type the ${props.sourceLanguage.toLowerCase()} answer...`}
              className={cn(
                "bg-elevated border surface-border h-12 text-center text-lg",
                containsCJK(answer) && "font-cjk"
              )}
              autoFocus
            />
            <Button type="submit" className="btn-primary w-full h-10 mt-3 gap-2">
              <Check className="size-4" /> Submit · Enter
            </Button>
          </form>
        )}

        {/* Cloze */}
        {!flipped && props.interaction === "cloze" && clozeParsed && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitAnswer(answer);
            }}
            className="max-w-md mx-auto text-center"
          >
            <div className="text-lg mb-3">
              Fill in the blank:
            </div>
            <Input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="answer..."
              className={cn(
                "bg-elevated border surface-border h-11 text-center",
                containsCJK(answer) && "font-cjk"
              )}
              autoFocus
            />
            <Button type="submit" className="btn-primary w-full h-10 mt-3 gap-2">
              <Check className="size-4" /> Submit · Enter
            </Button>
          </form>
        )}

        {/* Multiple choice */}
        {!flipped && props.interaction === "multiple" && (
          <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
            {choices.map((c, i) => (
              <button
                key={c.id}
                onClick={() => {
                  setAnswer(c.word);
                  const correct = c.id === card.id;
                  setGrade({
                    correct,
                    similarity: correct ? 1 : 0,
                    exact: correct,
                  });
                  setFlipped(true);
                  recordReview(correct ? 2 : 1);
                }}
                className={cn(
                  "pc-card p-3 text-center font-medium hover:border-[var(--accent-primary)]/40 transition-colors",
                  containsCJK(c.word) && "font-cjk"
                )}
              >
                <span className="text-xs text-muted mr-1.5">{i + 1}.</span>
                {c.word}
              </button>
            ))}
          </div>
        )}

        {/* Rating buttons (passive after flip, or after auto-grade) */}
        {flipped && (props.interaction === "passive" || grade) && (
          <RatingButtons
            card={card}
            onRate={props.interaction === "passive" ? rate : next}
            isAuto={props.interaction !== "passive"}
          />
        )}
      </div>
    </div>
  );
}

function RatingButtons({
  card,
  onRate,
  isAuto,
}: {
  card: CardData;
  onRate: (r: Rating) => void;
  isAuto: boolean;
}) {
  const prev: SrsStateData = {
    srsState: card.srsState,
    stability: card.stability,
    difficulty: card.difficulty,
    repetitions: card.repetitions,
    interval: card.interval,
    seen: card.seen,
    learningStep: card.learningStep,
    lastReviewedAt: card.lastReviewedAt ? new Date(card.lastReviewedAt) : null,
    dueAt: new Date(card.dueAt),
  };

  const ratings: { value: Rating; label: string; cls: string; key: string }[] = [
    { value: 1, label: "Again", cls: "again", key: "1" },
    { value: 2, label: "Hard", cls: "hard", key: "2" },
    { value: 3, label: "Good", cls: "good", key: "3" },
    { value: 4, label: "Easy", cls: "easy", key: "4" },
  ];

  if (isAuto) {
    return (
      <div className="text-center">
        <Button className="btn-primary h-11 px-8 gap-2" onClick={() => onRate(3)}>
          Continue · Space
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto">
      {ratings.map((r) => (
        <button
          key={r.value}
          onClick={() => onRate(r.value)}
          className={cn("rating-btn", r.cls)}
        >
          <span className="text-sm font-medium">{r.label}</span>
          <span className="text-[0.7rem] text-muted">
            {predictInterval(prev, r.value)}
          </span>
          <span className="text-[0.65rem] text-muted opacity-60">{r.key}</span>
        </button>
      ))}
    </div>
  );
}

// ============== Complete ==============

function StudyComplete({
  result,
  onBack,
}: {
  result: SessionResult;
  onBack: () => void;
}) {
  const correctPct = result.reviewed
    ? Math.round((result.correct / result.reviewed) * 100)
    : 0;
  return (
    <div className="max-w-md mx-auto text-center animate-slide-up">
      <div className="text-5xl mb-4">{correctPct >= 80 ? "🎉" : correctPct >= 50 ? "👍" : "💪"}</div>
      <h2 className="font-display text-3xl font-semibold mb-1">Session Complete</h2>
      <p className="text-secondary mb-6">
        {result.reviewed} {result.reviewed === 1 ? "card" : "cards"} reviewed ·{" "}
        {correctPct}% correct
      </p>

      <div className="grid grid-cols-4 gap-2 mb-6">
        <StatBox label="Reviewed" value={result.reviewed} color="var(--text-primary)" />
        <StatBox label="Good" value={result.good} color="var(--accent-secondary)" />
        <StatBox label="Hard" value={result.hard} color="var(--accent-warm)" />
        <StatBox label="Again" value={result.again} color="var(--accent-danger)" />
      </div>

      <div className="progress-track h-2 mb-6">
        <div
          className="progress-fill"
          style={{ width: `${correctPct}%` }}
        />
      </div>

      <Button className="btn-primary h-11 px-8 gap-2" onClick={onBack}>
        <ArrowLeft className="size-4" /> Back to Setup
      </Button>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="pc-card p-3">
      <div className="font-display text-2xl font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  );
}

// ============== Helpers ==============

function getCardAnswer(
  card: CardData,
  props: { fields: BlueprintFieldDef[]; cardDirection: string; sourceLanguage: string }
): string {
  // For target-direction cards the answer is the source-language definition
  // (the first text field that isn't showOnFront), fallback to definition field.
  const defField = props.fields.find(
    (f) => f.key === "definition" || f.key === "source_translation"
  );
  if (defField) {
    const v = card.fields[defField.key];
    if (typeof v === "string") return v;
    if (v && typeof v === "object" && "text" in v)
      return (v as { text: string }).text;
  }
  // Fallback: the word itself
  return card.word;
}

function getExampleText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length) {
    const item = value[0];
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "text" in item)
      return (item as { text: string }).text;
  }
  if (typeof value === "object" && "text" in value)
    return (value as { text: string }).text;
  return "";
}
