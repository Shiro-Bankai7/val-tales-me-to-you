import { addPurchaseLog, createOrGetPublishedTale, markProjectPremium } from "@/lib/server/data";
import { env } from "@/lib/env";

export async function finalizePurchase(payload: {
  projectId: string;
  type: "export" | "premium";
  reference: string;
  amount: number;
  currency: string;
}) {
  await addPurchaseLog({
    type: payload.type,
    providerRef: payload.reference,
    amount: payload.amount,
    currency: payload.currency
  });

  if (payload.type === "premium") {
    await markProjectPremium(payload.projectId);
    const published = await createOrGetPublishedTale(payload.projectId, true);
    return {
      message: "Payment confirmed. Premium is unlocked and your tale is live.",
      publishedUrl: `${env.APP_BASE_URL}/tale/${published.slug}`
    };
  }

  const published = await createOrGetPublishedTale(payload.projectId, false);
  return {
    message: "Payment confirmed. Your private tale link is ready.",
    publishedUrl: `${env.APP_BASE_URL}/tale/${published.slug}`
  };
}
