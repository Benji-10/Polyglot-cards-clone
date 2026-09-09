"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Play,
  Pause,
  Settings2,
  SlidersHorizontal,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Import,
  LayoutGrid,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Tag,
  X,
  Loader2,
} from "lucide-react";
import {
  useDeck,
  useCards,
  useDeleteCard,
  useUpdateCard,
  useResetCardSrs,
  useToggleSuspendCard,
  useBatchTagCards,
  useBlueprint,
} from "@/hooks/use-data";
import { useUi } from "@/store/ui-store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DeckFormDialog } from "@/components/decks/deck-form-dialog";
import { DeckSettingsDialog } from "@/components/decks/deck-settings-dialog";
import { DeckStatsPanel } from "@/components/decks/deck-stats-panel";
import { DeckStatsBar } from "@/components/decks/decks-view";
import { CardFormDialog } from "@/components/decks/card-form-dialog";
import { QuickAddCard } from "@/components/decks/quick-add-card";
import { BlueprintEditor } from "@/components/decks/blueprint-editor";
import { ImportExportPanel } from "@/components/decks/import-export-panel";
import { AiGeneratePanel } from "@/components/decks/ai-generate-panel";
import { RubyText } from "@/components/ruby-text";
import { getLanguageFlag } from "@/lib/constants";
import { fieldValueToString, parseCloze } from "@/lib/ruby";
import type { CardData, SrsState } from "@/lib/types";
import { formatDistanceToNow, formatIntervalDays } from "date-fns";
import { cn } from "@/lib/utils";

const STATE_STYLES: Record<SrsState, { label: string; cls: string }> = {
  new: { label: "New", cls: "!bg-[var(--text-muted)]/20 !text-[var(--text-secondary)]" },
  learning: { label: "Learning", cls: "!bg-[var(--accent-warm)]/20 !text-[var(--accent-warm)]" },
  review: { label: "Review", cls: "!bg-[var(--accent-secondary)]/20 !text-[var(--accent-secondary)]" },
  relearning: { label: "Relearning", cls: "!bg-[var(--accent-danger)]/20 !text-[var(--accent-danger)]" },
};

