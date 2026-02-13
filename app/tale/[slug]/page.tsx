import { notFound } from "next/navigation";
import { StoryPlayer } from "@/components/preview/story-player";
import { Card } from "@/components/ui/card";
import { getPublishedBySlug } from "@/lib/server/data";

export const dynamic = "force-dynamic";

export default async function PublicTalePage({ params }: { params: { slug: string } }) {
  const data = await getPublishedBySlug(params.slug);
  if (!data?.projects) {
    notFound();
  }

  return (
    <div className="space-y-3 p-3 pb-5">
      <Card className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-[#9b6f64]">Private Valentines Link</p>
        <h1 className="text-lg font-semibold">A story made just for you</h1>
      </Card>
      <StoryPlayer
        project={data.projects}
        narrationUrl={data.narration_url}
        mode="public"
        slug={params.slug}
      />
    </div>
  );
}
