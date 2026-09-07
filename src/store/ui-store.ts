"use client";

import { create } from "zustand";
import type { StudyMode } from "@/lib/types";

export type View =
  | { name: "dashboard" }
  | { name: "decks" }
  | { name: "deck"; deckId: string }
  | { name: "study"; deckId: string }
  | { name: "stats" }
  | { name: "settings" };

interface UiState {
  view: View;
  sidebarOpen: boolean;
  studyMode: StudyMode;
  setView: (v: View) => void;
  setSidebarOpen: (open: boolean) => void;
  setStudyMode: (m: StudyMode) => void;
}

export const useUi = create<UiState>((set) => ({
  view: { name: "dashboard" },
  sidebarOpen: false,
  studyMode: {
    interaction: "passive",
    batchSize: 20,
    randomise: false,
    cardPool: "all",
  },
  setView: (view) => set({ view, sidebarOpen: false }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setStudyMode: (studyMode) => set({ studyMode }),
}));
