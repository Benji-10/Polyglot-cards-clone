"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Copy,
  FolderPlus,
} from "lucide-react";
import { useDecks, useDeleteDeck, useDuplicateDeck } from "@/hooks/use-data";
import { useUi } from "@/store/ui-store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { DeckFormDialog } from "@/components/decks/deck-form-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { DeckWithStats } from "@/lib/types";
import { getLanguageFlag } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";

export function DecksView() {
  const { data: decks, isLoading } = useDecks();
  const { setView } = useUi();
  const deleteMut = useDeleteDeck();
  const duplicateMut = useDuplicateDeck();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editDeck, setEditDeck] = useState<DeckWithStats | null>(null);
  const [deleteDeck, setDeleteDeck] = useState<DeckWithStats | null>(null);
  const [search, setSearch] = useState("");

  const filtered = (decks || []).filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteDeck) return;
    try {
      await deleteMut.mutateAsync(deleteDeck.id);
      toast({ title: "Deck deleted." });
    } catch (e) {
      toast({
        title: "Failed to delete",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
    setDeleteDeck(null);
  };

  const handleDuplicate = async (deck: DeckWithStats) => {
    try {
      await duplicateMut.mutateAsync({ id: deck.id });
      toast({ title: `Deck duplicated as "${deck.name} (copy)"` });
    } catch (e) {
      toast({
        title: "Failed to duplicate deck",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your Library</h1>
          <p className="text-secondary mt-1">
            {decks?.length || 0} {decks?.length === 1 ? "deck" : "decks"} ·
            manage your flashcard collections
          </p>
        </div>
        <DeckFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          trigger={
            <Button className="btn-primary h-10 gap-2">
              <Plus className="size-4" />
              New Deck
            </Button>
          }
        />
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
        <Input
          placeholder="Search decks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-elevated border surface-border pl-9"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} hasSearch={!!search} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onOpen={() => setView({ name: "deck", deckId: deck.id })}
              onStudy={() => setView({ name: "study", deckId: deck.id })}
              onEdit={() => setEditDeck(deck)}
              onDelete={() => setDeleteDeck(deck)}
              onDuplicate={() => handleDuplicate(deck)}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editDeck && (
        <DeckFormDialog
          open={!!editDeck}
          onOpenChange={(o) => !o && setEditDeck(null)}
          deck={editDeck}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteDeck}
        onOpenChange={(o) => !o && setDeleteDeck(null)}
      >
        <AlertDialogContent className="bg-surface border surface-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteDeck?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the deck and all{" "}
              {deleteDeck?._count.cards || 0} of its cards. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="btn-danger"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DeckCard({
  deck,
  onOpen,
  onStudy,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  deck: DeckWithStats;
  onOpen: () => void;
  onStudy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const s = deck.stats;
  return (
    <Card className="pc-card pc-card-hover overflow-hidden group hover:border-[var(--accent-primary)]/40">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl leading-none shrink-0">
              {getLanguageFlag(deck.targetLanguage)}
            </span>
            <div className="min-w-0">
              <h3
                className="font-display font-semibold text-lg leading-tight cursor-pointer hover:text-[var(--accent-primary)] truncate"
                onClick={onOpen}
              >
                {deck.name}
              </h3>
              <p className="text-xs text-muted truncate">
                {deck.sourceLanguage} → {deck.targetLanguage}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="text-muted hover:text-[var(--text-primary)] p-1 shrink-0">
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-surface border surface-border"
            >
              <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                <Edit className="size-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate} className="cursor-pointer">
                <Copy className="size-4 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="cursor-pointer text-[var(--accent-danger)]"
              >
                <Trash2 className="size-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-secondary line-clamp-2 min-h-[2.5rem] mb-4">
          {deck.description || "No description"}
        </p>

        {/* Stats bar */}
        <DeckStatsBar stats={s} />

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t subtle-border">
          <span className="text-xs text-muted">
            {s.total} {s.total === 1 ? "card" : "cards"}
            {deck.updatedAt && (
              <>
                {" "}
                · updated{" "}
                {formatDistanceToNow(new Date(deck.updatedAt), {
                  addSuffix: true,
                })}
              </>
            )}
          </span>
          {s.due > 0 ? (
            <Button
              size="sm"
              className="btn-primary h-8 gap-1.5"
              onClick={onStudy}
            >
              <Play className="size-3.5" />
              {s.due} due
            </Button>
          ) : s.total > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              className="btn-ghost h-8"
              onClick={onStudy}
            >
              Practice
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function DeckStatsBar({
  stats,
}: {
  stats: DeckWithStats["stats"];
}) {
  const total = stats.total || 1;
  const segments = [
    { label: "New", count: stats.new, color: "var(--text-muted)" },
    { label: "Learning", count: stats.learning, color: "var(--accent-warm)" },
    { label: "Review", count: stats.review, color: "var(--accent-secondary)" },
    {
      label: "Relearning",
      count: stats.relearning,
      color: "var(--accent-danger)",
    },
  ].filter((s) => s.count > 0);

  return (
    <div>
      <div className="progress-track flex gap-0.5 h-1.5">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{
              width: `${(s.count / total) * 100}%`,
              background: s.color,
            }}
            className="h-full rounded-full"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1 text-xs">
            <span
              className="size-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-secondary">{s.count}</span>
            <span className="text-muted">{s.label}</span>
          </span>
        ))}
        {stats.mature > 0 && (
          <span className="flex items-center gap-1 text-xs ml-auto">
            <span className="text-secondary">{stats.mature}</span>
            <span className="text-muted">mature</span>
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  onCreate,
  hasSearch,
}: {
  onCreate: () => void;
  hasSearch: boolean;
}) {
  if (hasSearch)
    return (
      <div className="text-center py-20 text-muted">
        <p>No decks match your search.</p>
      </div>
    );
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">📚</div>
      <h3 className="font-display text-xl mb-2">No decks yet</h3>
      <p className="text-secondary mb-6 max-w-sm mx-auto">
        Create your first deck to start learning. Each deck can hold cards for
        a specific language or topic.
      </p>
      <Button className="btn-primary h-10 gap-2" onClick={onCreate}>
        <Plus className="size-4" />
        Create Your First Deck
      </Button>
    </div>
  );
}
