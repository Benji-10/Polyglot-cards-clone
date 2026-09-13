"use client";

import { useState, useRef, useEffect } from "react";
import { useCreateCard } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { BlueprintFieldDef, CardFields } from "@/lib/types";
import { getAnnotationKeys, isCJK } from "@/lib/ruby";
import { cn } from "@/lib/utils";

// Frictionless quick-add card form. Type a word, press Tab to translation,
// press Enter to add instantly. The cursor jumps back to the word field
// so you can add the next card without clicking anything.
export function QuickAddCard({
  deckId,
  fields,
}: {
  deckId: string;
  fields: BlueprintFieldDef[];
}) {
  const createMut = useCreateCard();
  const { toast } = useToast();
  const [word, setWord] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const wordRef = useRef<HTMLInputElement>(null);

  const setField = (k: string, v: string) =>
    setFieldValues((p) => ({ ...p, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const buildFields = (): CardFields => {
    const out: CardFields = {};
    for (const f of fields) {
      const text = (fieldValues[f.key] || "").trim();
      if (!text) continue;
      const annKeys = getAnnotationKeys(f.phonetics);
      const isStructured = annKeys.length > 0 || f.fieldType === "example";
      if (!isStructured) {
        out[f.key] = text;
      } else {
        const annotations: Record<string, string> = {};
        for (const ak of annKeys) {
          const v = (fieldValues[`${f.key}__${ak}`] || "").trim();
          if (v) annotations[ak] = v;
        }
        if (f.fieldType === "example") {
          const lines = text
            .split(/\s*;;;\s*/)
            .map((s) => s.trim())
            .filter(Boolean);
          out[f.key] = lines.map((line) => ({ text: line, annotations }));
        } else {
          out[f.key] = [{ text, annotations }];
        }
      }
    }
    return out;
  };

  const handleSave = async () => {
    if (!word.trim()) {
      toast({ title: "Word is required", variant: "destructive" });
      return;
    }
    try {
      await createMut.mutateAsync({
        deckId,
        word: word.trim(),
        fields: buildFields(),
        tags,
      });
      // Show what was added briefly.
      setJustAdded(word.trim());
      // Clear all fields for the next card.
      setWord("");
      setFieldValues({});
      setTags([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      setTimeout(() => setJustAdded(null), 2000);
      // Refocus the word input for instant next-card entry.
      setTimeout(() => wordRef.current?.focus(), 0);
    } catch (e) {
      toast({
        title: "Failed to add card",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  // Only show fields that aren't already covered by the word/translation/context
  // quick row. The translation + context are always shown inline at the top.
  const extraFields = fields.filter(
    (f) => f.key !== "source_translation" && f.key !== "context"
  );

  return (
    <div className="pc-card-elevated rounded-xl p-4 mb-4">
      {/* Just-added confirmation */}
      {justAdded && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] text-sm flex items-center gap-2 animate-fade-in">
          <Check className="size-4" />
          Added "{justAdded}" — type the next word ↓
        </div>
      )}

      {/* Main row: word + translation + add button */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
        <div className="relative">
          <input
            ref={wordRef}
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !expanded) {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="Word..."
            className={cn(
              "w-full bg-elevated border surface-border h-10 rounded-md px-3 text-sm outline-none focus:border-[var(--accent-primary)] transition-colors",
              isCJK(word) && "font-cjk"
            )}
            autoFocus
          />
        </div>
        <input
          value={fieldValues.source_translation || ""}
          onChange={(e) => setField("source_translation", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !expanded) {
              e.preventDefault();
              handleSave();
            }
          }}
          placeholder="Translation..."
          className="w-full bg-elevated border surface-border h-10 rounded-md px-3 text-sm outline-none focus:border-[var(--accent-primary)] transition-colors"
        />
        <Button
          className="btn-primary h-10 gap-2 shrink-0"
          onClick={handleSave}
          disabled={createMut.isPending || !word.trim()}
        >
          {createMut.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : (
            <span className="text-xs font-medium">Add</span>
          )}
        </Button>
      </div>

      {/* Context row (always visible) */}
      <input
        value={fieldValues.context || ""}
        onChange={(e) => setField("context", e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !expanded) {
            e.preventDefault();
            handleSave();
          }
        }}
        placeholder="Context (optional) — e.g. (masculine), (verb)..."
        className="w-full mt-2 bg-elevated border surface-border h-8 rounded-md px-3 text-sm outline-none focus:border-[var(--accent-primary)] transition-colors"
      />

      {/* Expand for all blueprint fields */}
      {extraFields.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline mt-3"
          >
            {expanded ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
            {expanded ? "Hide extra fields" : `+ ${extraFields.length} more fields`}
          </button>
          {expanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 animate-fade-in">
              {extraFields.map((field) => {
                const annKeys = getAnnotationKeys(field.phonetics);
                return (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      {field.label}
                      {field.fieldType === "example" && (
                        <span className="text-[0.65rem] text-muted font-normal">
                          use <code className="font-mono">{"{{word}}"}</code> for cloze
                        </span>
                      )}
                    </Label>
                    {field.fieldType === "example" ? (
                      <Textarea
                        value={fieldValues[field.key] || ""}
                        onChange={(e) => setField(field.key, e.target.value)}
                        placeholder="Sentence with {{word}}..."
                        className={cn(
                          "bg-elevated border surface-border min-h-[44px] text-sm resize-none",
                          isCJK(fieldValues[field.key] || "") && "font-cjk"
                        )}
                      />
                    ) : (
                      <input
                        value={fieldValues[field.key] || ""}
                        onChange={(e) => setField(field.key, e.target.value)}
                        placeholder={field.description || field.label}
                        className={cn(
                          "w-full bg-elevated border surface-border h-8 rounded-md px-3 text-sm outline-none focus:border-[var(--accent-primary)] transition-colors",
                          isCJK(fieldValues[field.key] || "") && "font-cjk"
                        )}
                      />
                    )}
                    {annKeys.length > 0 && (
                      <div className="pl-2 border-l-2 border-[var(--accent-primary)]/30 space-y-1">
                        {annKeys.map((ak) => (
                          <input
                            key={ak}
                            value={fieldValues[`${field.key}__${ak}`] || ""}
                            onChange={(e) =>
                              setField(`${field.key}__${ak}`, e.target.value)
                            }
                            placeholder={ak}
                            className={cn(
                              "w-full bg-elevated border surface-border h-7 text-xs rounded-md px-2 outline-none focus:border-[var(--accent-primary)] transition-colors",
                              ak === "ipa" && "font-mono"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Tags input */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Tags</Label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="pc-tag !text-[0.65rem] !py-0 !bg-[var(--accent-glow)] !text-[var(--accent-primary)] !border-transparent cursor-pointer group"
                      onClick={() => removeTag(t)}
                    >
                      {t}
                      <span className="ml-0.5 opacity-50 group-hover:opacity-100">×</span>
                    </span>
                  ))}
                </div>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add tag, press Enter..."
                  className="w-full bg-elevated border surface-border h-7 text-xs rounded-md px-2 outline-none focus:border-[var(--accent-primary)] transition-colors"
                />
              </div>
            </div>
          )}
        </>
      )}
      <p className="text-[0.7rem] text-muted mt-2">
        Press{" "}
        <kbd className="font-mono text-[0.65rem] px-1 py-0.5 rounded bg-elevated">
          Enter
        </kbd>{" "}
        to add instantly, then type the next word.
      </p>
    </div>
  );
}
