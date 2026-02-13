"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { TemplatePicker } from "@/components/editor/template-picker";
import { VibePicker } from "@/components/editor/vibe-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { getTemplateById } from "@/lib/templates";
import type { TemplateId, VibeId } from "@/lib/types";

const VALID_TEMPLATES: TemplateId[] = ["papyrus", "love-card", "phone-texts", "door-reveal"];

export function CreateFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [templateId, setTemplateId] = useState<TemplateId>("papyrus");
  const [vibe, setVibe] = useState<VibeId>("romantic");
  const [openTemplateModal, setOpenTemplateModal] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const incomingTemplate = searchParams.get("template");
    if (incomingTemplate && VALID_TEMPLATES.includes(incomingTemplate as TemplateId)) {
      setTemplateId(incomingTemplate as TemplateId);
    }
  }, [searchParams]);

  async function createProject() {
    setBusy(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateId,
          vibe
        })
      });
      if (!response.ok) throw new Error("Unable to create project.");
      const data = (await response.json()) as { projectId: string };
      router.push(`/edit/${data.projectId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 p-3 pb-5 text-[#674a43]">
      <Card className="space-y-1">
        <h1 className="text-lg font-bold">Create your Valentines Tale</h1>
        <p className="text-sm text-[#82635b]">Pick a template and vibe to begin. Stickers are added in edit mode.</p>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-sm font-semibold">1. Template</h2>
        <button
          type="button"
          onClick={() => setOpenTemplateModal(true)}
          className="flex w-full items-center justify-between rounded-xl border border-[#d7bcb2] bg-[#fbf2ee] px-3 py-2"
        >
          <span className="text-sm">{getTemplateById(templateId).label}</span>
          <span className="text-xs text-[#87675f]">Change</span>
        </button>
      </Card>

      <Card className="space-y-2 overflow-hidden max-w-full">
        <h2 className="text-sm font-semibold">2. Vibe music</h2>
        <VibePicker value={vibe} onChange={setVibe} isPremium={false} />
      </Card>

      <Button disabled={busy} onClick={() => void createProject()}>
        {busy ? "Creating..." : "Start editing"}
      </Button>

      <Modal open={openTemplateModal} title="Choose template" onClose={() => setOpenTemplateModal(false)}>
        <TemplatePicker
          value={templateId}
          onChange={(next) => {
            setTemplateId(next);
            setOpenTemplateModal(false);
          }}
          isPremium={false}
        />
      </Modal>
    </div>
  );
}
