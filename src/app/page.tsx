"use client";

import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthLanding } from "@/components/auth/auth-landing";
import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DecksView } from "@/components/decks/decks-view";
import { DeckDetailView } from "@/components/decks/deck-detail-view";
import { StudyView } from "@/components/study/study-view";
import { StatsView } from "@/components/stats/stats-view";
import { SettingsView } from "@/components/settings/settings-view";
import { useUi } from "@/store/ui-store";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { user, loading } = useAuth();
  const { view } = useUi();

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  if (!user) {
    return <AuthLanding />;
  }

  return (
    <AppShell>
      {view.name === "dashboard" && <DashboardView />}
      {view.name === "decks" && <DecksView />}
      {view.name === "deck" && <DeckDetailView deckId={view.deckId} />}
      {view.name === "study" && <StudyView deckId={view.deckId} />}
      {view.name === "stats" && <StatsView />}
      {view.name === "settings" && <SettingsView />}
    </AppShell>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
