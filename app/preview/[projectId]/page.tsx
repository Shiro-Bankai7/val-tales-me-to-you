import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StoryPlayer } from "@/components/preview/story-player";
import { getProjectById, getPublishedByProject } from "@/lib/server/data";
import type { ProjectRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getProjectWithFallback(projectId: string) {
  const direct = await getProjectById(projectId);
  if (direct) {
    return direct;
  }

  const requestHeaders = headers();
  const host = requestHeaders.get("host");
  if (!host) {
    return null;
  }

  const protocol = host.includes("localhost") ? "http" : "https";
  const response = await fetch(`${protocol}://${host}/api/projects/${projectId}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { project?: ProjectRecord };
  return data.project ?? null;
}

export default async function PreviewPage({ params }: { params: { projectId: string } }) {
  const project = await getProjectWithFallback(params.projectId);
  if (!project) {
    notFound();
  }

  const published = await getPublishedByProject(params.projectId);

  return (
    <StoryPlayer
      project={project}
      narrationUrl={published?.narration_url}
      mode="preview"
      exitHref={`/edit/${params.projectId}`}
    />
  );
}
