import crypto from "crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { finalizePurchase } from "@/lib/payments/finalize";
import {
  BASE_EXPORT_AMOUNT_NGN,
  PREMIUM_EFFECT_AMOUNT_NGN,
  getCheckoutQuote
} from "@/lib/premium";
import { getProjectById } from "@/lib/server/data";

export async function POST(request: Request) {
  try {
    if (!env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "Paystack secret missing." }, { status: 500 });
    }

    const signature = request.headers.get("x-paystack-signature") ?? "";
    const rawBody = await request.text();
    const hash = crypto.createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as {
      event: string;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
        metadata?: Record<string, unknown>;
      };
    };

    if (body.event !== "charge.success" || !body.data) {
      return NextResponse.json({ ok: true });
    }

    const metadata = body.data.metadata ?? {};
    const projectId = String(metadata.projectId ?? "");
    if (!projectId || !body.data.reference) {
      return NextResponse.json({ ok: true });
    }
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ ok: true });
    }

    const quote = getCheckoutQuote(project);
    const metadataUnits = Math.max(0, Number(metadata.premiumUnits ?? 0) || 0);
    const metadataExpectedAmount = BASE_EXPORT_AMOUNT_NGN + metadataUnits * PREMIUM_EFFECT_AMOUNT_NGN;
    const checkoutType = quote.premiumUnits > 0 || metadataUnits > 0 ? "premium" : "export";
    const amount = Number(body.data.amount ?? 0) / 100;
    const expectedAmount = Math.max(quote.totalAmount, metadataExpectedAmount);

    if (amount < expectedAmount) {
      return NextResponse.json({ ok: true });
    }

    await finalizePurchase({
      projectId,
      type: checkoutType,
      reference: body.data.reference,
      amount,
      currency: String(body.data.currency ?? "NGN")
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
