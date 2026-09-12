"use client";

import { useState } from "react";
import { Brain, Sparkles, Layers, Repeat } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function AuthLanding() {
  const { isNetlify, signIn, signUp, continueAsGuest } = useAuth();

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
                  onClick={() => signUp()}
                >
                  Get Started
                </Button>
                <Button
                  className="btn-secondary w-full h-11"
                  onClick={() => signIn()}
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
            ) : (
              <div className="space-y-3">
                <Button
                  className="btn-primary w-full h-11"
                  onClick={continueAsGuest}
                >
                  Get Started
                </Button>
                <Button
                  className="btn-secondary w-full h-11"
                  onClick={continueAsGuest}
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
    </div>
  );
}
