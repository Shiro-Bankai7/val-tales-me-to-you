import { notFound } from "next/navigation";
import { StoryPlayer } from "@/components/preview/story-player";
import { getPublishedBySlug } from "@/lib/server/data";

export const dynamic = "force-dynamic";

export default async function PublicTalePage({ params }: { params: { slug: string } }) {
  const data = await getPublishedBySlug(params.slug);
  if (!data?.projects) {
    notFound();
  }

  return (
    <StoryPlayer
      project={data.projects}
      narrationUrl={data.narration_url}
      mode="public"
      slug={params.slug}
      exitHref="/"
    />
  );
}
