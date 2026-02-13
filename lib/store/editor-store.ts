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
    set((state) => {
      let changed = false;
      const pages = state.pages.map((page) => {
        if (page.id !== pageId) return page;
        const nextPage = { ...page, ...updates };
        const isSame =
          nextPage.title === page.title &&
          nextPage.body === page.body &&
          nextPage.signature === page.signature &&
          nextPage.bgColor === page.bgColor &&
          nextPage.textColor === page.textColor &&
          nextPage.characterId === page.characterId &&
          nextPage.characterPosition === page.characterPosition &&
          nextPage.stickerX === page.stickerX &&
          nextPage.stickerY === page.stickerY &&
          nextPage.stickerSize === page.stickerSize &&
          nextPage.secret === page.secret &&
          JSON.stringify(nextPage.highlightedNames ?? []) === JSON.stringify(page.highlightedNames ?? []);
        if (isSame) {
          return page;
        }
        changed = true;
        return nextPage;
      });

      if (!changed) {
        return state;
      }

      return { pages };
    }),
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
