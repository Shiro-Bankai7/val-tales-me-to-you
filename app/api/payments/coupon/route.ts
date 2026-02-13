import { NextResponse } from "next/server";
import { applyCoupon, getCouponUsageCount } from "@/lib/server/data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectId?: string;
      code?: string;
    };

    if (!body.projectId || !body.code) {
      return NextResponse.json({ error: "projectId and code are required." }, { status: 400 });
    }

    const code = body.code.toUpperCase();
    if (code !== "SHIROI") {
      return NextResponse.json({ error: "Invalid discount code." }, { status: 400 });
    }

    const usageCount = await getCouponUsageCount(code);
    if (usageCount >= 5) {
      return NextResponse.json({ error: "Discount code has reached its usage limit." }, { status: 400 });
    }

    const published = await applyCoupon(body.projectId, code);

    return NextResponse.json({
      success: true,
      publishedUrl: `${new URL(request.url).origin}/tale/${published.slug}`
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
