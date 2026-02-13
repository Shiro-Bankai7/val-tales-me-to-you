import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { initializePaystack } from "@/lib/payments/paystack";
import { getCheckoutQuote } from "@/lib/premium";
import { getProjectById } from "@/lib/server/data";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      projectId?: string;
      type?: "export" | "premium";
    };

    if (!body.email || !body.projectId) {
      return NextResponse.json({ error: "email and projectId are required." }, { status: 400 });
    }
    if (!env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: "PAYSTACK_SECRET_KEY is missing. Add it to your .env.local and restart dev server." },
        { status: 400 }
      );
    }

    const project = await getProjectById(body.projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const quote = getCheckoutQuote(project);
    const checkoutType = quote.purchaseType;
    const amount = quote.totalAmount;
    const reference = `vt_${nanoid(12)}`;

    const result = await initializePaystack({
      email: body.email,
      amountKobo: amount * 100,
      reference,
      callbackUrl: `${env.APP_BASE_URL}/checkout?projectId=${encodeURIComponent(body.projectId)}&ref=${encodeURIComponent(reference)}`,
      metadata: {
        projectId: body.projectId,
        type: checkoutType,
        premiumUnits: quote.premiumUnits,
        totalAmount: quote.totalAmount
      }
    });

    return NextResponse.json({
      checkoutUrl: result.data.authorization_url,
      reference: result.data.reference,
      type: checkoutType,
      totalAmount: quote.totalAmount,
      premiumUnits: quote.premiumUnits
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
