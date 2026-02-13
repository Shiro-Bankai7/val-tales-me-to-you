import { NextResponse } from "next/server";
import { createDraftProject } from "@/lib/server/data";
import type { TemplateId, VibeId } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      templateId?: TemplateId;
      vibe?: VibeId;
      characterRefs?: string[];
    };

    if (!body.templateId || !body.vibe) {
      return NextResponse.json({ error: "templateId and vibe are required." }, { status: 400 });
    }

    const project = await createDraftProject({
      templateId: body.templateId,
      vibe: body.vibe,
      characterRefs: body.characterRefs ?? []
    });

    return NextResponse.json({ projectId: project.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

