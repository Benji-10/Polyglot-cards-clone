"use client";

import { useState } from "react";
import { useUpdateDeck } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Settings2 } from "lucide-react";
import type { BlueprintFieldDef, DeckData } from "@/lib/types";

interface DeckSettingsDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  deck: (DeckData & { id: string }) | null;
  fields: BlueprintFieldDef[];
}

export function DeckSettingsDialog({
  open,
  onOpenChange,
  deck,
  fields,
}: DeckSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border surface-border max-w-lg">
        {/* Remount the body when the target deck changes so state initialises fresh. */}
        <DeckSettingsBody
          key={deck?.id || "none"}
          deck={deck}
          fields={fields}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeckSettingsBody({
  deck,
  fields,
  onDone,
}: {
  deck: (DeckData & { id: string }) | null;
  fields: BlueprintFieldDef[];
  onDone: () => void;
}) {
  const updateMut = useUpdateDeck();
  const { toast } = useToast();

  // Initialise state directly from the prop (no effect needed — keyed remount).
  const [cardDirection, setCardDirection] = useState<"target" | "cloze">(
    deck?.cardDirection ?? "target"
  );
  const [contextLanguage, setContextLanguage] = useState<"target" | "source">(
    deck?.contextLanguage ?? "target"
  );
  const [strictAccents, setStrictAccents] = useState(deck?.strictAccents ?? true);
  const [strictMode, setStrictMode] = useState(deck?.strictMode ?? false);
  const [latinTyping, setLatinTyping] = useState(deck?.latinTyping ?? false);
  const [romanisationField, setRomanisationField] = useState(
    deck?.romanisationField ?? ""
  );

  const handleSave = async () => {
    if (!deck) return;
    try {
      await updateMut.mutateAsync({
        id: deck.id,
        cardDirection,
        contextLanguage,
        strictAccents,
        strictMode,
        latinTyping,
        romanisationField,
      });
      toast({ title: "Deck settings saved." });
      onDone();
    } catch (e) {
      toast({
        title: "Failed to save settings",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  // Fields that can be used as the romanisation field (text fields only).
  const romanisableFields = fields.filter((f) => f.fieldType === "text");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border surface-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Settings2 className="size-5 text-[var(--accent-primary)]" />
            Deck Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Card Front */}
          <div className="space-y-1.5">
            <Label>Card Front</Label>
            <Select
              value={cardDirection}
              onValueChange={(v) => setCardDirection(v as "target" | "cloze")}
            >
              <SelectTrigger className="bg-elevated border surface-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border surface-border">
                <SelectItem value="target">Target word</SelectItem>
                <SelectItem value="cloze">Cloze sentence</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted">
              What's shown on the front of the card during study.
            </p>
          </div>

          {/* Context Language */}
          <div className="space-y-1.5">
            <Label>Context on Card Front</Label>
            <Select
              value={contextLanguage}
              onValueChange={(v) => setContextLanguage(v as "target" | "source")}
            >
              <SelectTrigger className="bg-elevated border surface-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border surface-border">
                <SelectItem value="target">Context field (target)</SelectItem>
                <SelectItem value="source">Cloze sentence</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted">
              Target → shows a grammatical context chip. Cloze → shows a
              sentence with the word blanked out.
            </p>
          </div>

          {/* Typing Mode Settings */}
          <div className="pc-card-elevated rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium">Typing Mode</div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Strict accents</Label>
                <p className="text-xs text-muted">
                  Require correct accent marks (é ≠ e) when typing.
                </p>
              </div>
              <Switch checked={strictAccents} onCheckedChange={setStrictAccents} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Strict mode</Label>
                <p className="text-xs text-muted">
                  Exact spelling only — no typo tolerance.
                </p>
              </div>
              <Switch checked={strictMode} onCheckedChange={setStrictMode} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Latin typing mode</Label>
                <p className="text-xs text-muted">
                  Type in Latin script (romanisation) instead of the target
                  script.
                </p>
              </div>
              <Switch checked={latinTyping} onCheckedChange={setLatinTyping} />
            </div>

            {latinTyping && (
              <div className="space-y-1.5 animate-fade-in">
                <Label>Romanisation field</Label>
                <Select
                  value={romanisationField}
                  onValueChange={setRomanisationField}
                >
                  <SelectTrigger className="bg-elevated border surface-border">
                    <SelectValue placeholder="Select a field..." />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border surface-border">
                    {romanisableFields.map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label} ({f.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted">
                  Which blueprint field contains the romanised answer for typing
                  mode.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onDone}
            className="btn-ghost"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateMut.isPending}
            className="btn-primary"
          >
            {updateMut.isPending && (
              <Loader2 className="size-4 mr-1 animate-spin" />
            )}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
