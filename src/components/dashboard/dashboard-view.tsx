"use client";

import {
  Layers,
  Brain,
  Flame,
  CheckCircle2,
  TrendingUp,
  Play,
  Plus,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useStats, useDecks, useSeed } from "@/hooks/use-data";
import { useUi } from "@/store/ui-store";
import { useAppSettings } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeckStatsBar } from "@/components/decks/decks-view";
import { useState } from "react";
import { DeckFormDialog } from "@/components/decks/deck-form-dialog";
import { getLanguageFlag } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function DashboardView() {
  const { data: stats, isLoading } = useStats();
  const { data: decks } = useDecks();
  const { setView } = useUi();
  const { settings } = useAppSettings();
  const seedMut = useSeed();
  const [createOpen, setCreateOpen] = useState(false);

  const dueDecks = (decks || [])
    .filter((d) => d.stats.due > 0)
    .sort((a, b) => b.stats.due - a.stats.due);
  const recentDecks = (decks || []).slice(0, 4);
  const totalDue = stats?.dueToday ?? 0;

  const chartData = (stats?.reviewsLast30Days || []).map((d) => ({
    date: d.date.slice(5),
    reviews: d.count,
    correct: d.correct,
  }));

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">
          {greeting()}
        </h1>
        <p className="text-secondary mt-1">
          {totalDue > 0
            ? `You have ${totalDue} ${totalDue === 1 ? "card" : "cards"} due for review.`
            : "You're all caught up. Great work! 🎉"}
        </p>
      </div>

      {/* Study Now CTA — prominent banner when there are due cards */}
      {totalDue > 0 && dueDecks.length > 0 && (
        <div
          className="mb-8 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-glow), color-mix(in srgb, var(--accent-secondary) 8%, transparent))",
            border: "1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="size-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: "var(--accent-glow)" }}
            >
              {getLanguageFlag(dueDecks[0].targetLanguage)}
            </div>
            <div>
              <div className="text-sm text-secondary">Ready to study</div>
              <div className="font-display text-lg font-semibold">
                {dueDecks[0].name}
              </div>
              <div className="text-xs text-muted">
                {dueDecks[0].stats.due} due · {dueDecks[0].stats.total} total cards
              </div>
            </div>
          </div>
          <Button
            className="btn-primary h-11 px-6 gap-2 shrink-0"
            onClick={() => setView({ name: "study", deckId: dueDecks[0].id })}
          >
            <Play className="size-4" />
            Start Studying
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={stats?.streak ?? 0}
          color="var(--accent-warm)"
          loading={isLoading}
        />
        <StatCard
          icon={Brain}
          label="Due Today"
          value={stats?.dueToday ?? 0}
          color="var(--accent-danger)"
          loading={isLoading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Reviewed Today"
          value={stats?.reviewedToday ?? 0}
          color="var(--accent-secondary)"
          loading={isLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Retention"
          value={`${Math.round((stats?.retentionRate ?? 0) * 100)}%`}
          color="var(--accent-primary)"
          loading={isLoading}
        />
      </div>

      {/* Due decks + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Due decks */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Due Now</h2>
            {dueDecks.length > 0 && (
              <button
                onClick={() => setView({ name: "decks" })}
                className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1"
              >
                All decks <ArrowRight className="size-3" />
              </button>
            )}
          </div>
          {dueDecks.length === 0 ? (
            <Card className="pc-card">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="size-8 mx-auto mb-2 text-[var(--accent-secondary)]" />
                <p className="text-sm text-secondary">
                  No cards due. Come back later or study ahead!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {dueDecks.slice(0, 5).map((d) => (
                <div
                  key={d.id}
                  onClick={() => setView({ name: "study", deckId: d.id })}
                  className="w-full pc-card pc-card-hover p-3 flex items-center gap-3 hover:border-[var(--accent-primary)]/40 text-left cursor-pointer"
                >
                  <span className="text-xl">{getLanguageFlag(d.targetLanguage)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-xs text-muted">
                      {d.stats.due} due · {d.stats.total} total
                    </div>
                  </div>
                  <Button size="sm" className="btn-primary h-7 gap-1 text-xs">
                    <Play className="size-3" />
                    Study
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review chart */}
        <div className="lg:col-span-2">
          <h2 className="section-title mb-3">Reviews (Last 30 Days)</h2>
          <Card className="pc-card">
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-48 rounded-xl shimmer" />
              ) : chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted">
                  No reviews yet. Start studying to see your progress!
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="corrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        interval={4}
                      />
                      <YAxis
                        tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          borderRadius: "0.5rem",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "var(--text-secondary)" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="reviews"
                        stroke="var(--accent-primary)"
                        strokeWidth={2}
                        fill="url(#revGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="correct"
                        stroke="var(--accent-secondary)"
                        strokeWidth={2}
                        fill="url(#corrGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent decks */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Recent Decks</h2>
          <button
            onClick={() => setView({ name: "decks" })}
            className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="size-3" />
          </button>
        </div>
        {recentDecks.length === 0 ? (
          <Card className="pc-card">
            <CardContent className="p-8 text-center">
              <Sparkles className="size-8 mx-auto mb-3 text-[var(--accent-primary)]" />
              <h3 className="font-display text-lg mb-1">Welcome to Polyglot Cards!</h3>
              <p className="text-secondary text-sm mb-4 max-w-md mx-auto">
                Start by creating a deck, or load sample decks to explore the
                app's features with real flashcards.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <DeckFormDialog
                  open={createOpen}
                  onOpenChange={setCreateOpen}
                  trigger={
                    <Button className="btn-primary h-9 gap-2">
                      <Plus className="size-4" /> New Deck
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  className="btn-secondary h-9 gap-2"
                  onClick={() => seedMut.mutate()}
                  disabled={seedMut.isPending}
                >
                  <Sparkles className="size-4" />
                  {seedMut.isPending ? "Loading..." : "Load Sample Decks"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentDecks.map((d) => (
              <div
                key={d.id}
                onClick={() => setView({ name: "deck", deckId: d.id })}
                className="pc-card pc-card-hover p-4 text-left hover:border-[var(--accent-primary)]/40 cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{getLanguageFlag(d.targetLanguage)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold truncate">{d.name}</div>
                    <div className="text-xs text-muted">
                      {d.sourceLanguage} → {d.targetLanguage}
                    </div>
                  </div>
                  {d.stats.due > 0 && (
                    <span className="pc-tag !bg-[var(--accent-danger)]/15 !text-[var(--accent-danger)] !border-transparent">
                      {d.stats.due} due
                    </span>
                  )}
                </div>
                <DeckStatsBar stats={d.stats} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Library summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryStat
          icon={Layers}
          label="Total Decks"
          value={stats?.totalDecks ?? 0}
        />
        <SummaryStat icon={Brain} label="Total Cards" value={stats?.totalCards ?? 0} />
        <SummaryStat
          icon={Sparkles}
          label="New Cards"
          value={stats?.newCards ?? 0}
        />
        <SummaryStat
          icon={CheckCircle2}
          label="In Review"
          value={stats?.reviewCards ?? 0}
        />
      </div>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: typeof Flame;
  label: string;
  value: number | string;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card
      className="pc-card relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, var(--bg-card), color-mix(in srgb, ${color} 4%, var(--bg-card)))`,
      }}
    >
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 70%)`,
          transform: "translate(30%, -30%)",
        }}
      />
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between mb-2">
          <span
            className="size-9 rounded-lg flex items-center justify-center"
            style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }}
          >
            <Icon className="size-4.5" style={{ color }} />
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-16 shimmer" />
        ) : (
          <div className="font-display text-2xl font-semibold">{value}</div>
        )}
        <div className="text-sm text-secondary mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
}) {
  return (
    <Card className="pc-card">
      <CardContent className="p-3 flex items-center gap-2.5">
        <Icon className="size-4 text-secondary" />
        <div>
          <div className="font-display text-lg font-semibold leading-none">
            {value}
          </div>
          <div className="text-xs text-secondary mt-0.5">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
