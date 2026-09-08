"use client";

import { useState } from "react";
import { Brain, Sparkles, Layers, Repeat, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function AuthLanding() {
  const { isNetlify, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "recover" | null>(null);

  return (
    <div className="min-h-screen landing-bg flex flex-col">
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          {/* Logo / title */}
          <div className="text-center mb-8">
            <div className="text-7xl font-display font-bold text-gradient leading-none mb-4">
              多言語
            </div>
            <h1 className="font-display text-3xl font-semibold">
              Polyglot Cards
            </h1>
            <p className="text-secondary mt-2">
              AI-powered flashcards for multi-language learners
            </p>
          </div>

          {/* Feature tags */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {[
              { icon: Brain, label: "FSRS Algorithm" },
              { icon: Sparkles, label: "Phonetic Annotations" },
              { icon: Layers, label: "Cloze Deletion" },
              { icon: Repeat, label: "4 Study Modes" },
            ].map((f) => (
              <span
                key={f.label}
                className="pc-tag !py-1 !px-3 !bg-[var(--accent-glow)] !border-transparent"
              >
                <f.icon className="size-3 text-[var(--accent-primary)]" />
                {f.label}
              </span>
            ))}
          </div>

          {/* Auth card */}
          <div className="pc-card-elevated p-6">
            {isNetlify ? (
              <div className="space-y-3">
                <Button
                  className="btn-primary w-full h-11"
                  onClick={() => setMode("signin")}
                >
                  Sign In
                </Button>
                <Button
                  className="btn-secondary w-full h-11"
                  onClick={() => setMode("signup")}
                >
                  Create Account
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  className="btn-primary w-full h-11"
                  onClick={() => setMode("signup")}
                >
                  Get Started
                </Button>
                <Button
                  className="btn-secondary w-full h-11"
                  onClick={() => setMode("signin")}
                >
                  Sign In
                </Button>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t subtle-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 text-xs text-muted bg-[var(--bg-elevated)] rounded">
                      or
                    </span>
                  </div>
                </div>
                <Button
                  className="btn-ghost w-full h-11 border surface-border"
                  onClick={continueAsGuest}
                >
                  Continue as Guest
                </Button>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted mt-6">
            Powered by Netlify Identity · Your data syncs across all devices
          </p>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-muted">
        Built for language learners · FSRS-5 spaced repetition
      </footer>

      {mode && (
        <AuthDialog mode={mode} onModeChange={setMode} onClose={() => setMode(null)} />
      )}
    </div>
  );
}

function AuthDialog({
  mode,
  onModeChange,
  onClose,
}: {
  mode: "signin" | "signup" | "recover";
  onModeChange: (m: "signin" | "signup" | "recover") => void;
  onClose: () => void;
}) {
  const { signIn, signUp, recover, isNetlify } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        toast({ title: "Welcome back!" });
      } else if (mode === "signup") {
        await signUp(name || email.split("@")[0], email, password);
        toast({
          title: isNetlify
            ? "Check your email to confirm your account"
            : "Account created!",
        });
        if (!isNetlify) onClose();
      } else {
        await recover(email);
        toast({ title: "Recovery email sent" });
        onModeChange("signin");
      }
    } catch (e) {
      toast({
        title:
          mode === "signin"
            ? "Sign in failed"
            : mode === "signup"
            ? "Sign up failed"
            : "Recovery failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    signin: "Sign In",
    signup: "Create Account",
    recover: "Recover Password",
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-surface border surface-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {titles[mode]}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="bg-elevated border surface-border"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-elevated border surface-border"
            />
          </div>
          {mode !== "recover" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-elevated border surface-border"
              />
            </div>
          )}
          {mode === "signin" && (
            <button
              type="button"
              onClick={() => onModeChange("recover")}
              className="text-xs text-[var(--accent-primary)] hover:underline"
            >
              Forgot password?
            </button>
          )}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 className="size-4 mr-1 animate-spin" />}
              {mode === "signin"
                ? "Sign In"
                : mode === "signup"
                ? "Create Account"
                : "Send Email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
