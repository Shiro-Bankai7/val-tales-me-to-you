import { Suspense } from "react";
import { CreateFlow } from "@/components/editor/create-flow";

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="p-3 text-sm text-[#7f6058]">Loading...</div>}>
      <CreateFlow />
    </Suspense>
  );
}
