import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="p-3">
      <Card className="space-y-2 text-center">
        <p className="text-lg font-semibold">Story not found</p>
        <p className="text-sm text-[#81625a]">The private link may be expired or invalid.</p>
        <Link href="/" className="text-sm text-[#8f665d] underline">
          Back home
        </Link>
      </Card>
    </div>
  );
}
