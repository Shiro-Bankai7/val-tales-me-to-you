import { readdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

const customLabels: Record<string, string> = {
  download: "Cute Sticker",
  "Lovely Cute Quby Cheek Meme Face Sticker": "Shy Quby"
};

const packLabels: Record<string, string> = {
  ant: "Anime",
  cnt: "Kitty",
  pnt: "Quby"
};

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function toLabel(filename: string) {
  const base = filename.replace(/\.[^/.]+$/, "").trim();

  if (customLabels[base]) {
    return customLabels[base];
  }

  const packed = base.match(/^([a-z]+)(\d+)$/i);
  if (packed) {
    const [, prefixRaw, numberRaw] = packed;
    const prefix = prefixRaw.toLowerCase();
    const pack = packLabels[prefix] ?? toTitleCase(prefix);
    return `${pack} ${numberRaw}`;
  }

  return toTitleCase(
    base
      .replaceAll(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\bsticker\b/gi, "")
      .replace(/\bmeme\b/gi, "")
      .trim()
  );
}

export async function GET() {
  try {
    const stickersPath = path.join(process.cwd(), "public", "characters", "stickers");
    const entries = await readdir(stickersPath, { withFileTypes: true });
    const stickers = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => supportedExtensions.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        id: `/characters/stickers/${name}`,
        name: toLabel(name),
        src: `/characters/stickers/${name}`
      }));

    return NextResponse.json({ stickers });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message, stickers: [] }, { status: 500 });
  }
}
