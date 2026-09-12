"use client";

import { useDeckStats } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, TrendingUp, Clock, Award, CheckCircle2 } from "lucide-react";

const STATE_COLORS: Record<string, string> = {
  new: "var(--text-muted)",
  learning: "var(--accent-warm)",
  review: "var(--accent-secondary)",
  relearning: "var(--accent-danger)",
};

export function DeckStatsPanel({ deckId }: { deckId: string }) {
  const { data: stats, isLoading } = useDeckStats(deckId);

  if (isLoading || !stats) {
    return (
      <Card className="pc-card mb-6">
        <CardContent className="p-4">
          <Skeleton className="h-6 w-32 shimmer mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl shimmer" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.totalCards === 0) {
    return null;
  }

  const retentionPct = Math.round(stats.retentionRate * 100);
  const total = stats.totalCards;

  return (
    <Card className="pc-card mb-6">
      <CardContent className="p-4">
        <h3 className="font-display text-lg mb-4">Deck Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatTile
            icon={Brain}
            label="Total Cards"
            value={stats.totalCards}
            color="var(--accent-primary)"
          />
          <StatTile
            icon={TrendingUp}
            label="Retention"
            value={`${retentionPct}%`}
            sub={`${stats.correctReviews}/${stats.totalReviews} reviews`}
            color="var(--accent-secondary)"
          />
          <StatTile
            icon={Clock}
            label="Avg Interval"
            value={`${stats.averageInterval}d`}
            sub="across all cards"
            color="var(--accent-warm)"
          />
          <StatTile
            icon={Award}
            label="Mature"
            value={stats.matureCount}
            sub={total > 0 ? `${Math.round((stats.matureCount / total) * 100)}% of deck` : ""}
            color="var(--accent-primary)"
          />
        </div>

        {/* State breakdown bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-secondary">Card States</span>
            <span className="text-muted">
              {stats.dueCount} due · {stats.seenCount} seen ·{" "}
              {stats.suspendedCount > 0 && `${stats.suspendedCount} suspended · `}
              {total} total
            </span>
          </div>
          <div className="progress-track flex gap-0.5 h-2">
            {stats.stateBreakdown.map((s) =>
              s.count > 0 ? (
                <div
                  key={s.state}
                  style={{
                    width: `${(s.count / total) * 100}%`,
                    background: STATE_COLORS[s.state] || "var(--text-muted)",
                  }}
                  className="h-full rounded-full transition-all"
                  title={`${s.state}: ${s.count}`}
                />
              ) : null
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {stats.stateBreakdown
              .filter((s) => s.count > 0)
              .map((s) => (
                <span key={s.state} className="flex items-center gap-1 text-xs">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: STATE_COLORS[s.state] || "var(--text-muted)" }}
                  />
                  <span className="text-secondary">{s.count}</span>
                  <span className="text-muted capitalize">{s.state}</span>
                </span>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Brain;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="pc-card-elevated rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="size-7 rounded-lg flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }}
        >
          <Icon className="size-3.5" style={{ color }} />
        </span>
        <span className="text-xs text-muted">{label}</span>
      </div>
      <div className="font-display text-xl font-semibold">{value}</div>
      {sub && <div className="text-[0.7rem] text-muted mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