export function DeckDetailView({ deckId }: { deckId: string }) {
  const { data: deck, isLoading } = useDeck(deckId);
  const { setView } = useUi();
  const [tab, setTab] = useState("collection");
  const [editDeckOpen, setEditDeckOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardData | null>(null);

  if (isLoading || !deck) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64 shimmer mb-4" />
        <Skeleton className="h-32 rounded-2xl shimmer" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Back + header */}
      <button
        onClick={() => setView({ name: "decks" })}
        className="flex items-center gap-1.5 text-sm text-secondary hover:text-[var(--text-primary)] mb-4 transition-colors"
      >
        <ArrowLeft className="size-4" /> All decks
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-4xl leading-none">
            {getLanguageFlag(deck.targetLanguage)}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold truncate">
              {deck.name}
            </h1>
            <p className="text-secondary text-sm mt-0.5">
              {deck.sourceLanguage} → {deck.targetLanguage}
            </p>
            {deck.description && (
              <p className="text-secondary text-sm mt-2 max-w-xl">
                {deck.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            className="btn-primary h-10 gap-2"
            onClick={() => setView({ name: "study", deckId })}
          >
            <Play className="size-4" />
            Study
          </Button>
          <Button
            variant="ghost"
            className="btn-secondary h-10"
            onClick={() => setEditDeckOpen(true)}
          >
            <Settings2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            className="btn-secondary h-10"
            onClick={() => setSettingsOpen(true)}
            title="Deck settings"
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="pc-card p-4 mb-6">
        <DeckStatsBar
          stats={
            deck.stats || {
              total: 0,
              new: 0,
              learning: 0,
              review: 0,
              relearning: 0,
              due: 0,
              seen: 0,
              mature: 0,
            }
          }
        />
      </div>

      {/* Detailed deck statistics panel */}
      <DeckStatsPanel deckId={deckId} />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-elevated border surface-border">
          <TabsTrigger
            value="collection"
            className="data-[state=active]:bg-[var(--accent-glow)]"
          >
            <LayoutGrid className="size-4 mr-1.5" />
            Collection
          </TabsTrigger>
          <TabsTrigger
            value="blueprint"
            className="data-[state=active]:bg-[var(--accent-glow)]"
          >
            <Settings2 className="size-4 mr-1.5" />
            Blueprint
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="data-[state=active]:bg-[var(--accent-glow)]"
          >
            <Sparkles className="size-4 mr-1.5" />
            AI Generate
          </TabsTrigger>
          <TabsTrigger
            value="import"
            className="data-[state=active]:bg-[var(--accent-glow)]"
          >
            <Import className="size-4 mr-1.5" />
            Import / Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collection" className="mt-4">
          <QuickAddCard deckId={deckId} fields={deck.fields} />
          <CardCollection
            deckId={deckId}
            fields={deck.fields}
            onAdd={() => {
              setEditingCard(null);
              setCardFormOpen(true);
            }}
            onEdit={(c) => {
              setEditingCard(c);
              setCardFormOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="blueprint" className="mt-4">
          <BlueprintEditor deckId={deckId} fields={deck.fields} />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AiGeneratePanel
            deckId={deckId}
            targetLanguage={deck.targetLanguage}
            sourceLanguage={deck.sourceLanguage}
          />
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <ImportExportPanel deckId={deckId} fields={deck.fields} />
        </TabsContent>
      </Tabs>

      {/* Edit deck dialog */}
      <DeckFormDialog
        open={editDeckOpen}
        onOpenChange={setEditDeckOpen}
        deck={deck}
      />

      {/* Deck settings dialog */}
      <DeckSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        deck={deck}
        fields={deck.fields}
      />

      {/* Card form */}
      {cardFormOpen && (
        <CardFormDialog
          open={cardFormOpen}
          onOpenChange={setCardFormOpen}
          deckId={deckId}
          fields={deck.fields}
          card={editingCard}
        />
      )}
    </div>
  );
}

function CardCollection({
  deckId,
  fields,
  onAdd,
  onEdit,
}: {
  deckId: string;
  fields: { key: string; label: string; phonetics?: unknown }[];
  onAdd: () => void;
  onEdit: (c: CardData) => void;
}) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [sort, setSort] = useState("createdAt");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDelete, setBulkDelete] = useState(false);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const { data, isLoading } = useCards(deckId, {
    ...(stateFilter ? { state: stateFilter } : {}),
    ...(search ? { search } : {}),
    sort,
    dir: "desc",
  });
  const deleteMut = useDeleteCard(deckId);
  const resetSrsMut = useResetCardSrs(deckId);
  const suspendMut = useToggleSuspendCard(deckId);
  const batchTagMut = useBatchTagCards(deckId);
  const { toast } = useToast();

  const cards = data?.cards || [];
  const visibleFields = fields.slice(0, 4); // limit columns

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === cards.length) setSelected(new Set());
    else setSelected(new Set(cards.map((c) => c.id)));
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        [...selected].map((id) => deleteMut.mutateAsync(id))
      );
      toast({ title: `${selected.size} cards deleted.` });
      setSelected(new Set());
    } catch (e) {
      toast({
        title: "Failed to delete cards",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
    setBulkDelete(false);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <Input
            placeholder="Search word, reading, example..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-elevated border surface-border pl-9"
          />
        </div>
        <div className="flex gap-2">
          <FilterDropdown value={stateFilter} onChange={setStateFilter} />
          <SortDropdown value={sort} onChange={setSort} />
          <Button className="btn-primary h-10 gap-2" onClick={onAdd}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add Card</span>
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2.5 pc-card-elevated rounded-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button
            size="sm"
            variant="ghost"
            className="btn-ghost h-8"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            className="btn-secondary h-8 gap-1.5"
            onClick={() => setBulkTagOpen(true)}
          >
            <Tag className="size-3.5" /> Tag
          </Button>
          <Button
            size="sm"
            className="btn-danger h-8 gap-1.5"
            onClick={() => setBulkDelete(true)}
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-11 rounded-xl shimmer" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📇</div>
          <h3 className="font-display text-lg mb-1">
            {search || stateFilter
              ? "No cards match your filters"
              : "No cards yet"}
          </h3>
          {!search && !stateFilter && (
            <p className="text-secondary text-sm mb-4">
              Add your first card to start building this deck.
            </p>
          )}
          {!search && !stateFilter && (
            <Button className="btn-primary h-10 gap-2" onClick={onAdd}>
              <Plus className="size-4" /> Add Card
            </Button>
          )}
        </div>
      ) : (
        <div className="pc-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="border-subtle hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        selected.size === cards.length && cards.length > 0
                      }
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="font-medium">Word</TableHead>
                  {visibleFields.map((f) => (
                    <TableHead key={f.key} className="font-medium hidden md:table-cell">
                      {f.label}
                    </TableHead>
                  ))}
                  <TableHead className="font-medium">State</TableHead>
                  <TableHead className="font-medium hidden lg:table-cell">Tags</TableHead>
                  <TableHead className="font-medium hidden lg:table-cell">Due</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => {
                  const st = STATE_STYLES[card.srsState];
                  const isSelected = selected.has(card.id);
                  return (
                    <TableRow
                      key={card.id}
                      className={cn(
                        "border-subtle cursor-pointer hover:bg-elevated/50",
                        isSelected && "bg-[var(--accent-glow)]"
                      )}
                      onClick={() => onEdit(card)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(card.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className={cn(isCJK(card.word) && "font-cjk", card.suspended && "opacity-50 line-through")}>
                          {card.word}
                        </span>
                        {card.suspended && (
                          <span className="ml-1.5 text-[0.65rem] text-[var(--accent-warm)]" title="Suspended">
                            ⏸
                          </span>
                        )}
                      </TableCell>
                      {visibleFields.map((f) => (
                        <TableCell
                          key={f.key}
                          className="text-secondary text-sm max-w-[180px] truncate hidden md:table-cell"
                        >
                          {renderFieldPreview(card.fields[f.key])}
                        </TableCell>
                      ))}
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {card.tags?.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="pc-tag !text-[0.6rem] !py-0 !bg-[var(--accent-glow)] !text-[var(--accent-primary)] !border-transparent"
                            >
                              {t}
                            </span>
                          ))}
                          {card.tags?.length > 3 && (
                            <span className="text-[0.6rem] text-muted">
                              +{card.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className={cn("font-medium", st.cls)}
                          >
                            {st.label}
                          </Badge>
                          {card.interval >= 21 && (
                            <span
                              className="pc-tag !text-[0.6rem] !py-0 !bg-[var(--accent-secondary)]/15 !text-[var(--accent-secondary)] !border-transparent"
                              title="Mature card (interval ≥ 21 days)"
                            >
                              ★
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted hidden lg:table-cell">
                        {formatDue(card.dueAt, card.srsState)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="text-muted hover:text-[var(--text-primary)] p-1">
                            <MoreVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-surface border surface-border"
                          >
                            <DropdownMenuItem onClick={() => onEdit(card)}>
                              <Edit className="size-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  await resetSrsMut.mutateAsync(card.id);
                                  toast({ title: "SRS progress reset." });
                                } catch (e) {
                                  toast({
                                    title: "Failed to reset",
                                    description: (e as Error).message,
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <RotateCcw className="size-4 mr-2" /> Reset SRS
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  await suspendMut.mutateAsync({
                                    id: card.id,
                                    suspended: !card.suspended,
                                  });
                                  toast({
                                    title: card.suspended
                                      ? "Card unsuspended."
                                      : "Card suspended.",
                                  });
                                } catch (e) {
                                  toast({
                                    title: "Failed to toggle",
                                    description: (e as Error).message,
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              {card.suspended ? (
                                <>
                                  <Play className="size-4 mr-2" /> Unsuspend
                                </>
                              ) : (
                                <>
                                  <Pause className="size-4 mr-2" /> Suspend
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[var(--accent-danger)]"
                              onClick={async () => {
                                try {
                                  await deleteMut.mutateAsync(card.id);
                                  toast({ title: "Card deleted." });
                                } catch (e) {
                                  toast({
                                    title: "Failed to delete",
                                    description: (e as Error).message,
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Trash2 className="size-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDelete} onOpenChange={setBulkDelete}>
        <AlertDialogContent className="bg-surface border surface-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} cards?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected cards and their review
              history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="btn-danger"
              onClick={handleBulkDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk tag dialog */}
      <BulkTagDialog
        open={bulkTagOpen}
        onOpenChange={setBulkTagOpen}
        selectedCount={selected.size}
        onApply={async (tags, mode) => {
          try {
            await batchTagMut.mutateAsync({
              cardIds: [...selected],
              tags,
              mode,
            });
            toast({
              title:
                mode === "add"
                  ? `Tagged ${selected.size} cards.`
                  : `Removed tags from ${selected.size} cards.`,
            });
            setBulkTagOpen(false);
            setSelected(new Set());
          } catch (e) {
            toast({
              title: "Bulk tag failed",
              description: (e as Error).message,
              variant: "destructive",
            });
          }
        }}
        loading={batchTagMut.isPending}
      />
    </div>
  );
}

function FilterDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="btn-secondary h-10 gap-1.5">
          <span className="text-xs">{value || "Filter"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-surface border surface-border">
        {["", "due", "new", "learning", "review", "relearning"].map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onChange(s)}
            className={cn("cursor-pointer capitalize", value === s && "bg-elevated")}
          >
            {s || "All cards"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="btn-secondary h-10 gap-1.5">
          <span className="text-xs capitalize">Sort: {value}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-surface border surface-border">
        {[
          { v: "createdAt", l: "Created" },
          { v: "word", l: "Word" },
          { v: "due", l: "Due date" },
        ].map((s) => (
          <DropdownMenuItem
            key={s.v}
            onClick={() => onChange(s.v)}
            className={cn("cursor-pointer", value === s.v && "bg-elevated")}
          >
            {s.l}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function renderFieldPreview(value: unknown): string {
  if (!value) return "";
  return fieldValueToString(value).slice(0, 60);
}

function isCJK(s: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(s);
}

function formatDue(dueAt: string, state: SrsState): string {
  if (state === "new") return "New";
  const due = new Date(dueAt);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  const days = Math.round(diff / (24 * 60 * 60 * 1000));
  if (diff < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 30) return `${days}d`;
  return formatDistanceToNow(due, { addSuffix: false });
}

// Bulk tag dialog — add or remove tags from multiple selected cards.
function BulkTagDialog({
  open,
  onOpenChange,
  selectedCount,
  onApply,
  loading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selectedCount: number;
  onApply: (tags: string[], mode: "add" | "remove") => void;
  loading: boolean;
}) {
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [mode, setMode] = useState<"add" | "remove">("add");

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border surface-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Tag className="size-5 text-[var(--accent-primary)]" />
            Tag {selectedCount} cards
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("add")}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm transition-colors",
                mode === "add"
                  ? "bg-[var(--accent-glow)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
                  : "bg-elevated text-secondary hover:text-[var(--text-primary)] border border-transparent"
              )}
            >
              Add tags
            </button>
            <button
              onClick={() => setMode("remove")}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm transition-colors",
                mode === "remove"
                  ? "bg-[var(--accent-glow)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
                  : "bg-elevated text-secondary hover:text-[var(--text-primary)] border border-transparent"
              )}
            >
              Remove tags
            </button>
          </div>

          {/* Current tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
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
          )}

          {/* Tag input */}
          <div className="space-y-1.5">
            <Label>Tag name</Label>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Type a tag and press Enter..."
              className="bg-elevated border surface-border h-9"
              autoFocus
            />
            <p className="text-xs text-muted">
              Press Enter or comma to add. Click a tag to remove it.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="btn-ghost">
              Cancel
            </Button>
            <Button
              onClick={() => onApply(tags, mode)}
              disabled={loading || tags.length === 0}
              className="btn-primary"
            >
              {loading ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Tag className="size-4 mr-1" />
              )}
              {mode === "add" ? "Add Tags" : "Remove Tags"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
