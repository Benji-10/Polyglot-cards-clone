"use client";

import {
  Flame,
  TrendingUp,
  Layers,
  Brain,
  Target,
  Award,
} from "lucide-react";
import { useStats, useDecks } from "@/hooks/use-data";
import { useUi } from "@/store/ui-store";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DeckStatsBar } from "@/components/decks/decks-view";
import { getLanguageFlag } from "@/lib/constants";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const STATE_COLORS: Record<string, string> = {
  new: "var(--text-muted)",
  learning: "var(--accent-warm)",
  review: "var(--accent-secondary)",
  relearning: "var(--accent-danger)",
};

export function StatsView() {
  const { data: stats, isLoading } = useStats();
  const { data: decks } = useDecks();
  const { setView } = useUi();

  if (isLoading || !stats) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48 shimmer mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl shimmer" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl shimmer" />
      </div>
    );
  }

  const reviewsData = (stats.reviewsLast30Days || []).map((d) => ({
    date: d.date.slice(5),
    reviews: d.count,
    correct: d.correct,
  }));

  const stateData = (stats.stateBreakdown || [])
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: s.state.charAt(0).toUpperCase() + s.state.slice(1),
      value: s.count,
      state: s.state,
    }));

  const totalReviews = reviewsData.reduce((a, d) => a + d.reviews, 0);
  const totalCorrect = reviewsData.reduce((a, d) => a + d.correct, 0);
  const retention =
    totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="font-display text-3xl font-semibold mb-1">Statistics</h1>
      <p className="text-secondary mb-6">Your learning progress at a glance</p>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <BigStat
          icon={Flame}
          label="Day Streak"
          value={stats.streak}
          color="var(--accent-warm)"
          sub="Keep it going!"
        />
        <BigStat
          icon={TrendingUp}
          label="Retention Rate"
          value={`${retention}%`}
          color="var(--accent-secondary)"
          sub={`${totalCorrect}/${totalReviews} correct`}
        />
        <BigStat
          icon={Brain}
          label="Reviewed Today"
          value={stats.reviewedToday}
          color="var(--accent-primary)"
          sub="cards"
        />
        <BigStat
          icon={Target}
          label="Due Today"
          value={stats.dueToday}
          color="var(--accent-danger)"
          sub="to review"
        />
      </div>

      {/* Review heatmap (last 30 days) */}
      <Card className="pc-card mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg">Review Activity</h2>
            <span className="text-xs text-muted">Last 30 days</span>
          </div>
          <Heatmap data={reviewsData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Reviews bar chart */}
        <Card className="pc-card">
          <CardContent className="p-5">
            <h2 className="font-display text-lg mb-4">Reviews per Day</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reviewsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
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
                    cursor={{ fill: "var(--accent-glow)" }}
                  />
                  <Bar dataKey="reviews" fill="var(--accent-primary)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="correct" fill="var(--accent-secondary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* State breakdown pie */}
        <Card className="pc-card">
          <CardContent className="p-5">
            <h2 className="font-display text-lg mb-4">Card States</h2>
            {stateData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted">
                No cards yet
              </div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stateData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {stateData.map((entry) => (
                        <Cell
                          key={entry.state}
                          fill={STATE_COLORS[entry.state]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.5rem",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      formatter={(v) => (
                        <span className="text-xs text-secondary">{v}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-deck breakdown */}
      <Card className="pc-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg">Deck Breakdown</h2>
            <button
              onClick={() => setView({ name: "decks" })}
              className="text-xs text-[var(--accent-primary)] hover:underline"
            >
              View all
            </button>
          </div>
          {!decks?.length ? (
            <p className="text-sm text-muted text-center py-8">
              Create a deck to see per-deck stats.
            </p>
          ) : (
            <div className="space-y-2">
              {decks.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-elevated/50 cursor-pointer transition-colors"
                  onClick={() => setView({ name: "deck", deckId: d.id })}
                >
                  <span className="text-xl">{getLanguageFlag(d.targetLanguage)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="mt-1">
                      <DeckStatsBar stats={d.stats} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BigStat({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: typeof Flame;
  label: string;
  value: number | string;
  color: string;
  sub: string;
}) {
  return (
    <Card className="pc-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="size-8 rounded-lg flex items-center justify-center"
            style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }}
          >
            <Icon className="size-4" style={{ color }} />
          </span>
          <span className="text-xs text-muted">{label}</span>
        </div>
        <div className="font-display text-2xl font-semibold">{value}</div>
        <div className="text-xs text-muted mt-0.5">{sub}</div>
      </CardContent>
    </Card>
  );
}

function Heatmap({
  data,
}: {
  data: { date: string; reviews: number; correct: number }[];
}) {
  // 5x6 grid of the last 30 days (most recent on the right)
  const max = Math.max(1, ...data.map((d) => d.reviews));
  return (
    <div>
      <div className="grid grid-cols-10 sm:grid-cols-15 gap-1.5">
        {data.map((d) => {
          const intensity = d.reviews / max;
          const bg =
            d.reviews === 0
              ? "var(--bg-elevated)"
              : `color-mix(in srgb, var(--accent-primary) ${
                  25 + intensity * 75
                }%, var(--bg-elevated))`;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.reviews} reviews (${d.correct} correct)`}
              className="aspect-square rounded-sm transition-transform hover:scale-110"
              style={{ background: bg }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-3 text-xs text-muted">
        <span>Less</span>
        <div className="size-2.5 rounded-sm" style={{ background: "var(--bg-elevated)" }} />
        <div className="size-2.5 rounded-sm" style={{ background: "color-mix(in srgb, var(--accent-primary) 40%, var(--bg-elevated))" }} />
        <div className="size-2.5 rounded-sm" style={{ background: "color-mix(in srgb, var(--accent-primary) 70%, var(--bg-elevated))" }} />
        <div className="size-2.5 rounded-sm" style={{ background: "var(--accent-primary)" }} />
        <span>More</span>
      </div>
    </div>
  );
}
