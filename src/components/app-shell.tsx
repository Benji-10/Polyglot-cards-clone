"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Layers,
  BarChart3,
  Settings as SettingsIcon,
  Brain,
  Sparkles,
  LogOut,
  Menu,
  X,
  Plus,
} from "lucide-react";
import { useUi, type View } from "@/store/ui-store";
import { useAuth } from "@/hooks/use-auth";
import { useDecks } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DeckFormDialog } from "@/components/decks/deck-form-dialog";
import { CommandPalette } from "@/components/command-palette";
import { Search } from "lucide-react";

const NAV_ITEMS: {
  label: string;
  icon: typeof LayoutDashboard;
  view: View;
  section: "app";
}[] = [
  { label: "Dashboard", icon: LayoutDashboard, view: { name: "dashboard" }, section: "app" },
  { label: "All Decks", icon: Layers, view: { name: "decks" }, section: "app" },
  { label: "Statistics", icon: BarChart3, view: { name: "stats" }, section: "app" },
  { label: "Settings", icon: SettingsIcon, view: { name: "settings" }, section: "app" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { view, setView, sidebarOpen, setSidebarOpen, paletteOpen, setPaletteOpen } = useUi();
  const { user, signOut } = useAuth();
  const { data: decks } = useDecks();
  const [createOpen, setCreateOpen] = useState(false);

  const initials = (user?.name || user?.email || "G")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-screen flex overflow-hidden bg-app text-[var(--text-primary)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static z-40 h-full w-[260px] shrink-0 bg-surface border-r surface-border flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-16 border-b subtle-border shrink-0">
          <button
            onClick={() => setView({ name: "dashboard" })}
            className="flex items-center gap-2.5 group"
          >
            <span className="text-2xl font-display font-bold text-gradient leading-none">
              多
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display font-semibold text-[1.05rem]">
                Polyglot
              </span>
              <span className="text-[0.65rem] uppercase tracking-widest text-muted -mt-0.5">
                Cards
              </span>
            </span>
          </button>
          <button
            className="md:hidden text-muted hover:text-[var(--text-primary)]"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 scrollbar-thin">
          <div className="p-3 space-y-6">
            {/* Search + Create deck */}
            <div className="space-y-2">
              <button
                onClick={() => setPaletteOpen(true)}
                className="w-full flex items-center gap-2 px-3 h-9 rounded-lg bg-elevated border surface-border text-sm text-muted hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-secondary)] transition-colors"
              >
                <Search className="size-3.5" />
                <span className="flex-1 text-left">Search...</span>
                <kbd className="font-mono text-[0.6rem] px-1 py-0.5 rounded bg-[var(--bg-card)] border surface-border">
                  ⌘K
                </kbd>
              </button>
              <DeckFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                trigger={
                  <Button className="btn-primary w-full h-10 gap-2">
                    <Plus className="size-4" />
                    New Deck
                  </Button>
                }
              />
            </div>

            {/* Decks list */}
            <div>
              <div className="section-title px-2 mb-2">Your Decks</div>
              <div className="space-y-1">
                {decks?.slice(0, 8).map((d) => {
                  const active =
                    (view.name === "deck" || view.name === "study") &&
                    view.deckId === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setView({ name: "deck", deckId: d.id })}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left",
                        active
                          ? "bg-[var(--accent-glow)] text-[var(--text-primary)]"
                          : "text-secondary hover:bg-elevated hover:text-[var(--text-primary)]"
                      )}
                    >
                      <span className="text-base leading-none">
                        {d.targetLanguage
                          ? flagFor(d.targetLanguage)
                          : "📚"}
                      </span>
                      <span className="truncate flex-1">{d.name}</span>
                      {d.stats.due > 0 && (
                        <span className="pc-tag !px-1.5 !py-0 !text-[0.65rem] !bg-[var(--accent-danger)]/15 !text-[var(--accent-danger)] !border-transparent">
                          {d.stats.due}
                        </span>
                      )}
                    </button>
                  );
                })}
                {!decks?.length && (
                  <p className="px-2.5 py-2 text-xs text-muted">
                    No decks yet. Create one to get started.
                  </p>
                )}
              </div>
            </div>

            {/* App nav */}
            <div>
              <div className="section-title px-2 mb-2">App</div>
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const active = view.name === item.view.name;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => setView(item.view)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left",
                        active
                          ? "bg-elevated text-[var(--text-primary)]"
                          : "text-secondary hover:bg-elevated hover:text-[var(--text-primary)]"
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* User footer */}
        <div className="border-t subtle-border p-3 shrink-0 overflow-hidden">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-elevated transition-colors group"
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-elevated text-[0.7rem] font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium truncate">
                {user?.name || "Guest"}
              </div>
              <div className="text-[0.7rem] text-muted truncate">
                {user?.email}
              </div>
            </div>
            <LogOut className="size-4 text-muted group-hover:text-[var(--accent-danger)] shrink-0" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 h-14 px-4 border-b subtle-border bg-surface shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-secondary hover:text-[var(--text-primary)]"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-display font-semibold text-gradient">多 Polyglot</span>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>

      <CommandPalette />
    </div>
  );
}

function flagFor(lang: string): string {
  const map: Record<string, string> = {
    English: "🇬🇧",
    Japanese: "🇯🇵",
    "Chinese (Mandarin)": "🇨🇳",
    "Chinese (Cantonese)": "🇭🇰",
    Korean: "🇰🇷",
    French: "🇫🇷",
    Spanish: "🇪🇸",
    German: "🇩🇪",
    Italian: "🇮🇹",
    Portuguese: "🇵🇹",
  };
  return map[lang] || "📚";
}
