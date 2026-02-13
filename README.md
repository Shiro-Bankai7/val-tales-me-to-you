# Valentines Tales (Mobile-Only MVP)

Valentines Tales is a mobile-first Next.js app where users create romantic story presentations with templates, character stickers, vibe music, paid private sharing, and premium narration.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (mobile-only shell, touch-friendly UI)
- Supabase (projects, publishing, purchases, reactions, narration storage)
- Paystack (checkout, verify, webhook)
- ElevenLabs (premium narration generation)
- Zustand (editor state)

## Routes

- `/` landing
- `/create` template + character + vibe setup
- `/edit/[projectId]` story editor with live preview blocks
- `/preview/[projectId]` preview playback + reaction notifications
- `/checkout?projectId=...` pay to export or upgrade premium
- `/tale/[slug]` unlisted public playback
- `/api/payments/initialize`
- `/api/payments/verify`
- `/api/payments/webhook`
- `/api/elevenlabs/tts`
- `/api/projects`
- `/api/projects/[projectId]`
- `/api/reactions`

## Features Implemented

- 8 templates: Papyrus Paper, Love Card, Phone Mockup Texts, Door Reveal, Tech Orbit, Neon Network, Marble Note, Door Shadow
- Sticker directory picker from `public/characters/stickers`
- Story editor with page creation, smart line breaks, likely-name detection, highlight formatting
- Vibe selector mapped to audio tracks
- Playback engine with start interaction, transitions, music toggle, narration toggle
- Secret page mechanic (tap character 5 times to reveal secret pages)
- Paid export flow (₦1,500) to publish unlisted `/tale/[slug]`
- Premium flow (₦5,000) for narration and premium content
- Reaction page (6 reactions) persisted as creator notifications (premium-only)

## Environment Variables

Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYSTACK_SECRET_KEY=
ELEVENLABS_API_KEY=
APP_BASE_URL=http://localhost:3000
```

## Supabase Setup

1. Create a Supabase project.
2. Run SQL from `supabase/schema.sql`.
3. Confirm the `narrations` bucket exists and is public.
4. (Optional) Add RLS policies if deploying multi-user auth.

## Paystack Setup

1. Set `PAYSTACK_SECRET_KEY`.
2. Configure webhook URL to:
   - `https://<your-domain>/api/payments/webhook`
3. Payment metadata includes `projectId` and `type` (`export` or `premium`).

## ElevenLabs Setup

1. Set `ELEVENLABS_API_KEY`.
2. Premium users can generate narration from `/edit/[projectId]`.
3. Narration is uploaded to Supabase Storage and attached to published tale.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Notes

- This MVP is intentionally mobile-locked through a centered max-width shell.
- Share links are unlisted by long random slug.
- Payment verification is server-side only.
- ElevenLabs/Paystack keys never touch client bundle.
