import { NextResponse } from "next/server";
import { addReaction, getReactionSummary } from "@/lib/server/data";
import type { ReactionPayload } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taleSlug = searchParams.get("taleSlug")?.trim();
    if (!taleSlug) {
      return NextResponse.json({ error: "taleSlug is required." }, { status: 400 });
    }

    const reactions = await getReactionSummary(taleSlug);
    return NextResponse.json({ reactions });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message, reactions: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReactionPayload;
    if (!body?.taleSlug || !body?.reaction) {
      return NextResponse.json({ error: "taleSlug and reaction are required." }, { status: 400 });
    }
    const replyText = typeof body.replyText === "string" ? body.replyText.trim().slice(0, 160) : undefined;

    await addReaction({ ...body, replyText });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
