"use client";

import { useState, useRef } from "react";
import { Download, Upload, FileText, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { BlueprintFieldDef } from "@/lib/types";

export function ImportExportPanel({
  deckId,
  fields,
}: {
  deckId: string;
  fields: BlueprintFieldDef[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ImportCard deckId={deckId} fields={fields} />
      <ExportCard deckId={deckId} fields={fields} />
    </div>
  );
}

function ImportCard({
  deckId,
  fields,
}: {
  deckId: string;
  fields: BlueprintFieldDef[];
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const cards = parseCsv(text, fields);
      if (!cards.length) {
        toast({
          title: "No cards found",
          description: "Make sure your CSV has a 'word' column.",
          variant: "destructive",
        });
        return;
      }
      const res = await api.post<{ imported: number }>(
        `/api/decks/${deckId}/export`,
        { cards }
      );
      toast({
        title: `Imported ${res.imported} cards.`,
      });
    } catch (e) {
      toast({
        title: "Import failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const headerRow = ["word", ...fields.map((f) => f.key)].join(",");

  return (
    <Card className="pc-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Upload className="size-4 text-[var(--accent-primary)]" />
          <h3 className="font-display text-lg">Import Cards</h3>
        </div>
        <p className="text-sm text-secondary mb-3">
          Upload a CSV file. The first column must be{" "}
          <code className="font-mono text-xs px-1 py-0.5 rounded bg-elevated">
            word
          </code>
          .
        </p>

        <div className="pc-card-elevated rounded-lg p-3 mb-3">
          <div className="text-xs text-muted mb-1">Required header row:</div>
          <code className="font-mono text-[0.7rem] break-all">{headerRow}</code>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed surface-border rounded-xl p-6 text-center cursor-pointer hover:border-[var(--accent-primary)]/40 transition-colors"
        >
          {loading ? (
            <Loader2 className="size-6 mx-auto animate-spin text-[var(--accent-primary)]" />
          ) : (
            <>
              <FileText className="size-6 mx-auto mb-2 text-muted" />
              <p className="text-sm text-secondary">
                Click to select a .csv file
              </p>
              <p className="text-xs text-muted mt-1">
                Fields beyond the blueprint are ignored.
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ExportCard({
  deckId,
  fields,
}: {
  deckId: string;
  fields: BlueprintFieldDef[];
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const doExport = async (format: "csv" | "json") => {
    setLoading(true);
    try {
      const res = await api.get<string | unknown>(
        `/api/decks/${deckId}/export?format=${format}`
      );
      const filename = `export-${new Date().toISOString().slice(0, 10)}.${format}`;
      const blob = new Blob(
        [typeof res === "string" ? res : JSON.stringify(res, null, 2)],
        { type: format === "csv" ? "text/csv" : "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Exported as ${format.toUpperCase()}.` });
    } catch (e) {
      toast({
        title: "Export failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const headerRow = ["word", ...fields.map((f) => f.key)].join(",");

  const copyHeader = () => {
    navigator.clipboard.writeText(headerRow);
    toast({ title: "Header row copied to clipboard." });
  };

  return (
    <Card className="pc-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Download className="size-4 text-[var(--accent-secondary)]" />
          <h3 className="font-display text-lg">Export Cards</h3>
        </div>
        <p className="text-sm text-secondary mb-3">
          Download all cards in this deck. CSV includes blueprint metadata for
          round-trip imports.
        </p>

        <div className="pc-card-elevated rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-muted">CSV header:</div>
            <button
              onClick={copyHeader}
              className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-0.5"
            >
              <Copy className="size-3" /> Copy
            </button>
          </div>
          <code className="font-mono text-[0.7rem] break-all">{headerRow}</code>
        </div>

        <div className="flex gap-2">
          <Button
            className="btn-primary h-10 flex-1 gap-2"
            onClick={() => doExport("csv")}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Export CSV
          </Button>
          <Button
            variant="ghost"
            className="btn-secondary h-10 flex-1 gap-2"
            onClick={() => doExport("json")}
            disabled={loading}
          >
            <FileText className="size-4" />
            Export JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Minimal CSV parser that handles quoted fields with commas/newlines/quotes.
function parseCsv(
  text: string,
  fields: BlueprintFieldDef[]
): { word: string; fields: Record<string, unknown> }[] {
  const rows = parseCsvRows(text);
  if (!rows.length) return [];
  // Skip a blueprint metadata row (second row that isn't card data — heuristic:
  // values that look like JSON objects).
  let start = 0;
  const headers = rows[0].map((h) => h.trim());
  const wordIdx = headers.findIndex((h) => h === "word");
  if (wordIdx === -1) return [];

  // If the second row's non-word cells look like JSON metadata, skip it.
  if (rows.length > 1) {
    const second = rows[1];
    const looksMeta = second.some((cell, i) => {
      if (i === wordIdx) return false;
      return cell.trim().startsWith("{");
    });
    if (looksMeta) start = 2;
    else start = 1;
  }

  const fieldKeys = fields.map((f) => f.key);
  const out: { word: string; fields: Record<string, unknown> }[] = [];
  for (let r = start; r < rows.length; r++) {
    const row = rows[r];
    if (!row[wordIdx] && row.every((c) => !c.trim())) continue;
    const fieldsObj: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (key === "word") continue;
      if (!fieldKeys.includes(key)) continue;
      const val = row[c];
      if (!val) continue;
      // Try to parse JSON (for annotated fields)
      try {
        if (val.startsWith("{") || val.startsWith("[")) {
          fieldsObj[key] = JSON.parse(val);
          continue;
        }
      } catch {
        /* keep as string */
      }
      fieldsObj[key] = val;
    }
    out.push({ word: row[wordIdx] || "", fields: fieldsObj });
  }
  return out;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
