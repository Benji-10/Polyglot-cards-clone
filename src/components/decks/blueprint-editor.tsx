"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Loader2,
  RotateCcw,
  Lock,
  ChevronDown,
} from "lucide-react";
import { useSaveBlueprint } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  RUBY_TYPES,
  EXTRA_TYPES,
  DEFAULT_BLUEPRINT,
  MANDATORY_FIELDS,
  MANDATORY_FIELD_KEYS,
} from "@/lib/constants";
import { normalisePhonetics } from "@/lib/ruby";
import type {
  BlueprintFieldDef,
  Phonetics,
  RubyType,
  ExtraType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function BlueprintEditor({
  deckId,
  fields: initialFields,
}: {
  deckId: string;
  fields: BlueprintFieldDef[];
}) {
  // Remount the inner editor whenever the deckId changes so the draft state
  // re-initialises from server data without needing setState-in-effect.
  return (
    <BlueprintEditorInner
      key={deckId}
      deckId={deckId}
      initialFields={initialFields}
    />
  );
}

function BlueprintEditorInner({
  deckId,
  initialFields,
}: {
  deckId: string;
  initialFields: BlueprintFieldDef[];
}) {
  // Initialise the draft once, directly from the server fields (with mandatory
  // fields prepended). Because this component is keyed by deckId, it remounts
  // when the deck changes so the state is always fresh.
  const [draft, setDraft] = useState<BlueprintFieldDef[]>(() =>
    ensureMandatoryFields(
      (initialFields && initialFields.length > 0
        ? initialFields.map((f) => ({
            ...f,
            phonetics: normalisePhonetics(f.phonetics),
          }))
        : DEFAULT_BLUEPRINT.map((f, i) => ({ ...f, position: i }))
      ).map((f, i) => ({ ...f, position: i }))
    )
  );
  const saveMut = useSaveBlueprint();
  const { toast } = useToast();

  const update = (i: number, patch: Partial<BlueprintFieldDef>) => {
    setDraft((prev) =>
      prev ? prev.map((f, j) => (i === j ? { ...f, ...patch } : f)) : prev
    );
  };

  const move = (i: number, dir: -1 | 1) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      next.forEach((f, k) => (f.position = k));
      return next;
    });
  };

  const add = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const key = `f_${Math.random().toString(36).slice(2, 8)}`;
      return [
        ...prev,
        {
          key,
          label: "New Field",
          description: "",
          fieldType: "text",
          showOnFront: false,
          phonetics: { ruby: "none", extras: [] },
          position: prev.length,
        },
      ];
    });
  };

  const remove = (i: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = prev.filter((_, j) => j !== i);
      next.forEach((f, k) => (f.position = k));
      return next;
    });
  };

  const reset = () => {
    setDraft(
      ensureMandatoryFields(
        DEFAULT_BLUEPRINT.map((f, i) => ({ ...f, position: i }))
      )
    );
  };

  const save = async () => {
    if (!draft) return;
    try {
      await saveMut.mutateAsync({ deckId, fields: draft });
      toast({ title: "Blueprint saved." });
    } catch (e) {
      toast({
        title: "Failed to save blueprint",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="pc-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display text-lg">Card Fields</h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="btn-ghost h-8 gap-1.5"
                onClick={reset}
              >
                <RotateCcw className="size-3.5" /> Reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="btn-secondary h-8 gap-1.5"
                onClick={add}
              >
                <Plus className="size-3.5" /> Add Field
              </Button>
            </div>
          </div>
          <p className="text-sm text-secondary mb-4">
            Define what information each card in this deck holds. Reorder with
            the arrows, toggle “front” to show a field on the card front.
          </p>

          <div className="space-y-3">
            {draft.map((field, i) => (
              <FieldRow
                key={`${field.key}-${i}`}
                field={field}
                mandatory={MANDATORY_FIELD_KEYS.includes(field.key)}
                onChange={(patch) => update(i, patch)}
                onMove={(dir) => move(i, dir)}
                onRemove={() => remove(i)}
                canUp={i > 0}
                canDown={i < draft.length - 1}
              />
            ))}
          </div>

          <div className="flex justify-end mt-4 pt-3 border-t subtle-border">
            <Button
              className="btn-primary h-10 gap-2"
              onClick={save}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Save Blueprint
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Prepend mandatory fields (source_translation, context) if not already present.
function ensureMandatoryFields(
  fields: BlueprintFieldDef[]
): BlueprintFieldDef[] {
  const existingKeys = new Set(fields.map((f) => f.key));
  const missing = MANDATORY_FIELDS.filter(
    (m) => !existingKeys.has(m.key)
  ).map((m) => ({ ...m, position: 0 }));
  return [...missing, ...fields].map((f, i) => ({ ...f, position: i }));
}

function FieldRow({
  field,
  mandatory,
  onChange,
  onMove,
  onRemove,
  canUp,
  canDown,
}: {
  field: BlueprintFieldDef;
  mandatory: boolean;
  onChange: (patch: Partial<BlueprintFieldDef>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const [showPhonetics, setShowPhonetics] = useState(false);
  const phonetics = normalisePhonetics(field.phonetics);
  const activeAnnotations =
    (phonetics.ruby !== "none" ? 1 : 0) + phonetics.extras.length;

  const toggleExtra = (extra: ExtraType) => {
    const has = phonetics.extras.includes(extra);
    const next: Phonetics = {
      ...phonetics,
      extras: has
        ? phonetics.extras.filter((e) => e !== extra)
        : [...phonetics.extras, extra],
    };
    onChange({ phonetics: next });
  };

  return (
    <div
      className={cn(
        "pc-card-elevated rounded-xl p-3.5 space-y-3",
        mandatory && "ring-1 ring-[var(--accent-primary)]/20"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 pt-1">
          <button
            disabled={!canUp}
            onClick={() => onMove(-1)}
            className="text-muted hover:text-[var(--text-primary)] disabled:opacity-30"
            aria-label="Move up"
          >
            <GripVertical className="size-3.5 rotate-180" />
          </button>
          <button
            disabled={!canDown}
            onClick={() => onMove(1)}
            className="text-muted hover:text-[var(--text-primary)] disabled:opacity-30"
            aria-label="Move down"
          >
            <GripVertical className="size-3.5" />
          </button>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5">
              Key
              {mandatory && (
                <span className="inline-flex items-center gap-0.5 text-[var(--accent-primary)]">
                  <Lock className="size-2.5" /> locked
                </span>
              )}
            </Label>
            <Input
              value={field.key}
              disabled={mandatory}
              onChange={(e) =>
                onChange({
                  key: e.target.value.replace(/[^a-z0-9_]/gi, "_"),
                })
              }
              className="bg-elevated border surface-border h-9 font-mono text-sm disabled:opacity-60"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={field.label}
              onChange={(e) => onChange({ label: e.target.value })}
              className="bg-elevated border surface-border h-9"
            />
          </div>
        </div>
        {!mandatory && (
          <button
            onClick={onRemove}
            className="text-muted hover:text-[var(--accent-danger)] p-1 mt-5"
            aria-label="Remove field"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-6">
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={field.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="AI hint — describe what to put in this field"
            className="bg-elevated border surface-border min-h-[36px] text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Field type</Label>
          <Select
            value={field.fieldType}
            onValueChange={(v) =>
              onChange({ fieldType: v as "text" | "example" })
            }
          >
            <SelectTrigger className="bg-elevated border surface-border h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface border surface-border">
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="example">Example sentence</SelectItem>
            </SelectContent>
          </Select>
          {field.fieldType === "example" && (
            <p className="text-[0.7rem] text-muted">
              Use <code className="font-mono">{"{{word}}"}</code> to mark cloze.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 pl-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={field.showOnFront}
            onCheckedChange={(v) => onChange({ showOnFront: v })}
          />
          <span className="text-sm flex items-center gap-1">
            <Eye className="size-3.5" /> Show on front
          </span>
        </label>

        <button
          onClick={() => setShowPhonetics((s) => !s)}
          className="flex items-center gap-1.5 text-sm text-secondary hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              showPhonetics && "rotate-180"
            )}
          />
          Phonetic annotations
          {activeAnnotations > 0 && (
            <span className="pc-tag !text-[0.6rem] !py-0 !bg-[var(--accent-glow)] !text-[var(--accent-primary)] !border-transparent">
              {activeAnnotations}
            </span>
          )}
        </button>
      </div>

      {showPhonetics && (
        <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
          <div className="space-y-1">
            <Label className="text-xs">Ruby annotation</Label>
            <Select
              value={phonetics.ruby}
              onValueChange={(v) =>
                onChange({
                  phonetics: { ...phonetics, ruby: v as RubyType },
                })
              }
            >
              <SelectTrigger className="bg-elevated border surface-border h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border surface-border max-h-72">
                {RUBY_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-sm">
                    {r.label} <span className="text-muted">— {r.hint}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Additional annotations</Label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {EXTRA_TYPES.map((ex) => {
                const active = phonetics.extras.includes(ex.value);
                return (
                  <button
                    key={ex.value}
                    onClick={() => toggleExtra(ex.value)}
                    className={cn(
                      "pc-tag !cursor-pointer transition-colors",
                      active &&
                        "!bg-[var(--accent-glow)] !text-[var(--accent-primary)] !border-transparent"
                    )}
                  >
                    {ex.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
