import Link from "next/link";
import { CheckoutPanel } from "@/components/editor/checkout-panel";
import { Card } from "@/components/ui/card";

export default function CheckoutPage({
  searchParams
}: {
  searchParams: { projectId?: string; ref?: string; reference?: string };
}) {
  const projectId = searchParams.projectId;
  const reference = searchParams.ref ?? searchParams.reference;

  if (!projectId && !reference) {
    return (
      <div className="p-3">
        <Card className="space-y-2">
          <p className="text-sm">Missing `projectId` and payment `reference`.</p>
          <Link href="/create" className="text-xs text-[#8f665d] underline">
            Go create a story first
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 pb-5">
      <Card className="space-y-1">
        <h1 className="text-lg font-bold">Publish your tale</h1>
        <p className="text-sm text-[#81625a]">Base export is NGN 1,500 + NGN 500 per premium effect in your project.</p>
      </Card>
      <CheckoutPanel projectId={projectId} initialReference={reference} />
    </div>
  );
}
