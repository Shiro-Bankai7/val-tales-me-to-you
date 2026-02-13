"use client";

import { vibes } from "@/lib/templates";
import { cn } from "@/lib/utils";
import type { VibeId } from "@/lib/types";

export function VibePicker({
  value,
  onChange,
  isPremium: _isPremium
}: {
  value: VibeId;
  onChange: (value: VibeId) => void;
  isPremium: boolean;
}) {
  return (
    <div className="flex w-full max-w-full gap-2 overflow-x-auto pb-1">
      {vibes.map((vibe) => {
        return (
          <button
            key={vibe.id}
            type="button"
            onClick={() => onChange(vibe.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-xs font-medium",
              value === vibe.id
                ? "border-[#c79e91] bg-[#bf978c] text-[#fff8f4]"
                : "border-[#d4b7ad] bg-[#f5e8e3] text-[#6f5049]"
            )}
          >
            <span className="mr-1">Music</span>
            {vibe.label}
            {vibe.premium ? <span className="ml-1">[Premium]</span> : null}
          </button>
        );
      })}
    </div>
  );
}
