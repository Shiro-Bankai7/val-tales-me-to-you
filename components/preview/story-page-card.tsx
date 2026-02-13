"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getTemplateById } from "@/lib/templates";
import { applySmartLineBreaks, detectLikelyNames, highlightText } from "@/lib/format";
import type { StoryPage, TemplateId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getDefaultStickerLayout } from "@/lib/sticker-layout";

const positionMap: Record<string, string> = {
  "bottom-right": "bottom-3 right-2",
  "bottom-left": "bottom-3 left-2",
  "top-right": "top-3 right-2",
  "center-right": "right-1 top-1/2 -translate-y-1/2"
};

export function StoryPageCard({
  page,
  templateId,
  characterSrc,
  onCharacterTap,
  editable = false,
  onBodyChange,
  onAddSticker,
  onStickerLayoutChange,
  showStickerPlaceholder = false
}: {
  page: StoryPage;
  templateId: TemplateId;
  characterSrc?: string;
  onCharacterTap?: () => void;
  editable?: boolean;
  onBodyChange?: (value: string) => void;
  onAddSticker?: () => void;
  onStickerLayoutChange?: (layout: Pick<StoryPage, "stickerX" | "stickerY" | "stickerSize">) => void;
  showStickerPlaceholder?: boolean;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localLayout, setLocalLayout] = useState<{
    x: number;
    y: number;
    size: number;
  } | null>(null);

  const dragRef = useRef<{
    mode: "move" | "resize";
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    originSize: number;
  } | null>(null);

  const template = useMemo(() => getTemplateById(templateId), [templateId]);
  const html = useMemo(() => {
    const body = page.body ?? "";
    const names = page.highlightedNames?.length ? page.highlightedNames : detectLikelyNames(body);
    const formatted = applySmartLineBreaks(body);
    return highlightText(formatted, names).replaceAll("\n", "<br />");
  }, [page.body, page.highlightedNames]);

  const textColor = page.textColor ?? "#5d443d";

  const backgroundStyle = useMemo(() => {
    const pageBackground = template.backgroundImage ?? template.previewImage;
    const overlay = editable
      ? "linear-gradient(rgba(255,255,255,0.42), rgba(255,255,255,0.4))"
      : "linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.82))";

    function withAlpha(color: string, alpha: number) {
      const hex = color.replace("#", "");
      if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
        return `rgba(248, 230, 225, ${alpha})`;
      }
      const red = parseInt(hex.slice(0, 2), 16);
      const green = parseInt(hex.slice(2, 4), 16);
      const blue = parseInt(hex.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    const backgroundColorOverlay = page.bgColor
      ? `linear-gradient(${withAlpha(page.bgColor, editable ? 0.64 : 0.58)}, ${withAlpha(page.bgColor, editable ? 0.64 : 0.58)})`
      : "linear-gradient(rgba(255,255,255,0.01), rgba(255,255,255,0.01))";

    return {
      backgroundImage: `${overlay}, ${backgroundColorOverlay}, url('${pageBackground}')`,
      backgroundSize: "cover, cover, cover",
      backgroundPosition: "center, center, center",
      color: textColor,
      ["--vt-mark-color" as string]: withAlpha(page.bgColor ?? "#ff94b8", 0.36)
    };
  }, [template, editable, page.bgColor, textColor]);

  const fallbackStickerLayout = useMemo(
    () => getDefaultStickerLayout(page.characterPosition ?? template.defaultCharacterPosition),
    [page.characterPosition, template.defaultCharacterPosition]
  );

  const hasCustomLayout =
    typeof page.stickerX === "number" || typeof page.stickerY === "number" || typeof page.stickerSize === "number";

  const stickerStyle = useMemo(() => {
    const active = localLayout ?? {
      x: page.stickerX ?? fallbackStickerLayout.x,
      y: page.stickerY ?? fallbackStickerLayout.y,
      size: page.stickerSize ?? fallbackStickerLayout.size
    };

    return {
      left: `${active.x}%`,
      top: `${active.y}%`,
      width: `${active.size}%`,
      height: `${active.size}%`,
      transform: "translate(-50%, -50%)"
    };
  }, [localLayout, page.stickerX, page.stickerY, page.stickerSize, fallbackStickerLayout]);

  function beginStickerDrag(mode: "move" | "resize", clientX: number, clientY: number) {
    const current = {
      x: page.stickerX ?? fallbackStickerLayout.x,
      y: page.stickerY ?? fallbackStickerLayout.y,
      size: page.stickerSize ?? fallbackStickerLayout.size
    };
    dragRef.current = {
      mode,
      startClientX: clientX,
      startClientY: clientY,
      originX: current.x,
      originY: current.y,
      originSize: current.size
    };
    setDragging(true);
    setLocalLayout(current);
  }

  useEffect(() => {
    if (!dragging || !editable || !onStickerLayoutChange) return;

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const card = cardRef.current;
      if (!drag || !card) return;

      const rect = card.getBoundingClientRect();
      const deltaXPercent = ((event.clientX - drag.startClientX) / rect.width) * 100;
      const deltaYPercent = ((event.clientY - drag.startClientY) / rect.height) * 100;

      if (drag.mode === "move") {
        setLocalLayout({
          x: drag.originX + deltaXPercent,
          y: drag.originY + deltaYPercent,
          size: drag.originSize
        });
        return;
      }

      const sizeDelta = (deltaXPercent + deltaYPercent) * 0.5;
      setLocalLayout({
        x: drag.originX,
        y: drag.originY,
        size: Math.max(5, drag.originSize + sizeDelta)
      });
    };

    const handlePointerUp = () => {
      if (dragRef.current && localLayout) {
        onStickerLayoutChange({
          stickerX: localLayout.x,
          stickerY: localLayout.y,
          stickerSize: localLayout.size
        });
      }
      dragRef.current = null;
      setDragging(false);
      setLocalLayout(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, editable, onStickerLayoutChange, localLayout]);

  return (
    <article
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-[30px] border border-[#e1c5bb] p-4 shadow-[0_14px_26px_rgba(143,94,84,0.16)]",
        editable ? "h-full min-h-0" : "min-h-[360px]",
        template.bgClass,
        template.fontClass
      )}
      style={backgroundStyle}
    >
      <div className="pointer-events-none absolute inset-0 select-none text-[#d8a9a7]/60">
        <span className="absolute left-2 top-4 text-[11px]">❤</span>
        <span className="absolute right-3 top-8 text-[13px]">♥</span>
        <span className="absolute left-4 bottom-8 text-[10px]">❤</span>
        <span className="absolute right-5 bottom-4 text-[12px]">♥</span>
      </div>
      {editable ? (
        <textarea
          value={page.body}
          onChange={(event) => onBodyChange?.(event.target.value)}
          placeholder="Write directly on your template..."
          className="vt-story-page h-full w-full resize-none border-0 bg-transparent text-[16px] leading-7 outline-none"
          style={{ color: textColor }}
        />
      ) : (
        <p
          className="vt-story-page mt-1 whitespace-pre-line text-[15px] leading-7"
          style={{ color: textColor }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {characterSrc ? (
        <div
          className={cn(
            "absolute z-10",
            !hasCustomLayout && positionMap[page.characterPosition ?? template.defaultCharacterPosition]
          )}
          style={hasCustomLayout ? stickerStyle : undefined}
        >
          <button
            type="button"
            onPointerDown={(event) => {
              if (!editable || !onStickerLayoutChange) return;
              event.preventDefault();
              event.stopPropagation();
              beginStickerDrag("move", event.clientX, event.clientY);
            }}
            onClick={() => {
              if (!editable) {
                onCharacterTap?.();
              }
            }}
            className={cn(
              editable && "cursor-grab active:cursor-grabbing",
              "h-full w-full transition-all active:scale-95"
            )}
            aria-label="Character sticker"
          >
            <img src={characterSrc} alt="Character sticker" className="h-full w-full object-contain" />
          </button>
          {editable && onStickerLayoutChange ? (
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                beginStickerDrag("resize", event.clientX, event.clientY);
              }}
              className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full border border-[#d7bab1] bg-[#fff5f1] text-[10px] text-[#7b5c53] shadow-sm transition-all active:scale-125"
              title="Resize sticker"
              aria-label="Resize sticker"
            >
              ↔
            </button>
          ) : null}
        </div>
      ) : editable && showStickerPlaceholder ? (
        <button
          type="button"
          onClick={onAddSticker}
          className={cn(
            "absolute z-10 rounded-xl border border-dashed border-[#c9a99f] bg-[#f7ece8] text-[10px] text-[#7c5d55]",
            !hasCustomLayout && "h-20 w-20",
            !hasCustomLayout && positionMap[page.characterPosition ?? template.defaultCharacterPosition]
          )}
          style={hasCustomLayout ? stickerStyle : undefined}
        >
          Add
          <br />
          sticker/photo
        </button>
      ) : null}
    </article>
  );
}
