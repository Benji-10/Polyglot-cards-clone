"use client";

import { useState, useRef, useEffect } from "react";
import { useCreateCard, useUpdateCard, useEnhanceCard } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2, Check, Sparkles } from "lucide-react";
import type {
  BlueprintFieldDef,
  CardData,
  CardFields,
  AnnotatedText,
} from "@/lib/types";
import { getAnnotationKeys, isCJK } from "@/lib/ruby";
import { cn } from "@/lib/utils";

interface CardFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  deckId: string;
  fields: BlueprintFieldDef[];
  card?: CardData | null;
}

export function CardFormDialog({
  open,
  onOpenChange,
  deckId,
  fields,
  card,
}: CardFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border surface-border max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <CardFormBody
          key={card?.id || "new"}
          deckId={deckId}
          fields={fields}
          card={card ?? null}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CardFormBody({
  deckId,
  fields,
  card,
  onDone,
}: {
  deckId: string;
  fields: BlueprintFieldDef[];
  card: CardData | null;
  onDone: () => void;
}) {
  const isEdit = !!card;
  const createMut = useCreateCard();
  const updateMut = useUpdateCard(deckId);
  const enhanceMut = useEnhanceCard(deckId);
  const { toast } = useToast();

  const [word, setWord] = useState(card?.word ?? "");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(
    () => initialFieldValues(card?.fields ?? {})
  );
  const [tags, setTags] = useState<string[]>(card?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [saved, setSaved] = useState(false);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  // Build the structured fields object matching the real app's shapes:
  //  - plain text → string
  //  - annotated text → [{ text, annotations }]
  //  - example → [{ text, annotations }, ...] (one per " ;;; " sentence)
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

  const handleSubmit = async () => {
    if (!word.trim()) {
      toast({ title: "Word is required", variant: "destructive" });
      return;
    }
    try {
      const cleanFields = buildFields();
      if (isEdit && card) {
        await updateMut.mutateAsync({
          id: card.id,
          word: word.trim(),
          fields: cleanFields,
          tags,
        });
        toast({ title: "Card updated." });
      } else {
        await createMut.mutateAsync({
          deckId,
          word: word.trim(),
          fields: cleanFields,
          tags,
        });
        toast({ title: "Card added!" });
      }
      onDone();
    } catch (e) {
      toast({
        title: "Failed to save card",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleEnhance = async () => {
    if (!card) {
      toast({ title: "Save the card first before enhancing", variant: "destructive" });
      return;
    }
    if (!word.trim()) {
      toast({ title: "Word is required for AI enhancement", variant: "destructive" });
      return;
    }
    try {
      const result = await enhanceMut.mutateAsync({ id: card.id });
      // Update the form with the enhanced fields
      setFieldValues(initialFieldValues(result.fields));
      toast({ title: "Card enhanced with AI! ✨" });
    } catch (e) {
      toast({
        title: "AI enhancement failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-xl">
          {isEdit ? "Edit Card" : "Add Card"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-3">
        {/* Word (primary) + AI Enhance */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>Word / Phrase *</Label>
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Enter the target language word"
              className={cn(
                "bg-elevated border surface-border",
                isCJK(word) && "font-cjk"
              )}
              autoFocus
            />
          </div>
          {isEdit && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleEnhance}
              disabled={enhanceMut.isPending}
              className="btn-secondary h-9 gap-1.5 shrink-0"
              title="AI-enhance this card's content"
            >
              {enhanceMut.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5 text-[var(--accent-primary)]" />
              )}
              AI Enhance
            </Button>
          )}
        </div>

        <Separator className="bg-[var(--border-subtle)]" />

        {/* Blueprint fields */}
        {fields.map((field) => (
          <FieldEditor
            key={field.key}
            field={field}
            values={fieldValues}
            onChange={(k, v) =>
              setFieldValues((prev) => ({ ...prev, [k]: v }))
            }
          />
        ))}

        {/* Tags */}
        <div className="space-y-1.5">
          <Label className="text-sm">Tags</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span
                key={t}
                className="pc-tag !bg-[var(--accent-glow)] !text-[var(--accent-primary)] !border-transparent cursor-pointer group"
                onClick={() => removeTag(t)}
                title="Click to remove"
              >
                {t}
                <span className="ml-1 opacity-50 group-hover:opacity-100">×</span>
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
            placeholder="Add a tag and press Enter..."
            className="bg-elevated border surface-border h-9 text-sm"
          />
          <p className="text-xs text-muted">
            Press Enter or comma to add. Click a tag to remove it.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onDone} className="btn-ghost">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createMut.isPending || updateMut.isPending}
            className="btn-primary"
          >
            {(createMut.isPending || updateMut.isPending) ? (
              <Loader2 className="size-4 mr-1 animate-spin" />
            ) : saved ? (
              <Check className="size-4 mr-1" />
            ) : null}
            {isEdit ? "Save Changes" : "Add Card"}
          </Button>
        </div>
      </div>
    </>
  );
}

function FieldEditor({
  field,
  values,
  onChange,
}: {
  field: BlueprintFieldDef;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const annKeys = getAnnotationKeys(field.phonetics);
  const hasAnnotations = annKeys.length > 0;
  const text = values[field.key] || "";

  return (
    <div className="space-y-1.5">
      <Label className="text-sm flex items-center gap-1.5">
        {field.label}
        {field.showOnFront && (
          <span className="pc-tag !text-[0.6rem] !py-0">front</span>
        )}
        {field.fieldType === "example" && (
          <span className="text-[0.7rem] text-muted font-normal">
            — use <code className="font-mono">{"{{word}}"}</code> to mark cloze
          </span>
        )}
      </Label>
      {!field.description?.startsWith("AI hint") && (
        <p className="text-xs text-muted">{field.description}</p>
      )}
      {field.fieldType === "example" ? (
        <Textarea
          value={text}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder="e.g. She {{loves}} him. ;;; Their {{love}} is eternal."
          className={cn(
            "bg-elevated border surface-border min-h-[60px] text-sm resize-none",
            isCJK(text) && "font-cjk"
          )}
        />
      ) : (
        <Input
          value={text}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.description || field.label}
          className={cn(
            "bg-elevated border surface-border text-sm",
            isCJK(text) && "font-cjk"
          )}
        />
      )}
      {hasAnnotations && (
        <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-[var(--accent-primary)]/30">
          {annKeys.map((ak) => (
            <div key={ak} className="space-y-1">
              <Label className="text-[0.7rem] text-muted uppercase tracking-wide">
                {ak}
              </Label>
              <Input
                value={values[`${field.key}__${ak}`] || ""}
                onChange={(e) =>
                  onChange(`${field.key}__${ak}`, e.target.value)
                }
                placeholder={ak}
                className={cn(
                  "bg-elevated border surface-border h-8 text-xs",
                  ak === "ipa" && "font-mono"
                )}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Flatten stored field values into simple string inputs for the form.
function initialFieldValues(fields: CardFields): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(fields)) {
    if (typeof val === "string") {
      out[key] = val;
    } else if (Array.isArray(val)) {
      // Join example sentences with " ;;; " or extract single annotated text.
      out[key] = val
        .map((v) => (typeof v === "string" ? v : v?.text || ""))
        .join(" ;;; ");
      // Also extract annotation values for each known key.
      const first = val[0];
      if (first && typeof first === "object" && first.annotations) {
        for (const [ak, av] of Object.entries(first.annotations)) {
          if (typeof av === "string") {
            // If all sentences share the same annotation, use it; otherwise join.
            const all = val
              .map((v) =>
                typeof v === "object" && v.annotations
                  ? v.annotations[ak] || ""
                  : ""
              )
              .filter(Boolean);
            out[`${key}__${ak}`] =
              all.length > 1 ? all.join(" ;;; ") : av;
          }
        }
      }
    } else if (val && typeof val === "object" && "text" in val) {
      const a = val as AnnotatedText;
      out[key] = a.text || "";
      if (a.annotations) {
        for (const [ak, av] of Object.entries(a.annotations)) {
          if (typeof av === "string") out[`${key}__${ak}`] = av;
        }
      }
    }
  }
  return out;
}
