import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getProjectById, saveNarrationUrl } from "@/lib/server/data";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

export async function POST(request: Request) {
  try {
    if (!env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "ELEVENLABS_API_KEY missing." }, { status: 500 });
    }

    const body = (await request.json()) as { projectId?: string; text?: string };
    if (!body.projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }

    const project = await getProjectById(body.projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    if (!project.is_premium) {
      return NextResponse.json({ error: "Premium required for narration." }, { status: 403 });
    }

    const sourceText =
      body.text ??
      project.pages_json
        .slice(0, 20)
        .map((page) => `${page.title}. ${page.body}. ${page.signature ?? ""}`)
        .join("\n");

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: sourceText.slice(0, 5000),
        model_id: "eleven_turbo_v2_5"
      })
    });

    if (!ttsResponse.ok) {
      return NextResponse.json({ error: "ElevenLabs generation failed." }, { status: 500 });
    }

    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const fileBuffer = Buffer.from(audioArrayBuffer);
    const filePath = `${project.id}/${Date.now()}-narration.mp3`;

    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.storage.from("narrations").upload(filePath, fileBuffer, {
      contentType: "audio/mpeg",
      upsert: true
    });
    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from("narrations").getPublicUrl(filePath);
    await saveNarrationUrl(project.id, data.publicUrl);

    return NextResponse.json({
      narrationUrl: data.publicUrl
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

