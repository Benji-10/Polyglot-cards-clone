"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateDeck, useUpdateDeck } from "@/hooks/use-data";
import { useUi } from "@/store/ui-store";
import { LANGUAGES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import type { DeckData } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).default(""),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  cardDirection: z.enum(["target", "cloze"]),
  strictAccents: z.boolean(),
  strictMode: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface DeckFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  trigger?: React.ReactNode;
  deck?: (DeckData & { id: string }) | null;
}

export function DeckFormDialog({
  open,
  onOpenChange,
  trigger,
  deck,
}: DeckFormDialogProps) {
  const isEdit = !!deck;
  const createMut = useCreateDeck();
  const updateMut = useUpdateDeck();
  const { setView } = useUi();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      sourceLanguage: "English",
      targetLanguage: "Japanese",
      cardDirection: "target",
      strictAccents: true,
      strictMode: false,
    },
  });

  useEffect(() => {
    if (deck) {
      form.reset({
        name: deck.name,
        description: deck.description,
        sourceLanguage: deck.sourceLanguage,
        targetLanguage: deck.targetLanguage,
        cardDirection: deck.cardDirection,
        strictAccents: deck.strictAccents,
        strictMode: deck.strictMode,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        sourceLanguage: "English",
        targetLanguage: "Japanese",
        cardDirection: "target",
        strictAccents: true,
        strictMode: false,
      });
    }
  }, [deck, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && deck) {
        await updateMut.mutateAsync({ id: deck.id, ...values });
        toast({ title: "Deck updated." });
      } else {
        const created = await createMut.mutateAsync(values);
        toast({ title: "Deck created!" });
        setView({ name: "deck", deckId: created.id });
      }
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Failed to save deck",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="bg-surface border surface-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEdit ? "Edit Deck" : "New Deck"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="e.g. Japanese Vocabulary"
              className="bg-elevated border surface-border"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-[var(--accent-danger)]">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Source Language</Label>
              <Select
                value={form.watch("sourceLanguage")}
                onValueChange={(v) => form.setValue("sourceLanguage", v)}
              >
                <SelectTrigger className="bg-elevated border surface-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface border surface-border max-h-72">
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.name} value={l.name}>
                      <span className="mr-2">{l.flag}</span>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target Language</Label>
              <Select
                value={form.watch("targetLanguage")}
                onValueChange={(v) => form.setValue("targetLanguage", v)}
              >
                <SelectTrigger className="bg-elevated border surface-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface border surface-border max-h-72">
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.name} value={l.name}>
                      <span className="mr-2">{l.flag}</span>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="What is this deck for?"
              className="bg-elevated border surface-border min-h-[60px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Card Front</Label>
            <Select
              value={form.watch("cardDirection")}
              onValueChange={(v) =>
                form.setValue("cardDirection", v as "target" | "cloze")
              }
            >
              <SelectTrigger className="bg-elevated border surface-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border surface-border">
                <SelectItem value="target">Target word</SelectItem>
                <SelectItem value="cloze">Cloze sentence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5 pt-1 border-t subtle-border">
            <div className="flex items-center justify-between">
              <div>
                <Label>Strict accents</Label>
                <p className="text-xs text-muted">
                  Require correct accent marks (é ≠ e)
                </p>
              </div>
              <Switch
                checked={form.watch("strictAccents")}
                onCheckedChange={(v) => form.setValue("strictAccents", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Strict mode</Label>
                <p className="text-xs text-muted">
                  Exact spelling only — no typo tolerance
                </p>
              </div>
              <Switch
                checked={form.watch("strictMode")}
                onCheckedChange={(v) => form.setValue("strictMode", v)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="btn-ghost"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="btn-primary"
            >
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="size-4 mr-1 animate-spin" />
              )}
              {isEdit ? "Save Changes" : "Create Deck"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
