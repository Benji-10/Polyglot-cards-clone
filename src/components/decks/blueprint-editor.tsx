"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, Eye, Loader2, RotateCcw } from "lucide-react";
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
import { RUBY_TYPES, EXTRA_TYPES, DEFAULT_BLUEPRINT } from "@/lib/constants";
import type { BlueprintFieldDef, Phonetics, RubyType, ExtraType } from "@/lib/types";

export function BlueprintEditor({
  deckId,
  fields,
}: {
  deckId: string;
  fields: BlueprintFieldDef[];
}) {
  const [draft, setDraft] = useState<BlueprintFieldDef[]>(
    fields.map((f) => ({ ...f }))
  );
  const saveMut = useSaveBlueprint();
  const { toast } = useToast();

  const update = (i: number, patch: Partial<BlueprintFieldDef>) => {
    setDraft((prev) =>
      prev.map((f, j) => (i === j ? { ...f, ...patch } : f))
    );
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[i], next[j]] = [next[j], next[i]];
    next.forEach((f, k) => (f.position = k));
    setDraft(next);
  };

  const add = () => {
    const key = `field_${Date.now().toString(36)}`;
    setDraft([
      ...draft,
      {
        key,
        label: "New Field",
        description: "",
        fieldType: "text",
        showOnFront: false,
        phonetics: { ruby: "none", extras: [] },
        position: draft.length,
      },
    ]);
  };

  const remove = (i: number) => {
    setDraft((prev) => {
      const next = prev.filter((_, j) => j !== i);
      next.forEach((f, k) => (f.position = k));
      return next;
    });
  };

  const reset = () => {
    setDraft(DEFAULT_BLUEPRINT.map((f, i) => ({ ...f, position: i })));
  };

  const save = async () => {
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
            Define what information each card in this deck holds. Drag to
            reorder, toggle “front” to show a field on the card front.
          </p>

          <div className="space-y-3">
            {draft.map((field, i) => (
              <FieldRow
                key={i}
                field={field}
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

function FieldRow({
  field,
  onChange,
  onMove,
  onRemove,
  canUp,
  canDown,
}: {
  field: BlueprintFieldDef;
  onChange: (patch: Partial<BlueprintFieldDef>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const phonetics = field.phonetics || { ruby: "none", extras: [] };

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
    <div className="pc-card-elevated rounded-xl p-3.5 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 pt-1">
          <button
            disabled={!canUp}
            onClick={() => onMove(-1)}
            className="text-muted hover:text-[var(--text-primary)] disabled:opacity-30"
          >
            <GripVertical className="size-3.5 rotate-180" />
          </button>
          <button
            disabled={!canDown}
            onClick={() => onMove(1)}
            className="text-muted hover:text-[var(--text-primary)] disabled:opacity-30"
          >
            <GripVertical className="size-3.5" />
          </button>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <Label className="text-xs">Key</Label>
            <Input
              value={field.key}
              onChange={(e) =>
                onChange({ key: e.target.value.replace(/[^a-z0-9_]/gi, "_") })
              }
              className="bg-elevated border surface-border h-9 font-mono text-sm"
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
        <button
          onClick={onRemove}
          className="text-muted hover:text-[var(--accent-danger)] p-1 mt-5"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-6">
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={field.description}
            onChange={(e) => onChange({ description: e.target.value })}
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

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Ruby:</span>
          <Select
            value={phonetics.ruby}
            onValueChange={(v) =>
              onChange({
                phonetics: { ...phonetics, ruby: v as RubyType },
              })
            }
          >
            <SelectTrigger className="bg-elevated border surface-border h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface border surface-border max-h-72">
              {RUBY_TYPES.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs">
                  {r.label} <span className="text-muted">— {r.hint}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-6">
        <span className="text-xs text-muted">Extras:</span>
        {EXTRA_TYPES.map((ex) => {
          const active = phonetics.extras.includes(ex.value);
          return (
            <button
              key={ex.value}
              onClick={() => toggleExtra(ex.value)}
              className={
                "pc-tag !cursor-pointer transition-colors " +
                (active
                  ? "!bg-[var(--accent-glow)] !text-[var(--accent-primary)] !border-transparent"
                  : "")
              }
            >
              {ex.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
