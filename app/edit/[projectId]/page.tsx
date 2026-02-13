import { notFound } from "next/navigation";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { getProjectById, getPublishedByProject } from "@/lib/server/data";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: { projectId: string } }) {
  try {
    const project = await getProjectById(params.projectId);
    if (!project) {
      notFound();
    }
    const published = await getPublishedByProject(params.projectId);
    return <EditorWorkspace project={project} exportedSlug={published?.slug} />;
  } catch {
    return (
      <div className="p-3">
        <p className="rounded-2xl border border-[#d7bbb1] bg-[#f8efeb] p-3 text-sm text-[#6f5049]">
          Unable to load project. Confirm Supabase env vars and migrations are set.
        </p>
      </div>
    );
  }
}
