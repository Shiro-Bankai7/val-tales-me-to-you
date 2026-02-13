const COMMON_NAMES = [
  "baby",
  "babe",
  "darling",
  "dear",
  "honey",
  "love",
  "sweetheart",
  "princess",
  "prince"
];

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function detectLikelyNames(text: string): string[] {
  const words = text.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  const customNicknames = COMMON_NAMES.filter((name) => text.toLowerCase().includes(name));
  return Array.from(new Set([...words, ...customNicknames])).slice(0, 8);
}

export function applySmartLineBreaks(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) =>
      paragraph
        .split(". ")
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .join(".\n")
    )
    .join("\n\n");
}

export function highlightText(text: string, names: string[]) {
  const safeText = escapeHtml(text);
  if (!names.length) {
    return safeText;
  }

  let formatted = safeText;
  names.forEach((name) => {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b(${escapedName})\\b`, "gi");
    formatted = formatted.replace(regex, "<mark>$1</mark>");
  });

  return formatted;
}
