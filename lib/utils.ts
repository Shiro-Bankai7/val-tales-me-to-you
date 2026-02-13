import clsx from "clsx";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(amount);
}

export function isPremiumFeatureBlocked(isPremium: boolean, featurePremium?: boolean) {
  return Boolean(featurePremium && !isPremium);
}

