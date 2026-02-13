import { env } from "@/lib/env";

const PAYSTACK_API = "https://api.paystack.co";

async function paystackFetch<T>(path: string, init?: RequestInit) {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is missing.");
  }

  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const json = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(json.message ?? "Paystack request failed.");
  }
  return json;
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export async function initializePaystack(payload: {
  email: string;
  amountKobo: number;
  reference: string;
  metadata: Record<string, unknown>;
  callbackUrl?: string;
}) {
  return paystackFetch<PaystackInitResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      amount: payload.amountKobo,
      reference: payload.reference,
      metadata: payload.metadata,
      callback_url: payload.callbackUrl ?? `${env.APP_BASE_URL}/checkout?ref=${payload.reference}`
    })
  });
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: "success" | string;
    reference: string;
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  };
}

export async function verifyPaystack(reference: string) {
  return paystackFetch<PaystackVerifyResponse>(`/transaction/verify/${reference}`, {
    method: "GET"
  });
}
