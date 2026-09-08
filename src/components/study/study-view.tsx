"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  ArrowRight,
  ArrowLeftRight,
  HelpCircle,
  Edit,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useDeck, useStudyCards, useReviewCard, useDeckTags } from "@/hooks/use-data";
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
import { parseCloze, pickRandomExample, fieldValueToAnnotated } from "@/lib/ruby";
import { speak, isTtsSupported } from "@/lib/tts";
import { getLanguageBcp47, getLanguageFlag } from "@/lib/constants";
import type {
  CardData,
  BlueprintFieldDef,
  Rating,
  SessionResult,
  CardFields,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Phase = "setup" | "studying" | "complete";
type Direction = "targetToSource" | "sourceToTarget";

export function StudyView({ deckId }: { deckId: string }) {
  const { data: deck, isLoading } = useDeck(deckId);
  const { data: tagsData } = useDeckTags(deckId);
  const { setView } = useUi();
  const { settings } = useAppSettings();
  const { toast } = useToast();

  const [mode, setMode] = useState<"learn" | "freestyle">("learn");
  const [direction, setDirection] = useState<Direction>("targetToSource");
  const [interaction, setInteraction] = useState<
    "passive" | "typing" | "multiple" | "cloze"
  >("passive");
  const [batchSize, setBatchSize] = useState(settings.defaultBatchSize || 20);
  const [randomise, setRandomise] = useState(false);
  const [pool, setPool] = useState<"all" | "seen" | "unseen">("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");

  // Check for a saved session — initialise state directly from localStorage.
  const sessionKey = `polyglot_session_${deckId}`;
  const [savedSession, setSavedSession] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.savedAt && Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000) {
          return parsed;
        }
        localStorage.removeItem(sessionKey);
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  const { data: studyData, isLoading: cardsLoading } = useStudyCards(deckId, {
    mode,
    pool: mode === "freestyle" ? pool : undefined,
    randomise,
    limit: batchSize,
    tag: selectedTag,
  });

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
    // Clear any saved session when starting fresh.
    localStorage.removeItem(sessionKey);
    setSavedSession(null);
  };

  const onComplete = (r: SessionResult) => {
    setResult(r);
    setPhase("complete");
    // Clear saved session on completion.
    localStorage.removeItem(sessionKey);
    setSavedSession(null);
  };

  const clearSession = () => {
    localStorage.removeItem(sessionKey);
    setSavedSession(null);
    toast({ title: "Previous session cleared." });
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
          sourceLanguage={deck.sourceLanguage}
          fields={deck.fields}
          mode={mode}
          setMode={setMode}
          direction={direction}
          setDirection={setDirection}
          interaction={interaction}
          setInteraction={setInteraction}
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          randomise={randomise}
          setRandomise={setRandomise}
          pool={pool}
          setPool={setPool}
          tags={tagsData?.tags || []}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          dueCount={deck.stats?.due || 0}
          totalCards={studyData?.total || 0}
          loading={cardsLoading}
          onStart={startSession}
          savedSession={savedSession}
          onClearSession={clearSession}
        />
      )}

      {phase === "studying" && queue.length > 0 && (
        <StudySession
          deckId={deckId}
          cards={queue}
          index={index}
          setIndex={setIndex}
          interaction={interaction}
          direction={direction}
          fields={deck.fields}
          targetLanguage={deck.targetLanguage}
          sourceLanguage={deck.sourceLanguage}
          contextLanguage={deck.contextLanguage}
          strictAccents={deck.strictAccents}
          strictMode={deck.strictMode}
          latinTyping={deck.latinTyping ?? false}
          romanisationField={deck.romanisationField ?? ""}
          onComplete={onComplete}
          onExit={() => setPhase("setup")}
          ttsEnabled={settings.ttsEnabled}
          ttsRate={settings.ttsRate}
          mode={mode}
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
  sourceLanguage: string;
  fields: BlueprintFieldDef[];
  mode: "learn" | "freestyle";
  setMode: (m: "learn" | "freestyle") => void;
  direction: Direction;
  setDirection: (d: Direction) => void;
  interaction: "passive" | "typing" | "multiple" | "cloze";
  setInteraction: (i: "passive" | "typing" | "multiple" | "cloze") => void;
  batchSize: number;
  setBatchSize: (n: number) => void;
  randomise: boolean;
  setRandomise: (b: boolean) => void;
  pool: "all" | "seen" | "unseen";
  setPool: (p: "all" | "seen" | "unseen") => void;
  tags: string[];
  selectedTag: string | null;
  setSelectedTag: (t: string | null) => void;
  dueCount: number;
  totalCards: number;
  loading: boolean;
  onStart: () => void;
  savedSession: {
    index: number;
    total: number;
    counts: { again: number; hard: number; good: number; easy: number };
    mode: string;
    interaction: string;
    direction: string;
    savedAt: number;
  } | null;
  onClearSession: () => void;
}) {
  const exampleField = props.fields.find((f) => f.fieldType === "example");
  const clozeAvailable = !!exampleField && props.direction === "targetToSource";

  // Auto-fall-back to passive if cloze was selected but became unavailable.
  useEffect(() => {
    if (props.interaction === "cloze" && !clozeAvailable) {
      props.setInteraction("passive");
    }
  }, [clozeAvailable, props]);

  const interactions = [
    { v: "passive", label: "Passive", icon: Eye, desc: "Flip card, rate yourself", always: true },
    { v: "typing", label: "Typing", icon: Keyboard, desc: "Type the answer", always: true },
    { v: "multiple", label: "Multiple", icon: CheckSquare, desc: "Pick from 4 options", always: false },
    { v: "cloze", label: "Cloze", icon: Sparkles, desc: "Fill in the blank", always: false },
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold mb-1">Study</h1>
          <p className="text-secondary">{props.deckName}</p>
        </div>
        <ShortcutsHelp />
      </div>

      {/* Resume session banner */}
      {props.savedSession && (
        <div
          className="mb-4 p-4 rounded-xl flex items-center justify-between gap-3 animate-slide-up"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-glow), color-mix(in srgb, var(--accent-warm) 8%, transparent))",
            border: "1px solid color-mix(in srgb, var(--accent-warm) 25%, transparent)",
          }}
        >
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-[var(--accent-warm)] shrink-0" />
            <div>
              <div className="text-sm font-medium">Previous session in progress</div>
              <div className="text-xs text-muted">
                Card {props.savedSession.index + 1} of {props.savedSession.total} ·{" "}
                {props.savedSession.counts.good + props.savedSession.counts.easy} correct ·{" "}
                {props.savedSession.counts.again} again
              </div>
            </div>
          </div>
          <button
            onClick={props.onClearSession}
            className="text-xs text-muted hover:text-[var(--text-primary)] transition-colors shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

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

        {/* Direction */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Direction</Label>
          <div className="grid grid-cols-2 gap-2">
            <ModeButton
              active={props.direction === "targetToSource"}
              onClick={() => props.setDirection("targetToSource")}
              title={`${props.targetLanguage} → ${props.sourceLanguage}`}
              desc="See target, recall source"
              icon={ArrowRight}
            />
            <ModeButton
              active={props.direction === "sourceToTarget"}
              onClick={() => props.setDirection("sourceToTarget")}
              title={`${props.sourceLanguage} → ${props.targetLanguage}`}
              desc="See source, type target"
              icon={ArrowLeftRight}
            />
          </div>
        </div>

        {/* Interaction */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Interaction</Label>
          <div className="grid grid-cols-2 gap-2">
            {interactions.map((i) => {
              const available = i.always || (i.v === "multiple" ? true : i.v === "cloze" ? clozeAvailable : true);
              return (
                <ModeButton
                  key={i.v}
                  active={props.interaction === i.v}
                  onClick={() => available && props.setInteraction(i.v as typeof props.interaction)}
                  title={i.label}
                  desc={i.desc}
                  icon={i.icon}
                  disabled={!available}
                />
              );
            })}
          </div>
          {!clozeAvailable && (
            <p className="text-xs text-muted mt-1.5">
              Cloze requires an example field and target→source direction.
            </p>
          )}
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

        {/* Tag filter */}
        {props.tags.length > 0 && (
          <div className="space-y-1.5">
            <Label>Filter by tag</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => props.setSelectedTag(null)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs transition-colors",
                  props.selectedTag === null
                    ? "bg-[var(--accent-glow)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
                    : "bg-elevated text-secondary hover:text-[var(--text-primary)] border border-transparent"
                )}
              >
                All tags
              </button>
              {props.tags.map((t) => (
                <button
                  key={t}
                  onClick={() => props.setSelectedTag(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs transition-colors",
                    props.selectedTag === t
                      ? "bg-[var(--accent-glow)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
                      : "bg-elevated text-secondary hover:text-[var(--text-primary)] border border-transparent"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

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
              Start ·{" "}
              {props.mode === "learn" ? props.dueCount : props.totalCards} cards
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
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  icon: typeof Eye;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all",
        disabled && "opacity-40 cursor-not-allowed",
        active
          ? "bg-[var(--accent-glow)] border-[var(--accent-primary)]/40"
          : "bg-elevated border surface-border hover:border-[var(--accent-primary)]/30"
      )}
    >
      <Icon
        className={cn(
          "size-4 mt-0.5 shrink-0",
          active ? "text-[var(--accent-primary)]" : "text-muted"
        )}
      />
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="text-xs text-muted truncate">{desc}</div>
      </div>
    </button>
  );
}

// ============== Session ==============

function getAnswer(
  card: CardData,
  direction: Direction,
  fields: BlueprintFieldDef[],
  latinTyping?: boolean,
  romanisationField?: string
): string {
  if (direction === "targetToSource") {
    // Recall the source-language translation.
    const srcField =
      fields.find((f) => f.key === "source_translation") ||
      fields.find((f) => f.key === "definition") ||
      fields.find((f) => f.key === "reading") ||
      fields[0];
    const raw = srcField ? card.fields[srcField.key] : null;
    return raw ? fieldValueToAnnotated(raw)?.text || "" : card.word;
  }
  // sourceToTarget — recall the target-language word.
  if (latinTyping && romanisationField) {
    const romVal = card.fields[romanisationField];
    const romText = fieldValueToAnnotated(romVal)?.text;
    if (romText) return romText;
  }
  return card.word;
}

function StudySession(props: {
  deckId: string;
  cards: CardData[];
  index: number;
  setIndex: (i: number | ((p: number) => number)) => void;
  interaction: "passive" | "typing" | "multiple" | "cloze";
  direction: Direction;
  fields: BlueprintFieldDef[];
  targetLanguage: string;
  sourceLanguage: string;
  contextLanguage: string;
  strictAccents: boolean;
  strictMode: boolean;
  latinTyping: boolean;
  romanisationField: string;
  onComplete: (r: SessionResult) => void;
  onExit: () => void;
  ttsEnabled: boolean;
  ttsRate: number;
  mode: "learn" | "freestyle";
}) {
  const reviewMut = useReviewCard(props.deckId);
  const { setView } = useUi();
  const card = props.cards[props.index];
  const [flipped, setFlipped] = useState(false);
  const [typingAnswer, setTypingAnswer] = useState("");
  const [clozeAnswer, setClozeAnswer] = useState("");
  const [lastResult, setLastResult] = useState<{
    correct: boolean;
    similarity: number;
    exact: boolean;
    answer: string;
    typed: string;
  } | null>(null);
  const [choices, setChoices] = useState<CardData[]>([]);
  const [counts, setCounts] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const startTimeRef = useRef(Date.now());
  const typingInputRef = useRef<HTMLInputElement>(null);
  const clozeInputRef = useRef<HTMLInputElement>(null);

  const exampleField = useMemo(
    () => props.fields.find((f) => f.fieldType === "example"),
    [props.fields]
  );

  // Cloze data for the current card — memoise the chosen sentence once per card
  // so the input width and the grading use the SAME sentence (fixes the
  // multi-sentence inconsistency from the original repo).
  const clozeData = useMemo(() => {
    if (props.interaction !== "cloze" || !exampleField || !card) return null;
    const fieldVal = card.fields[exampleField.key];
    const ann = fieldValueToAnnotated(fieldVal);
    const raw = ann?.text || (typeof fieldVal === "string" ? fieldVal : "");
    if (!raw) return null;
    const sentence = pickRandomExample(raw);
    return parseCloze(sentence);
  }, [props.index, props.interaction, exampleField, card]);

  // Reset state when the card changes.
  useEffect(() => {
    setFlipped(false);
    setTypingAnswer("");
    setClozeAnswer("");
    setLastResult(null);
    startTimeRef.current = Date.now();
    if (props.interaction === "multiple") {
      const others = props.cards.filter((c) => c.id !== card.id);
      const shuffled = [...others]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      setChoices([...shuffled, card].sort(() => Math.random() - 0.5));
    }
    // Auto-speak the target word on new card (passive mode)
    if (props.ttsEnabled && props.interaction === "passive" && props.direction === "targetToSource") {
      const word = card.word;
      setTimeout(
        () =>
          speak(word, {
            lang: getLanguageBcp47(props.targetLanguage),
            rate: props.ttsRate,
          }),
        200
      );
    }
  }, [props.index]);

  // Auto-focus the relevant input on a new card.
  useEffect(() => {
    if (flipped) return;
    const t = setTimeout(() => {
      if (props.interaction === "typing") typingInputRef.current?.focus();
      else if (props.interaction === "cloze") clozeInputRef.current?.focus();
    }, 80);
    return () => clearTimeout(t);
  }, [props.index, props.interaction, flipped]);

  const reveal = (result: {
    correct: boolean;
    similarity: number;
    exact: boolean;
    answer: string;
    typed: string;
  }) => {
    setLastResult(result);
    setFlipped(true);
    // Auto-rate in learn mode for active interactions.
    if (props.mode === "learn" && props.interaction !== "passive") {
      const rating: Rating = result.correct ? 3 : 1;
      reviewMut.mutate({
        cardId: card.id,
        rating,
        timeSpentMs: Date.now() - startTimeRef.current,
      });
      setCounts((p) => ({
        ...p,
        again: p.again + (rating === 1 ? 1 : 0),
        good: p.good + (rating === 3 ? 1 : 0),
      }));
    }
  };

  const submitTyping = () => {
    if (!card) return;
    const expected = getAnswer(card, props.direction, props.fields, props.latinTyping, props.romanisationField);
    const g = gradeAnswer(
      expected,
      typingAnswer,
      props.strictMode,
      props.strictAccents
    );
    reveal({
      ...g,
      answer: expected,
      typed: typingAnswer,
    });
  };

  const submitCloze = () => {
    if (!card || !clozeData?.hasCloze) return;
    const g = gradeAnswer(
      clozeData.answer,
      clozeAnswer,
      props.strictMode,
      props.strictAccents
    );
    reveal({
      ...g,
      answer: clozeData.answer,
      typed: clozeAnswer,
    });
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
    reviewMut.mutate({
      cardId: card.id,
      rating,
      timeSpentMs: Date.now() - startTimeRef.current,
    });
    setCounts((p) => ({
      again: p.again + (rating === 1 ? 1 : 0),
      hard: p.hard + (rating === 2 ? 1 : 0),
      good: p.good + (rating === 3 ? 1 : 0),
      easy: p.easy + (rating === 4 ? 1 : 0),
    }));
    next();
  };

  // Keyboard shortcuts — skip when focused in an input/textarea/select.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
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
      } else if (e.key === "s" || e.key === "S") {
        // Skip card
        e.preventDefault();
        next();
      } else if ((e.key === "p" || e.key === "P" || e.key === "ArrowLeft") && props.index > 0) {
        // Previous card
        e.preventDefault();
        props.setIndex((i) => Math.max(0, i - 1));
      } else if ((e.key === "ArrowRight") && props.index < props.cards.length - 1) {
        // Next card (skip)
        e.preventDefault();
        props.setIndex((i) => Math.min(props.cards.length - 1, i + 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, props.interaction, props.index]);

  if (!card) return null;

  const progress = ((props.index + 1) / props.cards.length) * 100;
  const isTargetFront = props.direction === "targetToSource";

  // Front content for the card.
  const frontWord = isTargetFront
    ? card.word
    : getAnswer(card, "targetToSource", props.fields) || card.word;
  const frontLabel = isTargetFront
    ? props.targetLanguage
    : props.sourceLanguage;

  // Context chip / cloze preview for target→source front.
  const contextVal =
    typeof card.fields.context === "string" ? card.fields.context : "";
  let clozePreview: { before: string; after: string; answer: string } | null = null;
  if (isTargetFront && props.contextLanguage === "cloze" && exampleField) {
    const fieldVal = card.fields[exampleField.key];
    const ann = fieldValueToAnnotated(fieldVal);
    const raw = ann?.text || (typeof fieldVal === "string" ? fieldVal : "");
    if (raw) {
      const parsed = parseCloze(pickRandomExample(raw));
      if (parsed.hasCloze)
        clozePreview = {
          before: parsed.before,
          after: parsed.after,
          answer: parsed.answer,
        };
    }
  }

  const frontShowField = props.fields.find(
    (f) => f.showOnFront && f.key !== "context"
  );

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={props.onExit}
          className="text-muted hover:text-[var(--accent-danger)] p-1"
          aria-label="Exit session"
        >
          <X className="size-5" />
        </button>
        <div className="flex-1 progress-track h-1.5">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => props.setIndex((i) => Math.max(0, i - 1))}
            disabled={props.index === 0}
            className="text-muted hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed p-1 rounded transition-colors"
            aria-label="Previous card"
            title="Previous card"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs text-muted font-mono whitespace-nowrap">
            {props.index + 1} / {props.cards.length}
          </span>
          <button
            onClick={() =>
              props.setIndex((i) => Math.min(props.cards.length - 1, i + 1))
            }
            disabled={props.index === props.cards.length - 1}
            className="text-muted hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed p-1 rounded transition-colors"
            aria-label="Next card"
            title="Next card (skip)"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Live session stats */}
      {(counts.again > 0 || counts.good > 0 || counts.easy > 0) && (
        <div className="flex items-center justify-center gap-3 mb-3 text-xs">
          <span className="flex items-center gap-1 text-[var(--accent-secondary)]">
            <Check className="size-3" /> {counts.good + counts.easy}
          </span>
          {counts.hard > 0 && (
            <span className="text-[var(--accent-warm)]">Hard: {counts.hard}</span>
          )}
          {counts.again > 0 && (
            <span className="text-[var(--accent-danger)]">Again: {counts.again}</span>
          )}
        </div>
      )}

      {/* Mode badge */}
      <div className="flex justify-center mb-4 gap-2">
        <span className="pc-tag capitalize">
          {props.interaction === "multiple" ? "Multiple choice" : props.interaction}
        </span>
        <span className="pc-tag">
          {isTargetFront ? props.targetLanguage : props.sourceLanguage}
        </span>
      </div>

      {/* 3D flip card */}
      <div
        className="card-3d w-full max-w-lg mx-auto"
        style={{ height: 300 }}
      >
        <div
          className={cn("card-inner", flipped && "flipped")}
          onClick={() =>
            props.interaction === "passive" && !flipped ? setFlipped(true) : undefined
          }
          style={{ cursor: props.interaction === "passive" && !flipped ? "pointer" : "default" }}
        >
          {/* FRONT */}
          <div className="card-face pc-card-elevated rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="section-title mb-3">{frontLabel}</div>
            <div
              className={cn(
                "text-5xl font-display font-semibold leading-tight",
                containsCJK(frontWord) && "font-cjk"
              )}
            >
              {frontWord}
            </div>

            {/* Cloze preview on the front (target→source, context_language='cloze') */}
            {isTargetFront && clozePreview && (
              <div className="mt-3 px-3 py-2 rounded-lg w-full bg-surface border surface-border">
                <div className={cn("text-sm leading-relaxed text-secondary", containsCJK(clozePreview.before + clozePreview.after) && "font-cjk")}>
                  {clozePreview.before}
                  <span className="px-1.5 rounded font-medium bg-elevated text-muted">
                    ___
                  </span>
                  {clozePreview.after}
                </div>
              </div>
            )}

            {/* Context chip (target→source, context_language='target') */}
            {isTargetFront && contextVal && !clozePreview && (
              <div className="mt-3 px-3 py-1.5 rounded-lg bg-[var(--accent-glow)] border border-[var(--accent-primary)]/20">
                <div className={cn("text-sm font-medium text-[var(--accent-primary)]", containsCJK(contextVal) && "font-cjk")}>
                  {contextVal}
                </div>
              </div>
            )}

            {/* Show-on-front field (e.g. reading/phonetic) */}
            {isTargetFront && frontShowField && card.fields[frontShowField.key] && (
              <div className="mt-3 text-base text-secondary">
                <RubyText
                  value={card.fields[frontShowField.key]}
                  phonetics={frontShowField.phonetics}
                />
              </div>
            )}

            {!flipped && props.interaction === "passive" && (
              <div className="absolute bottom-4 text-xs text-muted">
                tap to reveal · Space
              </div>
            )}
            {props.ttsEnabled && isTtsSupported() && isTargetFront && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speak(card.word, {
                    lang: getLanguageBcp47(props.targetLanguage),
                    rate: props.ttsRate,
                  });
                }}
                className="absolute top-4 right-4 text-muted hover:text-[var(--accent-primary)] p-1"
                aria-label="Pronounce word"
              >
                <Volume2 className="size-4" />
              </button>
            )}
          </div>

          {/* BACK */}
          <div className="card-face card-back pc-card-elevated rounded-2xl p-5 flex flex-col overflow-y-auto scrollbar-thin relative">
            {/* Edit card button */}
            <button
              onClick={() => setView({ name: "deck", deckId: props.deckId })}
              className="absolute top-3 right-3 text-muted hover:text-[var(--accent-primary)] p-1 rounded transition-colors z-10"
              aria-label="Edit this card"
              title="Edit card"
            >
              <Edit className="size-3.5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
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
              {card.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-1">
                  {card.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="pc-tag !text-[0.6rem] !py-0 !bg-[var(--accent-glow)] !text-[var(--accent-primary)] !border-transparent"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {lastResult && props.interaction !== "passive" && (
                <span
                  className={cn(
                    "ml-auto text-xs font-semibold px-2 py-0.5 rounded-full",
                    lastResult.correct
                      ? "bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)]"
                      : "bg-[var(--accent-danger)]/15 text-[var(--accent-danger)]"
                  )}
                >
                  {lastResult.correct
                    ? `✓ ${Math.round(lastResult.similarity * 100)}%`
                    : "✗"}
                </span>
              )}
            </div>

            {/* Result detail for typing/cloze */}
            {lastResult && (props.interaction === "typing" || props.interaction === "cloze") && (
              <div className="text-sm text-center mb-3 space-y-1">
                {lastResult.correct ? (
                  <div className="font-medium text-[var(--accent-secondary)]">
                    ✓ Correct!
                    {lastResult.similarity < 1 &&
                      ` (${Math.round(lastResult.similarity * 100)}%)`}
                  </div>
                ) : (
                  <>
                    <div className="text-[var(--accent-danger)]">
                      <span className="font-medium">✗ You typed: </span>
                      <span className="font-mono">{lastResult.typed || "—"}</span>
                    </div>
                    <div className="text-muted">
                      <span>Correct: </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {lastResult.answer}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* All fields list */}
            <div className="space-y-2 flex-1 overflow-y-auto scrollbar-thin">
              {props.fields
                .filter((f) => f.key !== "context")
                .map((field) => {
                  const value = card.fields[field.key];
                  if (!value) return null;
                  const ann = fieldValueToAnnotated(value);
                  const text = ann?.text || (typeof value === "string" ? value : "");
                  if (!text) return null;
                  return (
                    <div key={field.key} className="flex gap-2 min-w-0">
                      <span
                        className="section-title shrink-0 mt-0.5"
                        style={{ width: 90 }}
                      >
                        {field.label}
                      </span>
                      <div
                        className={cn(
                          "flex-1 min-w-0 text-sm",
                          containsCJK(text) && "font-cjk"
                        )}
                      >
                        {field.fieldType === "example" ? (
                          <ExampleDisplay value={value} />
                        ) : (
                          <RubyText
                            value={value}
                            phonetics={field.phonetics}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Interaction area below the card */}
      <div className="mt-6">
        {/* Typing input (shows before flip) */}
        {!flipped && props.interaction === "typing" && (
          <div className="pc-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="section-title">
                {props.latinTyping && props.romanisationField && !isTargetFront
                  ? `Type in Latin script (${props.romanisationField})`
                  : `Type the ${
                      isTargetFront
                        ? props.sourceLanguage
                        : props.targetLanguage
                    } answer`}
              </div>
              {props.latinTyping && props.romanisationField && !isTargetFront && (
                <span className="pc-tag !bg-[var(--accent-glow)] !text-[var(--accent-primary)] !border-transparent">
                  Romanisation mode
                </span>
              )}
            </div>
            <Input
              ref={typingInputRef}
              value={typingAnswer}
              onChange={(e) => setTypingAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitTyping()}
              placeholder="Your answer..."
              className={cn("bg-elevated border surface-border h-11 text-base", containsCJK(typingAnswer) && "font-cjk")}
            />
            <Button className="btn-primary w-full h-10 mt-3 gap-2" onClick={submitTyping}>
              <Check className="size-4" /> Check
            </Button>
          </div>
        )}

        {/* Cloze: inline input within the sentence (the key feature) */}
        {!flipped && props.interaction === "cloze" && clozeData?.hasCloze && (
          <div className="pc-card p-5">
            {/* Hint: show the source translation + context */}
            {(() => {
              const hintField =
                props.fields.find((f) => f.key === "source_translation") ||
                props.fields.find((f) => f.key === "definition") ||
                props.fields.find((f) => f.key === "reading");
              const hint = hintField
                ? fieldValueToAnnotated(card.fields[hintField.key])?.text
                : null;
              const ctx =
                typeof card.fields.context === "string"
                  ? card.fields.context
                  : "";
              return hint ? (
                <div className="flex items-center justify-between mb-3">
                  <div className="section-title">{props.sourceLanguage}</div>
                  <div className="text-right">
                    <div className={cn("text-base font-medium", containsCJK(hint) && "font-cjk")}>
                      {hint}
                    </div>
                    {ctx && (
                      <div className="text-xs text-muted mt-0.5">{ctx}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="section-title mb-3">Complete the sentence</div>
              );
            })()}
            {/* The sentence with the inline input where the blank is */}
            <div
              className={cn(
                "text-center leading-loose mb-4",
                containsCJK(clozeData.before + clozeData.after) && "font-cjk"
              )}
              style={{ fontSize: 18 }}
            >
              {clozeData.before}
              <input
                ref={clozeInputRef}
                className="cloze-input"
                style={{
                  width: `${Math.max((clozeData.answer?.length || 4) + 2, 4) * 0.95}em`,
                }}
                value={clozeAnswer}
                onChange={(e) => setClozeAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCloze()}
              />
              {clozeData.after}
            </div>
            <Button className="btn-primary w-full h-10 gap-2" onClick={submitCloze}>
              <Check className="size-4" /> Check
            </Button>
          </div>
        )}

        {/* Multiple choice */}
        {!flipped && props.interaction === "multiple" && (
          <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
            {choices.map((c, i) => (
              <button
                key={c.id}
                onClick={() => {
                  const correct = c.id === card.id;
                  setTypingAnswer(c.word);
                  reveal({
                    correct,
                    similarity: correct ? 1 : 0,
                    exact: correct,
                    answer: card.word,
                    typed: c.word,
                  });
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

        {/* Rating buttons (passive after flip, or continue for active modes) */}
        {flipped && props.interaction === "passive" && (
          <RatingButtons card={card} onRate={rate} />
        )}
        {flipped && props.interaction !== "passive" && (
          <div className="text-center">
            <Button
              className="btn-primary h-11 px-8 gap-2"
              onClick={next}
            >
              Continue · Space
            </Button>
          </div>
        )}

        {/* Passive reveal hint */}
        {!flipped && props.interaction === "passive" && (
          <div className="text-center text-sm text-muted">
            Press Space or tap the card to reveal the answer
          </div>
        )}
      </div>
    </div>
  );
}

// Render an example field value, highlighting the cloze word.
function ExampleDisplay({ value }: { value: unknown }) {
  const ann = fieldValueToAnnotated(value);
  const raw = ann?.text || (typeof value === "string" ? value : "");
  if (!raw) return null;
  // Pick one sentence (stable per render — caller re-renders on card change).
  const sentence = pickRandomExample(raw);
  const parsed = parseCloze(sentence);
  return (
    <span>
      {parsed.hasCloze ? (
        <>
          {parsed.before}
          <mark
            className="px-1 rounded"
            style={{
              background: "rgba(124,106,240,0.2)",
              color: "var(--accent-primary)",
              borderRadius: 3,
              padding: "0 3px",
            }}
          >
            {parsed.answer}
          </mark>
          {parsed.after}
        </>
      ) : (
        sentence
      )}
    </span>
  );
}

function RatingButtons({
  card,
  onRate,
}: {
  card: CardData;
  onRate: (r: Rating) => void;
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
      <div className="text-5xl mb-4">
        {correctPct >= 80 ? "🎉" : correctPct >= 50 ? "👍" : "💪"}
      </div>
      <h2 className="font-display text-3xl font-semibold mb-1">
        Session Complete
      </h2>
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
        <div className="progress-fill" style={{ width: `${correctPct}%` }} />
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

// Keyboard shortcuts help overlay — press ? or click the help button.
function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const shortcuts = [
    { keys: "Space / Enter", action: "Flip card / submit answer / continue" },
    { keys: "1 2 3 4", action: "Grade Again / Hard / Good / Easy (passive)" },
    { keys: "S", action: "Skip to next card" },
    { keys: "P / ←", action: "Go to previous card" },
    { keys: "→", action: "Go to next card (skip)" },
    { keys: "Enter", action: "Submit typing or cloze answer" },
    { keys: "Escape", action: "Exit session" },
    { keys: "?", action: "Toggle this shortcuts overlay" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary h-9 w-9 flex items-center justify-center"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (press ?)"
      >
        <HelpCircle className="size-4" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="pc-card-elevated p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                <Keyboard className="size-5 text-[var(--accent-primary)]" />
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-[var(--text-primary)] p-1"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2">
              {shortcuts.map((s) => (
                <div
                  key={s.keys}
                  className="flex items-center justify-between gap-4 py-2 border-b subtle-border last:border-0"
                >
                  <span className="text-sm text-secondary">{s.action}</span>
                  <kbd className="font-mono text-xs px-2 py-1 rounded bg-elevated border surface-border text-[var(--text-primary)] whitespace-nowrap">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-4 text-center">
              Shortcuts are disabled while typing in an input field.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
