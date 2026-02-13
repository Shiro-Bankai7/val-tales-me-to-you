import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StoryPlayer } from "@/components/preview/story-player";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getProjectById, getPublishedByProject, getReactionSummary } from "@/lib/server/data";
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
  const reactions = published ? await getReactionSummary(published.slug) : [];

  return (
    <div className="space-y-3 p-3 pb-5">
      <Card className="space-y-2">
        <p className="text-sm font-semibold">Preview mode</p>
        <Link href={`/checkout?projectId=${params.projectId}`} className="block">
          <Button>Publish with payment</Button>
        </Link>
        {published ? (
          <p className="text-xs text-[#81625a]">
            Share link: <span className="font-medium">{`/tale/${published.slug}`}</span>
          </p>
        ) : null}
        {reactions.length ? (
          <div className="space-y-1 text-xs text-[#81625a]">
            <p>{reactions.length} reaction notification(s) received.</p>
            {reactions.slice(0, 3).map((item, index) => (
              <p key={`${item.reaction}-${index}`} className="rounded-xl border border-[#d9bfb5] bg-[#f7ece8] px-2 py-1">
                {item.reaction}
                {item.reply_text ? ` — ${item.reply_text}` : ""}
              </p>
            ))}
          </div>
        ) : null}
      </Card>
      <StoryPlayer project={project} narrationUrl={published?.narration_url} mode="preview" />
    </div>
  );
}
