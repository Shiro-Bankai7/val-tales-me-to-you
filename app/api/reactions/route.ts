import { NextResponse } from "next/server";
import { addReaction } from "@/lib/server/data";
import type { ReactionPayload } from "@/lib/types";

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
