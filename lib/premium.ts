import { templates, vibes } from "@/lib/templates";
import type { ProjectRecord, PurchaseType } from "@/lib/types";

export const BASE_EXPORT_AMOUNT_NGN = 1500;
export const PREMIUM_EFFECT_AMOUNT_NGN = 500;
export const FREE_PAGE_LIMIT = 10;
export const MAX_PAGE_LIMIT = 20;

type ProjectForPremiumCheck = Pick<ProjectRecord, "template_id" | "vibe" | "pages_json">;

type PremiumEffect = {
  key: "premium-template" | "premium-vibe" | "extended-length" | "secret-page";
  label: string;
};

export function getPremiumEffects(project: ProjectForPremiumCheck) {
  const effects: PremiumEffect[] = [];
  const pages = Array.isArray(project.pages_json) ? project.pages_json : [];
  const template = templates.find((item) => item.id === project.template_id);
  const vibe = vibes.find((item) => item.id === project.vibe);

  if (template?.premium) {
    effects.push({ key: "premium-template", label: "Premium template" });
  }
  if (vibe?.premium) {
    effects.push({ key: "premium-vibe", label: "Premium vibe music" });
  }
  if (pages.length > FREE_PAGE_LIMIT) {
    effects.push({ key: "extended-length", label: `Extended story length (${FREE_PAGE_LIMIT}+ pages)` });
  }
  if (pages.some((page) => page.secret)) {
    effects.push({ key: "secret-page", label: "Secret page unlock" });
  }

  return effects;
}

export function getPremiumRequirement(project: ProjectForPremiumCheck) {
  const effects = getPremiumEffects(project);
  return {
    required: effects.length > 0,
    reasons: effects.map((effect) => effect.label)
  };
}

export function getCheckoutQuote(project: ProjectForPremiumCheck) {
  const effects = getPremiumEffects(project);
  const premiumUnits = effects.length;
  const addonsAmount = premiumUnits * PREMIUM_EFFECT_AMOUNT_NGN;
  const totalAmount = BASE_EXPORT_AMOUNT_NGN + addonsAmount;
  const purchaseType: PurchaseType = premiumUnits > 0 ? "premium" : "export";

  return {
    baseAmount: BASE_EXPORT_AMOUNT_NGN,
    premiumUnits,
    premiumEffects: effects,
    addonsAmount,
    totalAmount,
    purchaseType
  };
}
