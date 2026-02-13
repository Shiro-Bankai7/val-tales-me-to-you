"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { templates } from "@/lib/templates";
import { cn } from "@/lib/utils";
import type { TemplateId } from "@/lib/types";

export function TemplatePicker({
  value,
  onChange,
  isPremium: _isPremium
}: {
  value: TemplateId;
  onChange: (value: TemplateId) => void;
  isPremium: boolean;
}) {
  return (
    <div className="space-y-2">
      {templates.map((template) => {
        return (
          <button
            key={template.id}
            className="w-full text-left"
            onClick={() => onChange(template.id)}
            type="button"
          >
            <Card
              className={cn(
                "flex items-center gap-2 p-2.5",
                value === template.id && "ring-2 ring-[#ba968a]"
              )}
            >
              <Image
                alt={template.label}
                src={template.previewImage}
                width={72}
                height={72}
                className="h-16 w-16 rounded-xl object-cover"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">{template.label}</p>
                <p className="text-xs text-[#86665e]">{template.transition} transition</p>
              </div>
              {template.premium ? (
                <span className="rounded-full bg-[#ead4cb] px-2 py-1 text-[11px] font-semibold text-[#8a6057]">
                  Premium
                </span>
              ) : null}
            </Card>
          </button>
        );
      })}
    </div>
  );
}
