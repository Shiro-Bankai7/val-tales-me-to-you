"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useEditorStore } from "@/lib/store/editor-store";
import type { ProjectRecord, StoryPage } from "@/lib/types";
import { TemplatePicker } from "@/components/editor/template-picker";
import { VibePicker } from "@/components/editor/vibe-picker";
import { CharacterPicker } from "@/components/editor/character-picker";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { detectLikelyNames } from "@/lib/format";
import { StoryPageCard } from "@/components/preview/story-page-card";
import { FREE_PAGE_LIMIT, MAX_PAGE_LIMIT, getCheckoutQuote } from "@/lib/premium";
import { formatNaira } from "@/lib/utils";

export function EditorWorkspace({
  project,
  exportedSlug
}: {
  project: ProjectRecord;
  exportedSlug?: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Draft synced");
  const [narrationStatus, setNarrationStatus] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [openTemplateModal, setOpenTemplateModal] = useState(false);
  const [openStickerModal, setOpenStickerModal] = useState(false);
  const [openBgColorModal, setOpenBgColorModal] = useState(false);
  const [openTextColorModal, setOpenTextColorModal] = useState(false);

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

  useEffect(() => {
    hydrateProject({
      projectId: project.id,
      templateId: project.template_id,
      vibe: project.vibe,
      pages: project.pages_json,
      isPremium: project.is_premium
    });
    setPageIndex(0);
  }, [hydrateProject, project]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSaving(true);
      fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, vibe, pages })
      })
        .then(() => setStatus("Draft synced"))
        .catch(() => setStatus("Save failed"))
        .finally(() => setSaving(false));
    }, 700);
    return () => clearTimeout(timeout);
  }, [project.id, templateId, vibe, pages]);

  useEffect(() => {
    if (pageIndex > pages.length - 1) {
      setPageIndex(Math.max(0, pages.length - 1));
    }
  }, [pageIndex, pages.length]);

  function setStickerForCurrentPage(characterId?: string) {
    if (!currentPage) return;
    updatePage(currentPage.id, { characterId });
  }

  function updateCurrentPage(updates: Partial<StoryPage>) {
    if (!currentPage) return;
    const nextBody = updates.body ?? currentPage.body;
    updatePage(currentPage.id, {
      ...updates,
      highlightedNames: detectLikelyNames(nextBody)
    });
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
          <div className="grid grid-cols-2 gap-1.5">
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
          <VibePicker value={vibe} onChange={setVibe} isPremium={isPremium} />
        </Card>

        <Card className="space-y-1.5 min-w-0">
          <div className="grid grid-cols-2 gap-1.5">
            <Link
              href={`/preview/${project.id}`}
              className="flex items-center justify-center gap-1.5 rounded-full border border-[#cda79b] bg-[#bf978c] px-3 py-2 text-[#fff8f4]"
              title="Preview"
              aria-label="Preview"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="text-xs font-semibold">Preview</span>
            </Link>
            <Link
              href={`/checkout?projectId=${project.id}`}
              className="flex items-center justify-center gap-1.5 rounded-full border border-[#d0afa5] bg-[#f3e5df] px-3 py-2 text-[#6f5049]"
              title="Checkout"
              aria-label="Checkout"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M3 10h18" />
              </svg>
              <span className="text-xs font-semibold">Checkout</span>
            </Link>
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
      </Modal>

      <Modal open={openTextColorModal} title="Text color" onClose={() => setOpenTextColorModal(false)}>
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
      </Modal>
    </div>
  );
}
