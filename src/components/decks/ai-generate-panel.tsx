"use client";

import { useState, useRef } from "react";
import { Sparkles, Loader2, Plus, Check, FileText } from "lucide-react";
import {
  useGenerateCards,
  useBatchCreateCards,
} from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GeneratedCard {
  word: string;
  fields: Record<string, unknown>;
}

export function AiGeneratePanel({
  deckId,
  targetLanguage,
  sourceLanguage,
}: {
  deckId: string;
  targetLanguage: string;
  sourceLanguage: string;
}) {
  const { toast } = useToast();
  const generateMut = useGenerateCards(deckId);
  const batchCreateMut = useBatchCreateCards(deckId);
  const [wordList, setWordList] = useState("");
  const [generated, setGenerated] = useState<GeneratedCard[] | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    const words = wordList
      .split(/[\n,]/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (!words.length) {
      toast({ title: "Enter at least one word", variant: "destructive" });
      return;
    }
    setGenerated(null);
    setProgress(0);
    try {
      // Simulate progress while generating.
      setProgress(20);
      const result = await generateMut.mutateAsync(words);
      setProgress(80);
      if (result.cards?.length) {
        setGenerated(result.cards);
        setProgress(100);
        toast({
          title: `Generated ${result.cards.length} cards`,
          description: "Review and import below.",
        });
      } else {
        toast({
          title: "No cards generated",
          description: "The AI didn't return valid content. Try again.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "AI generation failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!generated?.length) return;
    try {
      const result = await batchCreateMut.mutateAsync(generated);
      toast({ title: `Imported ${result.created} cards!` });
      setGenerated(null);
      setWordList("");
      setProgress(0);
    } catch (e) {
      toast({
        title: "Import failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    setWordList(text);
  };

  return (
    <Card className="pc-card">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="size-4 text-[var(--accent-primary)]" />
          <h3 className="font-display text-lg">AI Card Generation</h3>
          <span className="pc-tag !bg-[var(--accent-glow)] !text-[var(--accent-primary)] !border-transparent ml-auto">
            Powered by AI
          </span>
        </div>
        <p className="text-sm text-secondary">
          Enter a list of {targetLanguage} words (one per line or comma-separated).
          AI will automatically fill in translations, example sentences, phonetic
          annotations, and notes for each word based on this deck's blueprint.
        </p>

        {/* Word list input */}
        <div className="space-y-1.5">
          <Label>Vocabulary words ({targetLanguage})</Label>
          <Textarea
            value={wordList}
            onChange={(e) => setWordList(e.target.value)}
            placeholder={`Enter ${targetLanguage} words, one per line...\n\n例:\n猫\n犬\n本\n水`}
            className="bg-elevated border surface-border min-h-[120px] font-mono text-sm"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1"
            >
              <FileText className="size-3" /> Or upload a .txt file
            </button>
            <span className="text-xs text-muted">
              {wordList.split(/[\n,]/).filter((w) => w.trim()).length} words
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Generate button + progress */}
        <Button
          className="btn-primary w-full h-10 gap-2"
          onClick={handleGenerate}
          disabled={generateMut.isPending || !wordList.trim()}
        >
          {generateMut.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Generate Cards
            </>
          )}
        </Button>

        {(generateMut.isPending || progress > 0) && progress < 100 && (
          <Progress value={progress} className="h-1.5" />
        )}

        {/* Generated cards preview */}
        {generated && generated.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Generated {generated.length} cards
              </h4>
              <Button
                className="btn-primary h-8 gap-1.5"
                onClick={handleImport}
                disabled={batchCreateMut.isPending}
              >
                {batchCreateMut.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Import All
              </Button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
              {generated.map((card, i) => (
                <div
                  key={i}
                  className="pc-card-elevated rounded-lg p-3 text-sm"
                >
                  <div className="font-medium mb-1">
                    <span
                      className={cn(
                        /[\u3040-\u30ff\u3400-\u9fff]/.test(card.word) &&
                          "font-cjk"
                      )}
                    >
                      {card.word}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-xs text-secondary">
                    {Object.entries(card.fields).map(([key, val]) => (
                      <div key={key} className="flex gap-1.5">
                        <span className="text-muted shrink-0">{key}:</span>
                        <span className="truncate">
                          {typeof val === "string"
                            ? val
                            : val && typeof val === "object" && "text" in val
                            ? (val as { text: string }).text
                            : JSON.stringify(val).slice(0, 80)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {generated && generated.length === 0 && (
          <div className="text-center text-sm text-muted py-4">
            No cards were generated. Please try different words.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
