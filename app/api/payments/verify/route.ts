import { NextResponse } from "next/server";
import { verifyPaystack } from "@/lib/payments/paystack";
import { finalizePurchase } from "@/lib/payments/finalize";
import {
  BASE_EXPORT_AMOUNT_NGN,
  PREMIUM_EFFECT_AMOUNT_NGN,
  getCheckoutQuote
} from "@/lib/premium";
import { getProjectById } from "@/lib/server/data";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");
    if (!reference) {
      return NextResponse.json({ error: "reference is required." }, { status: 400 });
    }
    if (!env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: "PAYSTACK_SECRET_KEY is missing. Add it to your .env.local and restart dev server." },
        { status: 400 }
      );
    }

    const verified = await verifyPaystack(reference);
    if (!verified.status || verified.data.status !== "success") {
      return NextResponse.json({ error: "Payment not successful yet." }, { status: 400 });
    }

    const metadata = verified.data.metadata ?? {};
    const projectId = String(metadata.projectId ?? "");
    if (!projectId) {
      return NextResponse.json({ error: "Missing project metadata." }, { status: 400 });
    }
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const quote = getCheckoutQuote(project);
    const metadataUnits = Math.max(0, Number(metadata.premiumUnits ?? 0) || 0);
    const metadataExpectedAmount = BASE_EXPORT_AMOUNT_NGN + metadataUnits * PREMIUM_EFFECT_AMOUNT_NGN;
    const expectedAmount = Math.max(quote.totalAmount, metadataExpectedAmount);
    const checkoutType = quote.premiumUnits > 0 || metadataUnits > 0 ? "premium" : "export";
    const amount = verified.data.amount / 100;

    if (amount < expectedAmount) {
      return NextResponse.json({ error: "Payment amount does not match project total." }, { status: 400 });
    }

    const result = await finalizePurchase({
      projectId,
      type: checkoutType,
      reference: verified.data.reference,
      amount,
      currency: verified.data.currency
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
