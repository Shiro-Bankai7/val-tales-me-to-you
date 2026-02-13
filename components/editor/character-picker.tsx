"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StickerAsset {
  id: string;
  name: string;
  src: string;
}

export function CharacterPicker({
  selectedCharacterId,
  onSelect,
  onClear,
  isPremium: _isPremium
}: {
  selectedCharacterId?: string;
  onSelect: (characterId: string) => void;
  onClear?: () => void;
  isPremium: boolean;
}) {
  const [stickerAssets, setStickerAssets] = useState<StickerAsset[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/stickers")
      .then((response) => response.json())
      .then((data: { stickers?: StickerAsset[] }) => {
        if (mounted) {
          setStickerAssets(data.stickers ?? []);
        }
      })
      .catch(() => {
        if (mounted) {
          setStickerAssets([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onSelect(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Sticker Photo</p>
          {selectedCharacterId?.startsWith("data:image") ? (
            <span className="text-xs text-[#86665e]">Uploaded</span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border border-[#d4b7ad] bg-[#f5e8e3] px-3 py-2 text-xs text-[#6f5049]"
          >
            Upload Photo
          </button>
          <button
            type="button"
            onClick={() => onClear?.()}
            className="rounded-full border border-[#d4b7ad] bg-[#fbf2ee] px-3 py-2 text-xs text-[#6f5049]"
          >
            Use Placeholder
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </Card>

      {stickerAssets.length ? (
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Stickers</p>
            <span className="text-xs text-[#86665e]">{stickerAssets.length} stickers</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {stickerAssets.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                onClick={() => onSelect(sticker.id)}
                className={cn(
                  "rounded-2xl border border-[#d7bcb2] bg-[#fbf2ee] p-2",
                  selectedCharacterId === sticker.id && "ring-2 ring-[#ba968a]"
                )}
              >
                <Image
                  src={sticker.src}
                  alt={sticker.name}
                  width={84}
                  height={84}
                  unoptimized
                  className="mx-auto h-16 w-16 object-contain"
                />
                <span className="line-clamp-1 text-[11px]">{sticker.name}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-xs text-[#86665e]">No stickers found in `public/characters/stickers`.</p>
        </Card>
      )}
    </div>
  );
}
