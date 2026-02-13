import { NextResponse } from "next/server";
import { getProjectById, updateProjectById } from "@/lib/server/data";
import type { StoryPage, TemplateId, VibeId } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { projectId: string } }) {
  try {
    const project = await getProjectById(params.projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { projectId: string } }) {
  try {
    const body = (await request.json()) as {
      templateId?: TemplateId;
      vibe?: VibeId;
      pages?: StoryPage[];
    };

    const project = await updateProjectById(params.projectId, {
      template_id: body.templateId,
      vibe: body.vibe,
      pages_json: body.pages
    });
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
