"use client";

import { useState } from "react";
import { useCreateCard } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { BlueprintFieldDef, CardFields } from "@/lib/types";
import { getAnnotationKeys, isCJK } from "@/lib/ruby";
import { cn } from "@/lib/utils";

// Frictionless quick-add card form — always visible at the top of the
// collection. Type the word, hit Enter, the card is added instantly and the
// form clears. Optionally expand to fill in blueprint fields.
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
      setWord("");
      setFieldValues({});
      setTags([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      if (!expanded) {
        // Keep focus on the word input for rapid entry.
        const el = document.getElementById("quickadd-word");
        el?.focus();
      }
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
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted">Word *</Label>
          <Input
            id="quickadd-word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !expanded) {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="New word..."
            className={cn(
              "bg-elevated border surface-border h-9",
              isCJK(word) && "font-cjk"
            )}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted">Translation</Label>
          <Input
            value={fieldValues.source_translation || ""}
            onChange={(e) => setField("source_translation", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !expanded) {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="English meaning..."
            className="bg-elevated border surface-border h-9"
          />
        </div>
        <Button
          className="btn-primary h-9 gap-2"
          onClick={handleSave}
          disabled={createMut.isPending || !word.trim()}
        >
          {createMut.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {saved ? "Added!" : "Add"}
        </Button>
      </div>

      {/* Context row (always visible, frictionless) */}
      <div className="mt-2">
        <Input
          value={fieldValues.context || ""}
          onChange={(e) => setField("context", e.target.value)}
          placeholder="Context — e.g. (masculine), (verb, informal)..."
          className="bg-elevated border surface-border h-8 text-sm"
        />
      </div>

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
                          <code className="font-mono">{"{{word}}"}</code> for cloze
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
                      <Input
                        value={fieldValues[field.key] || ""}
                        onChange={(e) => setField(field.key, e.target.value)}
                        placeholder={field.description || field.label}
                        className={cn(
                          "bg-elevated border surface-border h-8 text-sm",
                          isCJK(fieldValues[field.key] || "") && "font-cjk"
                        )}
                      />
                    )}
                    {annKeys.length > 0 && (
                      <div className="pl-2 border-l-2 border-[var(--accent-primary)]/30 space-y-1">
                        {annKeys.map((ak) => (
                          <Input
                            key={ak}
                            value={fieldValues[`${field.key}__${ak}`] || ""}
                            onChange={(e) =>
                              setField(`${field.key}__${ak}`, e.target.value)
                            }
                            placeholder={ak}
                            className={cn(
                              "bg-elevated border surface-border h-7 text-xs",
                              ak === "ipa" && "font-mono"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Tags input in expanded mode */}
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
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add tag, press Enter..."
                  className="bg-elevated border surface-border h-7 text-xs"
                />
              </div>
            </div>
          )}
        </>
      )}
      <p className="text-[0.7rem] text-muted mt-2">
        Press <kbd className="font-mono text-[0.65rem] px-1 py-0.5 rounded bg-elevated">Enter</kbd>{" "}
        in the word or translation field to add instantly.
      </p>
    </div>
  );
}
