"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatNaira } from "@/lib/utils";
import { getCheckoutQuote } from "@/lib/premium";
import type { ProjectRecord } from "@/lib/types";

export function CheckoutPanel({
  projectId,
  initialReference
}: {
  projectId?: string;
  initialReference?: string;
}) {
  const searchParams = useSearchParams();
  const referenceFromQuery =
    initialReference ?? searchParams.get("ref") ?? searchParams.get("reference");
  const [email, setEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [quote, setQuote] = useState<ReturnType<typeof getCheckoutQuote> | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");
  const [publishedUrl, setPublishedUrl] = useState<string>("");
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    if (referenceFromQuery) {
      void verifyPayment(referenceFromQuery);
    }
  }, [referenceFromQuery]);

  useEffect(() => {
    if (!projectId) {
      setQuote(null);
      return;
    }

    let mounted = true;
    fetch(`/api/projects/${projectId}`)
      .then((response) => response.json())
      .then((data: { project?: ProjectRecord }) => {
        if (!mounted || !data.project) return;
        setQuote(getCheckoutQuote(data.project));
      })
      .catch(() => {
        if (mounted) {
          setQuote(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  async function startCheckout() {
    if (!projectId) {
      setResult("Missing project id. Open checkout from your editor and try again.");
      return;
    }

    setBusy(true);
    setResult("");
    try {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId,
          email,
          type: quote?.purchaseType ?? "export"
        })
      });
      const data = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? "Failed to initialize payment.");
      }
      window.location.href = data.checkoutUrl;
    } catch (error) {
      setResult((error as Error).message);
      setBusy(false);
    }
  }

  async function applyCoupon() {
    if (!projectId || !couponCode) return;
    setApplyingCoupon(true);
    setResult("");
    try {
      const response = await fetch("/api/payments/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, code: couponCode })
      });
      const data = (await response.json()) as { publishedUrl?: string; error?: string };
      if (response.ok && data.publishedUrl) {
        setPublishedUrl(data.publishedUrl);
        setResult(`Success! Your tale is published for free 💌: ${data.publishedUrl}`);
      } else {
        setResult(data.error ?? "Failed to apply coupon.");
      }
    } catch (error) {
      setResult((error as Error).message);
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function verifyPayment(reference: string) {
    setBusy(true);
    const response = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`);
    const data = (await response.json()) as { publishedUrl?: string; message?: string; error?: string };
    if (response.ok && data.publishedUrl) {
      setPublishedUrl(data.publishedUrl);
      setResult(`All set 💌 Your private link is ready: ${data.publishedUrl}`);
    } else if (response.ok) {
      setResult(data.message ?? "Payment processed.");
    } else {
      setResult(data.error ?? "Unable to verify payment.");
    }
    setBusy(false);
  }

  async function copyLink() {
    if (!publishedUrl) return;
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setCopyState("Copied");
      setTimeout(() => setCopyState(""), 1800);
    } catch {
      setCopyState("Copy failed");
      setTimeout(() => setCopyState(""), 1800);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <p className="text-sm font-semibold">Checkout</p>
        {projectId ? (
          <>
            <input
              type="email"
              placeholder="Email for confirmation"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="vt-input text-sm"
            />
            <div className="rounded-2xl border border-[#d8bcb2] bg-[#f9f1ed] p-3 text-xs text-[#6f5049]">
              <p>Base export: {formatNaira(1500)}</p>
              {quote?.premiumUnits ? (
                <>
                  <p className="mt-1">Premium effects: {quote.premiumUnits} x {formatNaira(500)}</p>
                  <ul className="mt-1 space-y-1">
                    {quote.premiumEffects.map((effect) => (
                      <li key={effect.key}>+ {effect.label}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1">No premium effects selected.</p>
              )}
              <p className="mt-2 text-sm font-semibold">Total: {formatNaira(quote?.totalAmount ?? 1500)}</p>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold text-[#81625a]">Have a discount code?</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Code (e.g. SHIROI)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="vt-input text-xs"
                />
                <Button
                  variant="secondary"
                  className="!min-h-0 h-auto w-auto px-4 py-2 text-xs"
                  disabled={applyingCoupon || !couponCode || busy}
                  onClick={() => void applyCoupon()}
                >
                  {applyingCoupon ? "..." : "Apply"}
                </Button>
              </div>
            </div>

            <Button disabled={busy || !email || applyingCoupon} onClick={() => void startCheckout()}>
              {busy ? "Please wait..." : `Pay ${formatNaira(quote?.totalAmount ?? 1500)}`}
            </Button>
          </>
        ) : (
          <p className="text-xs text-[#7b5a52]">Verifying payment callback...</p>
        )}
      </Card>

      {referenceFromQuery ? (
        <Button variant="secondary" disabled={busy} onClick={() => void verifyPayment(referenceFromQuery)}>
          Check payment status
        </Button>
      ) : null}

      {result ? <p className="rounded-xl border border-[#d7bbb1] bg-[#f8efeb] p-3 text-xs text-[#6e4f48]">{result}</p> : null}
      {publishedUrl ? (
        <div className="grid grid-cols-2 gap-2">
          <a
            href={publishedUrl}
            className="rounded-full border border-[#cda79b] bg-[#bf978c] px-3 py-2 text-center text-xs font-semibold text-[#fff8f4]"
          >
            Open Link
          </a>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-full border border-[#d0afa5] bg-[#f3e5df] px-3 py-2 text-xs font-semibold text-[#6f5049]"
          >
            {copyState || "Copy Link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
