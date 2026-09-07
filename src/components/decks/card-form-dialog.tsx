"use client";

import { useState } from "react";
import { useCreateCard, useUpdateCard } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { BlueprintFieldDef, CardData, CardFields } from "@/lib/types";
import { splitExamples } from "@/lib/ruby";
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
        {/* Remount the body when the target card changes so state initialises fresh. */}
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
  const { toast } = useToast();

  // Initialise state directly from the prop (no effect needed — keyed remount guarantees freshness).
  const [word, setWord] = useState(card?.word ?? "");
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>(
    card?.fields ?? {}
  );

  const setField = (key: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!word.trim()) {
      toast({ title: "Word is required", variant: "destructive" });
      return;
    }
    try {
      // Strip empty string fields
      const cleanFields: CardFields = {};
      for (const [k, v] of Object.entries(fieldValues)) {
        if (v === "" || v == null) continue;
        cleanFields[k] = v as never;
      }
      if (isEdit && card) {
        await updateMut.mutateAsync({
          id: card.id,
          word,
          fields: cleanFields,
        });
        toast({ title: "Card updated." });
      } else {
        await createMut.mutateAsync({
          deckId,
          word,
          fields: cleanFields,
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

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-xl">
          {isEdit ? "Edit Card" : "Add Card"}
        </DialogTitle>
      </DialogHeader>

        <div className="space-y-4">
          {/* Word (primary) */}
          <div className="space-y-1.5">
            <Label>Word / Phrase *</Label>
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="The target-language word"
              className={cn("bg-elevated border surface-border", isCJK(word) && "font-cjk")}
              autoFocus
            />
          </div>

          <Separator className="bg-[var(--border-subtle)]" />

          {/* Blueprint fields */}
          {fields.map((field) => (
            <FieldEditor
              key={field.key}
              field={field}
              value={fieldValues[field.key]}
              onChange={(v) => setField(field.key, v)}
            />
          ))}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onDone()}
            className="btn-ghost"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createMut.isPending || updateMut.isPending}
            className="btn-primary"
          >
            {(createMut.isPending || updateMut.isPending) && (
              <Loader2 className="size-4 mr-1 animate-spin" />
            )}
            {isEdit ? "Save Changes" : "Add Card"}
          </Button>
        </DialogFooter>
    </>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: BlueprintFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const extras = field.phonetics?.extras || [];
  const hasAnnotations =
    field.phonetics?.ruby !== "none" || extras.includes("ipa") || extras.includes("tones") || extras.includes("english");

  if (field.fieldType === "example") {
    // Example field: multiple sentences. Stored as array of {text, annotations}.
    const arr: { text: string; annotations?: Record<string, string> }[] = Array.isArray(value)
      ? (value as { text: string; annotations?: Record<string, string> }[])
      : typeof value === "string" && value
      ? splitExamples(value).map((t) => ({ text: t }))
      : [];
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>
            {field.label}
            {field.showOnFront && (
              <span className="ml-1.5 pc-tag !text-[0.6rem] !py-0">front</span>
            )}
          </Label>
          <button
            onClick={() => onChange([...arr, { text: "" }])}
            className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-0.5"
          >
            <Plus className="size-3" /> Add sentence
          </button>
        </div>
        <p className="text-xs text-muted">{field.description}</p>
        <div className="space-y-2">
          {arr.length === 0 ? (
            <Textarea
              placeholder="Sentence with {{word}} marked for cloze..."
              className="bg-elevated border surface-border min-h-[60px]"
              onChange={(e) => {
                const lines = e.target.value.split(/\s*;;;\s*/).filter(Boolean);
                onChange(lines.map((t) => ({ text: t })));
              }}
            />
          ) : (
            arr.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Textarea
                  value={item.text}
                  placeholder="Sentence with {{word}}..."
                  className={cn("bg-elevated border surface-border min-h-[50px] flex-1", isCJK(item.text) && "font-cjk")}
                  onChange={(e) => {
                    const next = [...arr];
                    next[i] = { ...item, text: e.target.value };
                    onChange(next);
                  }}
                />
                {hasAnnotations && (
                  <AnnotationInputs
                    field={field}
                    item={item}
                    onChange={(ann) => {
                      const next = [...arr];
                      next[i] = { ...item, annotations: ann };
                      onChange(next);
                    }}
                  />
                )}
                <button
                  onClick={() => onChange(arr.filter((_, j) => j !== i))}
                  className="text-muted hover:text-[var(--accent-danger)] p-1"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
        {arr.length > 1 && (
          <p className="text-[0.7rem] text-muted">
            Separate sentences with ;;; — a random one is shown at study time.
          </p>
        )}
      </div>
    );
  }

  // Text field
  const textVal =
    typeof value === "string"
      ? value
      : (value as { text?: string })?.text || "";
  const annVal =
    typeof value === "object" && value && "annotations" in value
      ? ((value as { annotations?: Record<string, string> }).annotations) || {}
      : {};

  return (
    <div className="space-y-1.5">
      <Label>
        {field.label}
        {field.showOnFront && (
          <span className="ml-1.5 pc-tag !text-[0.6rem] !py-0">front</span>
        )}
      </Label>
      <p className="text-xs text-muted">{field.description}</p>
      <div className="flex gap-2">
        <Input
          value={textVal}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
          className={cn("bg-elevated border surface-border flex-1", isCJK(textVal) && "font-cjk")}
          onChange={(e) => {
            if (hasAnnotations) {
              onChange({ text: e.target.value, annotations: annVal });
            } else {
              onChange(e.target.value);
            }
          }}
        />
        {hasAnnotations && (
          <AnnotationInputs
            field={field}
            item={{ text: textVal, annotations: annVal }}
            onChange={(ann) => onChange({ text: textVal, annotations: ann })}
          />
        )}
      </div>
    </div>
  );
}

function AnnotationInputs({
  field,
  item,
  onChange,
}: {
  field: BlueprintFieldDef;
  item: { text: string; annotations?: Record<string, string> };
  onChange: (ann: Record<string, string>) => void;
}) {
  const ann = item.annotations || {};
  const ruby = field.phonetics?.ruby;
  const extras = field.phonetics?.extras || [];

  const rubyKey: Record<string, string> = {
    furigana: "furigana",
    pinyin: "pinyin",
    bopomofo: "bopomofo",
    jyutping: "jyutping",
    hangulRomanisation: "romaji",
    romanisation: "romaji",
    cyrillicTranslit: "romaji",
    cantoneseRomanisation: "jyutping",
  };
  const rk = ruby && ruby !== "none" ? rubyKey[ruby] || "romaji" : null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {rk && (
        <input
          value={ann[rk] || ""}
          placeholder={rk}
          onChange={(e) => onChange({ ...ann, [rk]: e.target.value })}
          className="bg-elevated border surface-border rounded-md px-2 py-1 text-xs w-32"
        />
      )}
      {extras.includes("ipa") && (
        <input
          value={ann.ipa || ""}
          placeholder="IPA"
          onChange={(e) => onChange({ ...ann, ipa: e.target.value })}
          className="bg-elevated border surface-border rounded-md px-2 py-1 text-xs w-28 font-mono"
        />
      )}
      {extras.includes("tones") && (
        <input
          value={ann.tones || ""}
          placeholder="tones"
          onChange={(e) => onChange({ ...ann, tones: e.target.value })}
          className="bg-elevated border surface-border rounded-md px-2 py-1 text-xs w-20"
        />
      )}
      {extras.includes("english") && (
        <input
          value={ann.english || ""}
          placeholder="english"
          onChange={(e) => onChange({ ...ann, english: e.target.value })}
          className="bg-elevated border surface-border rounded-md px-2 py-1 text-xs w-28"
        />
      )}
    </div>
  );
}

function isCJK(s: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(s);
}
