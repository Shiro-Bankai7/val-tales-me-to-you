"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEditorStore } from "@/lib/store/editor-store";
import type { ProjectRecord, StoryPage } from "@/lib/types";
import { TemplatePicker } from "@/components/editor/template-picker";
import { CharacterPicker } from "@/components/editor/character-picker";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { detectLikelyNames } from "@/lib/format";
import { StoryPageCard } from "@/components/preview/story-page-card";
import { FREE_PAGE_LIMIT, MAX_PAGE_LIMIT, getCheckoutQuote } from "@/lib/premium";
import { formatNaira } from "@/lib/utils";
import { vibes } from "@/lib/templates";

type ProjectSavePayload = {
  templateId: ProjectRecord["template_id"];
  vibe: ProjectRecord["vibe"];
  pages: StoryPage[];
};

export function EditorWorkspace({
  project,
  exportedSlug
}: {
  project: ProjectRecord;
  exportedSlug?: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Draft synced");
  const [narrationStatus, setNarrationStatus] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const [reactions, setReactions] = useState<Array<{ reaction: string; reply_text?: string; created_at: string }>>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [openTemplateModal, setOpenTemplateModal] = useState(false);
  const [openStickerModal, setOpenStickerModal] = useState(false);
  const [openBgColorModal, setOpenBgColorModal] = useState(false);
  const [openTextColorModal, setOpenTextColorModal] = useState(false);
  const [openVibeModal, setOpenVibeModal] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<"preview" | "checkout" | null>(null);
  const latestPayloadRef = useRef<ProjectSavePayload | null>(null);
  const lastSavedPayloadRef = useRef<string>("");
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const mountedRef = useRef(true);

  const {
    templateId,
    vibe,
    pages,
    isPremium,
    setTemplate,
    setVibe,
    addPage,
    updatePage,
    deletePage,
    hydrateProject
  } = useEditorStore();

  const pageLimit = MAX_PAGE_LIMIT;
  const canAddPage = pages.length < pageLimit;
  const currentPage = pages[pageIndex] ?? pages[0];
  const selectedVibe = useMemo(() => vibes.find((item) => item.id === vibe) ?? vibes[0], [vibe]);
  const selectedCharacterId = useMemo(() => currentPage?.characterId, [currentPage]);
  const quote = useMemo(
    () =>
      getCheckoutQuote({
        template_id: templateId,
        vibe,
        pages_json: pages
    }),
    [pages, templateId, vibe]
  );

  const serializePayload = useCallback((payload: ProjectSavePayload) => JSON.stringify(payload), []);
  const buildCurrentPayload = useCallback(
    (): ProjectSavePayload => ({
      templateId,
      vibe,
      pages
    }),
    [templateId, vibe, pages]
  );

  const saveProject = useCallback(
    async (payload: ProjectSavePayload, keepalive = false) => {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive
      });

      if (response.ok) {
        return;
      }

      let message = "Save failed";
      try {
        const data = (await response.json()) as { error?: string };
        if (data.error) {
          message = data.error;
        }
      } catch {
        // Best-effort parse.
      }
      throw new Error(message);
    },
    [project.id]
  );

  const drainSaveQueue = useCallback(async () => {
    if (saveInFlightRef.current) return;

    const payload = latestPayloadRef.current;
    if (!payload) return;

    const payloadJson = serializePayload(payload);
    if (payloadJson === lastSavedPayloadRef.current) {
      saveQueuedRef.current = false;
      if (mountedRef.current) {
        setSaving(false);
        setStatus("Draft synced");
      }
      return;
    }

    saveQueuedRef.current = false;
    saveInFlightRef.current = true;

    if (mountedRef.current) {
      setSaving(true);
      setStatus("Saving...");
    }

    try {
      await saveProject(payload);
      lastSavedPayloadRef.current = payloadJson;
      if (mountedRef.current) {
        setStatus("Draft synced");
      }
    } catch (error) {
      if (mountedRef.current) {
        setStatus((error as Error).message || "Save failed");
      }
    } finally {
      saveInFlightRef.current = false;
      const latestPayload = latestPayloadRef.current;
      const latestJson = latestPayload ? serializePayload(latestPayload) : "";
      if (latestPayload && latestJson !== lastSavedPayloadRef.current) {
        saveQueuedRef.current = true;
        void drainSaveQueue();
      } else if (mountedRef.current) {
        setSaving(false);
      }
    }
  }, [saveProject, serializePayload]);

  const flushDraftSave = useCallback(async (forcedPayload?: ProjectSavePayload) => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }

    if (forcedPayload) {
      latestPayloadRef.current = forcedPayload;
    }

    saveQueuedRef.current = true;
    void drainSaveQueue();

    const maxWaitMs = 7000;
    const waitSliceMs = 50;
    let waitedMs = 0;
    while (waitedMs < maxWaitMs) {
      const latestPayload = latestPayloadRef.current;
      const latestJson = latestPayload ? serializePayload(latestPayload) : "";
      const isSynced = !latestPayload || latestJson === lastSavedPayloadRef.current;
      if (!saveInFlightRef.current && !saveQueuedRef.current && isSynced) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, waitSliceMs));
      waitedMs += waitSliceMs;
      if (!saveInFlightRef.current && !saveQueuedRef.current && !isSynced) {
        saveQueuedRef.current = true;
        void drainSaveQueue();
      }
    }
    throw new Error("Unable to sync draft right now. Please retry in a moment.");
  }, [drainSaveQueue, serializePayload]);

  const navigateWithSave = useCallback(
    async (destination: string, target: "preview" | "checkout") => {
      setNavigatingTo(target);
      try {
        await flushDraftSave(buildCurrentPayload());
        router.push(destination);
      } catch (error) {
        if (mountedRef.current) {
          setStatus((error as Error).message || "Save failed");
        }
      } finally {
        if (mountedRef.current) {
          setNavigatingTo(null);
        }
      }
    },
    [buildCurrentPayload, flushDraftSave, router]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let safePages = project.pages_json;
    if (typeof safePages === "string") {
      try {
        safePages = JSON.parse(safePages);
      } catch {
        safePages = [];
      }
    }
    if (!Array.isArray(safePages)) safePages = [];

    hydrateProject({
      projectId: project.id,
      templateId: project.template_id,
      vibe: project.vibe,
      pages: safePages,
      isPremium: project.is_premium
    });
    const payload: ProjectSavePayload = {
      templateId: project.template_id,
      vibe: project.vibe,
      pages: safePages
    };
    latestPayloadRef.current = payload;
    lastSavedPayloadRef.current = serializePayload(payload);
    saveQueuedRef.current = false;
    saveInFlightRef.current = false;
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
    setSaving(false);
    setStatus("Draft synced");
    setPageIndex(0);
  }, [hydrateProject, project, serializePayload]);

  useEffect(() => {
    const payload: ProjectSavePayload = { templateId, vibe, pages };
    latestPayloadRef.current = payload;
    const payloadJson = serializePayload(payload);

    if (payloadJson !== lastSavedPayloadRef.current) {
      setStatus("Unsaved changes");
    }

    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }

    saveDebounceRef.current = setTimeout(() => {
      saveQueuedRef.current = true;
      void drainSaveQueue();
    }, 450);

    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = null;
      }
    };
  }, [templateId, vibe, pages, drainSaveQueue, serializePayload]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const payload = latestPayloadRef.current;
      if (!payload) return;
      if (serializePayload(payload) === lastSavedPayloadRef.current) return;
      void saveProject(payload, true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveProject, serializePayload]);

  useEffect(() => {
    if (pageIndex > pages.length - 1) {
      setPageIndex(Math.max(0, pages.length - 1));
    }
  }, [pageIndex, pages.length]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saving) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saving]);

  function setStickerForCurrentPage(characterId?: string) {
    if (!currentPage) return;
    if ((currentPage.characterId ?? undefined) === characterId) return;
    updatePage(currentPage.id, { characterId });
  }

  function areStringArraysEqual(left?: string[], right?: string[]) {
    const leftSafe = left ?? [];
    const rightSafe = right ?? [];
    if (leftSafe.length !== rightSafe.length) return false;
    for (let i = 0; i < leftSafe.length; i += 1) {
      if (leftSafe[i] !== rightSafe[i]) return false;
    }
    return true;
  }

  function updateCurrentPage(updates: Partial<StoryPage>) {
    if (!currentPage) return;
    const nextBody = updates.body ?? currentPage.body;
    const nextHighlightedNames =
      updates.body !== undefined ? detectLikelyNames(nextBody) : currentPage.highlightedNames;

    const nextPage: Partial<StoryPage> = {
      ...updates,
      highlightedNames: nextHighlightedNames
    };

    const unchanged =
      (nextPage.body ?? currentPage.body) === currentPage.body &&
      (nextPage.bgColor ?? currentPage.bgColor) === currentPage.bgColor &&
      (nextPage.textColor ?? currentPage.textColor) === currentPage.textColor &&
      (nextPage.characterId ?? currentPage.characterId) === currentPage.characterId &&
      (nextPage.stickerX ?? currentPage.stickerX) === currentPage.stickerX &&
      (nextPage.stickerY ?? currentPage.stickerY) === currentPage.stickerY &&
      (nextPage.stickerSize ?? currentPage.stickerSize) === currentPage.stickerSize &&
      areStringArraysEqual(nextPage.highlightedNames, currentPage.highlightedNames);

    if (unchanged) return;

    updatePage(currentPage.id, nextPage);
  }

  function handleAddPage() {
    if (!canAddPage) return;
    addPage();
    setPageIndex(pages.length);
  }

  function handleDeleteCurrentPage() {
    if (!currentPage) return;
    deletePage(currentPage.id);
  }

  async function generateNarration() {
    setNarrationStatus("Generating narration...");
    const response = await fetch("/api/elevenlabs/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id })
    });
    if (response.ok) {
      setNarrationStatus("Narration ready. Check preview.");
    } else {
      const data = (await response.json()) as { error?: string };
      setNarrationStatus(data.error ?? "Narration generation failed.");
    }
  }

  async function copyPublishedLink() {
    if (!exportedSlug) return;
    const link = `${window.location.origin}/tale/${exportedSlug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopyStatus("Link copied");
      setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setCopyStatus("Copy failed");
      setTimeout(() => setCopyStatus(""), 1800);
    }
  }

  const loadReactions = useCallback(async () => {
    if (!exportedSlug) {
      setReactions([]);
      return;
    }

    setReactionsLoading(true);
    try {
      const response = await fetch(`/api/reactions?taleSlug=${encodeURIComponent(exportedSlug)}`, {
        cache: "no-store"
      });
      const data = (await response.json()) as {
        reactions?: Array<{ reaction: string; reply_text?: string; created_at: string }>;
      };
      setReactions(Array.isArray(data.reactions) ? data.reactions : []);
    } finally {
      setReactionsLoading(false);
    }
  }, [exportedSlug]);

  useEffect(() => {
    if (!exportedSlug) {
      setReactions([]);
      return;
    }

    void loadReactions();
    const interval = window.setInterval(() => {
      void loadReactions();
    }, 20000);
    return () => window.clearInterval(interval);
  }, [exportedSlug, loadReactions]);

  const palette = [
    "#ffffff",
    "#fef4f4",
    "#fde2e4",
    "#fad2e1",
    "#f9d5e5",
    "#f6eac2",
    "#f8edd8",
    "#ffe8d6",
    "#ffd7ba",
    "#e8f5e9",
    "#d8f3dc",
    "#d1f0ff",
    "#cfe8ff",
    "#dbeafe",
    "#e0e7ff",
    "#e9d5ff",
    "#f3e8ff",
    "#ede9fe",
    "#f5f3ff",
    "#f7f0ea"
  ];

  const textPalette = [
    "#3c1f1b",
    "#5d443d",
    "#7a4b41",
    "#8a3b4c",
    "#7a2848",
    "#6b2f2f",
    "#5c3b1e",
    "#264653",
    "#1d3557",
    "#3a0ca3",
    "#3c1642",
    "#2d2d2d",
    "#4a4e69",
    "#6d6875",
    "#14213d",
    "#0b2545",
    "#2a9d8f",
    "#2f5233",
    "#374151",
    "#111827"
  ];

  return (
    <div className="h-[100dvh] overflow-hidden p-2 text-[#674a43]">
      <div className="grid h-full grid-rows-[auto_1fr_auto_auto] gap-2 min-w-0">
        <Card className="space-y-1 min-w-0">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold">Editor</h1>
            <p className="text-[11px] text-[#8a6a61]">{saving ? "Saving..." : status}</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setOpenTemplateModal(true)}
              className="flex items-center justify-center gap-1 rounded-full border border-[#d4b7ad] bg-[#f5e8e3] px-2 py-1.5 text-xs"
              title="Choose template"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <path d="M4 10h16" />
              </svg>
              <span className="whitespace-nowrap">Template</span>
            </button>
            <button
              type="button"
              onClick={() => setOpenStickerModal(true)}
              className="flex items-center justify-center gap-1 rounded-full border border-[#d4b7ad] bg-[#f5e8e3] px-2 py-1.5 text-xs"
              title="Choose sticker"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <circle cx="9" cy="9" r="1.5" />
                <path d="m20 15-4-4-7 7" />
              </svg>
              <span className="whitespace-nowrap">Sticker</span>
            </button>
            <button
              type="button"
              onClick={() => setOpenVibeModal(true)}
              className="flex min-w-0 items-center justify-center gap-1 rounded-full border border-[#d4b7ad] bg-[#f5e8e3] px-2 py-1.5 text-xs"
              title="Choose vibe music"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V6l12-2v12" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span className="truncate">Audio</span>
            </button>
          </div>
        </Card>

        <Card className="min-h-0 overflow-hidden min-w-0">
          {currentPage ? (
            <div className="h-full overflow-hidden">
              <StoryPageCard
                page={currentPage}
                templateId={templateId}
                characterSrc={
                  currentPage.characterId?.startsWith("/") ||
                  currentPage.characterId?.startsWith("data:image/")
                    ? currentPage.characterId
                    : undefined
                }
                editable
                onBodyChange={(value) => updateCurrentPage({ body: value })}
                onAddSticker={() => setOpenStickerModal(true)}
                onStickerLayoutChange={(layout) => updateCurrentPage(layout)}
                showStickerPlaceholder
              />
            </div>
          ) : null}
        </Card>

        <Card className="space-y-2 min-w-0 overflow-hidden max-w-full">
          <div className="flex items-center justify-between text-xs">
            <span>
              Page {pages.length ? Math.min(pageIndex + 1, pages.length) : 0} / {pages.length}
            </span>
            <span>
              {pages.length}/{pageLimit}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
              className="h-7 rounded-full border border-[#d2b5ab] bg-[#f3e5df] text-[11px] text-[#6a4b44] disabled:opacity-40"
              title="Previous page"
              aria-label="Previous page"
            >
              {"<"}
            </button>
            <button
              type="button"
              disabled={pageIndex >= pages.length - 1}
              onClick={() => setPageIndex((value) => Math.min(pages.length - 1, value + 1))}
              className="h-7 rounded-full border border-[#d2b5ab] bg-[#f3e5df] text-[11px] text-[#6a4b44] disabled:opacity-40"
              title="Next page"
              aria-label="Next page"
            >
              {">"}
            </button>
            <button
              type="button"
              disabled={!canAddPage}
              onClick={handleAddPage}
              className="h-7 rounded-full border border-[#d2b5ab] bg-[#f3e5df] text-[11px] text-[#6a4b44] disabled:opacity-40"
              title="Add page"
              aria-label="Add page"
            >
              +
            </button>
            <button
              type="button"
              disabled={pages.length <= 1}
              onClick={handleDeleteCurrentPage}
              className="h-7 rounded-full border border-[#d2b5ab] bg-[#f3e5df] text-[11px] text-[#6a4b44] disabled:opacity-40"
              title="Delete page"
              aria-label="Delete page"
            >
              {"-"}
            </button>
          </div>
          {currentPage ? (
            <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-[#dbc0b6] bg-[#f9f0eb] p-2">
              <button
                type="button"
                onClick={() => setOpenBgColorModal(true)}
                className="flex items-center justify-between rounded-full border border-[#d2b5ab] bg-[#f3e5df] px-3 py-1.5 text-[11px] text-[#6a4b44]"
              >
                <span>Bg Color</span>
                <span
                  className="h-4 w-4 rounded-full border border-[#d6b9af]"
                  style={{ backgroundColor: currentPage.bgColor ?? "#ffffff" }}
                />
              </button>
              <button
                type="button"
                onClick={() => setOpenTextColorModal(true)}
                className="flex items-center justify-between rounded-full border border-[#d2b5ab] bg-[#f3e5df] px-3 py-1.5 text-[11px] text-[#6a4b44]"
              >
                <span>Text Color</span>
                <span
                  className="h-4 w-4 rounded-full border border-[#d6b9af]"
                  style={{ backgroundColor: currentPage.textColor ?? "#5d443d" }}
                />
              </button>
            </div>
          ) : null}
          <p className="text-[11px] text-[#84645c]">
            Free up to {FREE_PAGE_LIMIT} pages. Current export total: {formatNaira(quote.totalAmount)}.
          </p>
          <p className="text-[11px] text-[#84645c]">Vibe: {selectedVibe.label}</p>
        </Card>

        <Card className="space-y-1.5 min-w-0">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={navigatingTo !== null || saving}
              onClick={() => void navigateWithSave(`/preview/${project.id}`, "preview")}
              className="flex items-center justify-center rounded-full border border-[#cda79b] bg-[#bf978c] px-3 py-2 text-[#fff8f4]"
              title="Preview"
              aria-label="Preview"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="text-xs font-semibold">Preview</span>
            </button>
            <button
              type="button"
              disabled={navigatingTo !== null || saving}
              onClick={() => void navigateWithSave(`/checkout?projectId=${project.id}`, "checkout")}
              className="flex items-center justify-center rounded-full border border-[#d0afa5] bg-[#f3e5df] px-3 py-2 text-[#6f5049]"
              title="Checkout"
              aria-label="Checkout"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M3 10h18" />
              </svg>
              <span className="text-xs font-semibold">Checkout</span>
            </button>
          </div>

          {exportedSlug ? (
            <div className="grid grid-cols-2 gap-1.5">
              <Link
                href={`/tale/${exportedSlug}`}
                className="flex items-center justify-center gap-1.5 rounded-full border border-[#cda79b] bg-[#bf978c] px-3 py-2 text-[#fff8f4]"
                title="Open link"
                aria-label="Open link"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 14 21 3" />
                  <path d="M15 3h6v6" />
                  <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                </svg>
                <span className="text-xs font-semibold">Open</span>
              </Link>
              <button
                type="button"
                onClick={() => void copyPublishedLink()}
                className="flex items-center justify-center gap-1.5 rounded-full border border-[#d0afa5] bg-[#f3e5df] px-3 py-2 text-[#6f5049]"
                title="Copy link"
                aria-label="Copy link"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <rect x="2" y="2" width="13" height="13" rx="2" />
                </svg>
                <span className="text-xs font-semibold">Copy</span>
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-[#8a6a61]">Publish to unlock link + copy.</p>
          )}
          {copyStatus ? <p className="text-[11px] text-[#8a6a61]">{copyStatus}</p> : null}
          {exportedSlug ? (
            <div className="space-y-1 rounded-xl border border-[#d9beb4] bg-[#fbf2ee] p-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[#7a5a52]">Reactable Inbox</p>
                <button
                  type="button"
                  onClick={() => void loadReactions()}
                  className="text-[11px] text-[#7a5a52] underline"
                  disabled={reactionsLoading}
                >
                  {reactionsLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              {reactions.length ? (
                <div className="space-y-1">
                  {reactions.slice(0, 8).map((item) => (
                    <p key={`${item.created_at}-${item.reaction}`} className="text-[11px] text-[#6f5049]">
                      {item.reaction}
                      {item.reply_text ? ` - ${item.reply_text}` : ""}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#8a6a61]">No reactions yet.</p>
              )}
            </div>
          ) : null}

          {isPremium ? (
            <Button variant="secondary" className="py-2 text-xs" onClick={() => void generateNarration()}>
              Generate narration
            </Button>
          ) : null}
          {narrationStatus ? <p className="text-[11px] text-[#8a6a61]">{narrationStatus}</p> : null}
        </Card>
      </div>

      <Modal open={openTemplateModal} title="Choose template" onClose={() => setOpenTemplateModal(false)}>
        <TemplatePicker
          value={templateId}
          onChange={(next) => {
            setTemplate(next);
            setOpenTemplateModal(false);
          }}
          isPremium={isPremium}
        />
      </Modal>

      <Modal open={openStickerModal} title="Choose sticker" onClose={() => setOpenStickerModal(false)}>
        <CharacterPicker
          selectedCharacterId={selectedCharacterId}
          onSelect={(characterId) => {
            setStickerForCurrentPage(characterId);
            setOpenStickerModal(false);
          }}
          onClear={() => {
            setStickerForCurrentPage(undefined);
            setOpenStickerModal(false);
          }}
          isPremium={isPremium}
        />
      </Modal>

      <Modal open={openBgColorModal} title="Background color" onClose={() => setOpenBgColorModal(false)}>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              updateCurrentPage({ bgColor: undefined });
              setOpenBgColorModal(false);
            }}
            className="w-full rounded-full border border-[#d2b5ab] bg-[#f3e5df] px-3 py-2 text-xs text-[#6a4b44]"
          >
            Use template background
          </button>
          <div className="grid grid-cols-5 gap-2">
            {palette.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => {
                  updateCurrentPage({ bgColor: color });
                  setOpenBgColorModal(false);
                }}
                className="h-10 w-full rounded-full border border-[#d6b9af]"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={openTextColorModal} title="Text color" onClose={() => setOpenTextColorModal(false)}>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              updateCurrentPage({ textColor: undefined });
              setOpenTextColorModal(false);
            }}
            className="w-full rounded-full border border-[#d2b5ab] bg-[#f3e5df] px-3 py-2 text-xs text-[#6a4b44]"
          >
            Use default text color
          </button>
          <div className="grid grid-cols-5 gap-2">
            {textPalette.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => {
                  updateCurrentPage({ textColor: color });
                  setOpenTextColorModal(false);
                }}
                className="h-10 w-full rounded-full border border-[#d6b9af]"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={openVibeModal} title="Choose vibe music" onClose={() => setOpenVibeModal(false)}>
        <div className="space-y-2">
          {vibes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setVibe(item.id);
                setOpenVibeModal(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs ${
                vibe === item.id
                  ? "border-[#c79e91] bg-[#bf978c] text-[#fff8f4]"
                  : "border-[#d4b7ad] bg-[#f5e8e3] text-[#6f5049]"
              }`}
            >
              <span>{item.label}</span>
              <span>{item.premium ? "[Premium]" : "Included"}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
