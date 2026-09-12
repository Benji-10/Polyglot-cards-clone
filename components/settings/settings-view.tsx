"use client";

import { useState } from "react";
import {
  User as UserIcon,
  Palette,
  Brain,
  Volume2,
  KeyRound,
  Database,
  Check,
  LogOut,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/components/providers";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { THEME_PRESETS, LANGUAGES } from "@/lib/constants";
import type { AppSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const { user, signOut, isNetlify } = useAuth();
  const { settings, setSettings } = useAppSettings();
  const { toast } = useToast();

  const initials = (user?.name || user?.email || "G").slice(0, 2).toUpperCase();

  const patch = (p: Partial<AppSettings>) =>
    setSettings((prev) => ({ ...prev, ...p }));

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-semibold mb-1">Settings</h1>
      <p className="text-secondary mb-6">Configure your Polyglot experience</p>

      {/* Account */}
      <Section icon={UserIcon} title="Account">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarFallback className="bg-elevated font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{user?.name || "Guest"}</div>
            <div className="text-sm text-secondary truncate">{user?.email}</div>
            <div className="text-xs text-muted mt-0.5">
              {isNetlify ? "Netlify Identity account" : "Local guest account"}
            </div>
          </div>
          <Button variant="ghost" className="btn-danger h-9 gap-2 shrink-0" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </Section>

      {/* Appearance */}
      <Section icon={Palette} title="Appearance">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
          {THEME_PRESETS.map((theme) => (
            <button
              key={theme.name}
              onClick={() => patch({ theme: theme.name })}
              className={cn(
                "rounded-xl p-2.5 border text-left transition-all",
                settings.theme === theme.name
                  ? "border-[var(--accent-primary)] bg-[var(--accent-glow)]"
                  : "border-[var(--border)] hover:border-[var(--accent-primary)]/40"
              )}
            >
              <div className="flex gap-1 mb-2">
                {theme.swatch.map((c, i) => (
                  <span
                    key={i}
                    className="size-4 rounded-full"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="text-xs font-medium flex items-center justify-between">
                {theme.label}
                {settings.theme === theme.name && (
                  <Check className="size-3 text-[var(--accent-primary)]" />
                )}
              </div>
            </button>
          ))}
        </div>
        <SettingRow
          label="Animations"
          desc="Card flip and page transitions"
        >
          <Switch
            checked={settings.animationsEnabled}
            onCheckedChange={(v) => patch({ animationsEnabled: v })}
          />
        </SettingRow>
      </Section>

      {/* Study defaults */}
      <Section icon={Brain} title="Study Defaults">
        <SettingRow label="Default source language" desc="Used for new decks">
          <Select
            value={settings.defaultSourceLanguage}
            onValueChange={(v) => patch({ defaultSourceLanguage: v })}
          >
            <SelectTrigger className="bg-elevated border surface-border w-44">
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
        </SettingRow>
        <SettingRow
          label="Default batch size"
          desc="Cards loaded per study session"
        >
          <Input
            type="number"
            min={5}
            max={500}
            value={settings.defaultBatchSize}
            onChange={(e) =>
              patch({
                defaultBatchSize: Math.max(
                  5,
                  Math.min(500, Number(e.target.value) || 20)
                ),
              })
            }
            className="bg-elevated border surface-border w-24"
          />
        </SettingRow>
        <SettingRow
          label="SRS algorithm"
          desc="Spaced repetition scheduler"
        >
          <span className="pc-tag !bg-[var(--accent-secondary)]/15 !text-[var(--accent-secondary)] !border-transparent">
            <span className="size-1.5 rounded-full bg-[var(--accent-secondary)] mr-1" />
            FSRS-5 active
          </span>
        </SettingRow>
        <SettingRow
          label="Strict accents"
          desc="Require correct accent marks (é ≠ e)"
        >
          <Switch
            checked={settings.strictAccents}
            onCheckedChange={(v) => patch({ strictAccents: v })}
          />
        </SettingRow>
        <SettingRow
          label="Strict mode"
          desc="Exact spelling only — no typo tolerance"
        >
          <Switch
            checked={settings.strictMode}
            onCheckedChange={(v) => patch({ strictMode: v })}
          />
        </SettingRow>
      </Section>

      {/* Audio */}
      <Section icon={Volume2} title="Pronunciation (TTS)">
        <SettingRow
          label="Text-to-speech"
          desc="Speak the target word using your browser's voices"
        >
          <Switch
            checked={settings.ttsEnabled}
            onCheckedChange={(v) => patch({ ttsEnabled: v })}
          />
        </SettingRow>
        <SettingRow label="Speech rate" desc="Speed of pronunciation">
          <div className="flex items-center gap-3 w-44">
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={settings.ttsRate}
              onChange={(e) => patch({ ttsRate: Number(e.target.value) })}
              className="flex-1 accent-[var(--accent-primary)]"
            />
            <span className="text-xs text-muted font-mono w-8">
              {settings.ttsRate.toFixed(1)}x
            </span>
          </div>
        </SettingRow>
      </Section>

      {/* Connections */}
      <Section icon={KeyRound} title="Connections">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-elevated">
            <Database className="size-5 text-[var(--accent-secondary)]" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Database</div>
              <div className="text-xs text-muted">
                {isNetlify
                  ? "PostgreSQL (Neon) — syncs across devices"
                  : "SQLite (local)"}
              </div>
            </div>
            <TestConnectionButton />
          </div>
          <div className="pc-card-elevated rounded-lg p-3">
            <div className="text-xs text-muted mb-1">
              Production environment variables (Netlify):
            </div>
            <code className="font-mono text-[0.7rem] block">
              DATABASE_URL — from neon.tech dashboard
            </code>
            <code className="font-mono text-[0.7rem] block">
              NEXT_PUBLIC_NETLIFY_IDENTITY_URL — your Netlify site URL
            </code>
          </div>
        </div>
      </Section>

      <div className="text-center text-xs text-muted mt-8 pb-4">
        Polyglot Cards · FSRS-5 spaced repetition ·{" "}
        {new Date().getFullYear()}
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof UserIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="pc-card mb-4">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="size-4 text-[var(--accent-primary)]" />
          <h2 className="font-display text-lg">{title}</h2>
        </div>
        <div className="space-y-3">{children}</div>
      </CardContent>
    </Card>
  );
}

function SettingRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function TestConnectionButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">(
    "idle"
  );
  const test = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/decks", { headers: getAuthHeadersSafe() });
      setStatus(res.ok ? "ok" : "err");
    } catch {
      setStatus("err");
    }
    setTimeout(() => setStatus("idle"), 3000);
  };
  return (
    <Button
      size="sm"
      variant="ghost"
      className="btn-secondary h-8 gap-1.5"
      onClick={test}
      disabled={status === "loading"}
    >
      {status === "loading" && <Loader2 className="size-3.5 animate-spin" />}
      {status === "ok" && <Check className="size-3.5 text-[var(--accent-secondary)]" />}
      {status === "idle" ? "Test" : status === "ok" ? "OK" : status === "err" ? "Fail" : "..."}
    </Button>
  );
}

function getAuthHeadersSafe(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("polyglot_auth_user");
    if (!raw) return {};
    const u = JSON.parse(raw);
    return {
      "x-user-id": u.id,
      "x-user-email": u.email || "",
      "x-user-name": u.name || "",
    };
  } catch {
    return {};
  }
}
