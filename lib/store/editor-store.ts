"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { StoryPage, TemplateId, VibeId } from "@/lib/types";

interface EditorState {
  projectId?: string;
  templateId: TemplateId;
  vibe: VibeId;
  isPremium: boolean;
  pages: StoryPage[];
  setTemplate: (templateId: TemplateId) => void;
  setVibe: (vibe: VibeId) => void;
  setPremium: (value: boolean) => void;
  addPage: () => void;
  updatePage: (pageId: string, updates: Partial<StoryPage>) => void;
  deletePage: (pageId: string) => void;
  setPages: (pages: StoryPage[]) => void;
  hydrateProject: (payload: Partial<EditorState>) => void;
}

const initialPage = (): StoryPage => ({
  id: nanoid(),
  title: "",
  body: "",
  signature: ""
});

export const useEditorStore = create<EditorState>((set) => ({
  templateId: "papyrus",
  vibe: "romantic",
  isPremium: false,
  pages: [initialPage()],
  setTemplate: (templateId) => set({ templateId }),
  setVibe: (vibe) => set({ vibe }),
  setPremium: (isPremium) => set({ isPremium }),
  addPage: () =>
    set((state) => ({
      pages: [...state.pages, initialPage()]
    })),
  updatePage: (pageId, updates) =>
    set((state) => ({
      pages: state.pages.map((page) => (page.id === pageId ? { ...page, ...updates } : page))
    })),
  deletePage: (pageId) =>
    set((state) => ({
      pages: state.pages.length > 1 ? state.pages.filter((page) => page.id !== pageId) : state.pages
    })),
  setPages: (pages) => set({ pages }),
  hydrateProject: (payload) =>
    set((state) => ({
      ...state,
      ...payload
    }))
}));

