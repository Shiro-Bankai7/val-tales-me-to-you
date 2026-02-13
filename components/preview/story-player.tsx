"use client";

import Link from "next/link";
import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { characterPacks, getTemplateById, vibes } from "@/lib/templates";
import type { ProjectRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StoryPageCard } from "@/components/preview/story-page-card";
import { cn } from "@/lib/utils";

const REACTIONS = ["blush", "scream", "cry", "omo", "speechless", "love"] as const;
const AUTO_ADVANCE_SECONDS = 7;
const AUTO_ADVANCE_MS = AUTO_ADVANCE_SECONDS * 1000;
const DOOR_SEQUENCE_IMAGES = [
  "/templates/door1.jpg",
  "/templates/door2.jpg",
  "/templates/door3.jpg",
  "/templates/door4.jpg",
  "/templates/door5.jpg"
];

const templateTransitionClass: Record<ProjectRecord["template_id"], string> = {
  papyrus: "vt-enter-book",
  "love-card": "vt-enter-card",
  "phone-texts": "vt-enter-tech",
  "door-reveal": "vt-enter-door"
};

export function StoryPlayer({
  project,
  narrationUrl,
  mode,
  slug,
  exitHref
}: {
  project: ProjectRecord;
  narrationUrl?: string | null;
  mode: "preview" | "public";
  slug?: string;
  exitHref?: string;
}) {
  const [started, setStarted] = useState(mode === "preview");
  const [index, setIndex] = useState(0);
  const [timerProgress, setTimerProgress] = useState(0);
  const [musicOn, setMusicOn] = useState(true);
  const [narrationOn, setNarrationOn] = useState(false);
  const [hiddenUnlocked, setHiddenUnlocked] = useState(false);
  const [doorStage, setDoorStage] = useState<"door" | "card">("door");
  const [cluesUnlocked, setCluesUnlocked] = useState<Record<number, boolean>>({});
  const [reactableOpen, setReactableOpen] = useState(false);
  const [taps, setTaps] = useState(0);
  const [reactionSent, setReactionSent] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  const narrationRef = useRef<HTMLAudioElement>(null);
  const trackStartAppliedRef = useRef<string | null>(null);

  const template = getTemplateById(project.template_id);
  const isDoorTemplate = project.template_id === "door-reveal";
  const pages = useMemo(() => {
    if (hiddenUnlocked) {
      return project.pages_json;
    }
    return project.pages_json.filter((page) => !page.secret);
  }, [hiddenUnlocked, project.pages_json]);

  const selectedCharacterById = useMemo(() => {
    const entries = characterPacks.flatMap((pack) => pack.characters);
    return new Map(entries.map((character) => [character.id, character.src]));
  }, []);

  const selectedVibe = vibes.find((vibe) => vibe.id === project.vibe);
  const currentPage = pages[index];
  const isLastPage = pages.length > 0 && index >= pages.length - 1;
  const isPreviewMode = mode === "preview";
  const isDoorCardStage = !isDoorTemplate || doorStage === "card";
  const currentClueUnlocked = !isDoorTemplate || Boolean(cluesUnlocked[index]);
  const canAdvance = pages.length > 0 && !isLastPage && isDoorCardStage && currentClueUnlocked;

  useEffect(() => {
    if (index > pages.length - 1) {
      setIndex(Math.max(0, pages.length - 1));
    }
  }, [index, pages.length]);

  useEffect(() => {
    if (!isDoorTemplate) {
      setDoorStage("card");
      return;
    }
    setDoorStage("door");
  }, [index, isDoorTemplate]);

  useEffect(() => {
    if (!isLastPage) {
      setReactableOpen(false);
    }
  }, [isLastPage, index]);

  useEffect(() => {
    if (!started || !pages.length || isLastPage || !isDoorCardStage || !currentClueUnlocked) {
      setTimerProgress(0);
      return;
    }

    const startTime = Date.now();
    setTimerProgress(0);
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / AUTO_ADVANCE_MS);
      setTimerProgress(progress);
      if (progress >= 1) {
        window.clearInterval(interval);
        setIndex((value) => Math.min(pages.length - 1, value + 1));
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [started, pages.length, isLastPage, isDoorCardStage, currentClueUnlocked, index]);

  function handleCharacterTap() {
    const next = taps + 1;
    setTaps(next);
    if (next >= 5) {
      setHiddenUnlocked(true);
    }
  }

  function goPreviousPage() {
    setIndex((value) => Math.max(0, value - 1));
  }

  function goNextPage() {
    if (!canAdvance) return;
    setIndex((value) => Math.min(pages.length - 1, value + 1));
  }

  function handleCardSurfaceClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (!isDoorCardStage) return;

    if (isDoorTemplate && !currentClueUnlocked) {
      unlockCurrentClue();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const tapX = event.clientX - rect.left;
    const sideZoneWidth = rect.width * 0.26;

    if (tapX <= sideZoneWidth) {
      goPreviousPage();
      return;
    }

    if (tapX >= rect.width - sideZoneWidth) {
      goNextPage();
    }
  }

  function openDoor() {
    if (!isDoorTemplate) return;
    setDoorStage("card");
  }

  function unlockCurrentClue() {
    if (!isDoorTemplate) return;
    setCluesUnlocked((prev) => ({ ...prev, [index]: true }));
  }

  function toggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    if (!bgAudioRef.current) return;
    if (next) {
      applyTrackStartIfNeeded();
      void bgAudioRef.current.play();
      return;
    }
    bgAudioRef.current.pause();
  }

  function toggleNarration() {
    const next = !narrationOn;
    setNarrationOn(next);
    if (!narrationRef.current) return;
    if (next) {
      void narrationRef.current.play();
      return;
    }
    narrationRef.current.pause();
  }

  async function sendReaction(reaction: (typeof REACTIONS)[number]) {
    if (!slug || !project.is_premium || reactionSent) return;
    const response = await fetch("/api/reactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        taleSlug: slug,
        reaction,
        replyText: replyText.trim() || undefined
      })
    });
    if (response.ok) {
      setReactionSent(reaction);
      setReplyText("");
    }
  }

  function applyTrackStartIfNeeded() {
    const audio = bgAudioRef.current;
    if (!audio || !selectedVibe?.trackStartSeconds) return;
    const key = `${selectedVibe.id}:${selectedVibe.trackStartSeconds}`;
    if (trackStartAppliedRef.current === key) return;

    audio.currentTime = selectedVibe.trackStartSeconds;
    trackStartAppliedRef.current = key;
  }

  return (
    <div className="space-y-4">
      {!started ? (
        <Card className="text-center">
          <p className="text-sm text-[#7f6058]">Template interaction</p>
          {template.startInteractionImage ? (
            <img
              src={template.startInteractionImage}
              alt={template.label}
              className="mx-auto mb-2 h-20 w-20 rounded-2xl border border-[#d8bcb2] object-cover"
            />
          ) : null}
          <p className="mb-3 text-base font-semibold">
            {template.startInteractionIcon ? `${template.startInteractionIcon} ` : ""}
            {template.startInteractionLabel}
          </p>
          <Button onClick={() => setStarted(true)}>Start</Button>
        </Card>
      ) : null}

      {started && currentPage ? (
        <div className="relative">
          {isDoorTemplate && doorStage === "door" ? (
            <Card className="relative min-h-[360px] overflow-hidden p-0">
              <img
                src={DOOR_SEQUENCE_IMAGES[index % DOOR_SEQUENCE_IMAGES.length]}
                alt="Door clue"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0b173ca8] via-[#11204ca0] to-[#00000066]" />
              <div className="relative z-10 flex h-full min-h-[360px] flex-col items-center justify-center p-5 text-center text-[#f7eef6]">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#e3d8f0]">Treasure clue {index + 1}</p>
                <p className="mb-5 text-lg font-semibold">Enter the door to find this clue card</p>
                <Button className="w-auto px-5" onClick={openDoor}>
                  Enter Door
                </Button>
              </div>
            </Card>
          ) : (
            <div
              key={`${currentPage.id}-${index}`}
              className={templateTransitionClass[project.template_id]}
              onClick={handleCardSurfaceClick}
            >
              <StoryPageCard
                page={currentPage}
                templateId={project.template_id}
                characterSrc={
                  currentPage.characterId
                    ? selectedCharacterById.get(currentPage.characterId) ??
                      (currentPage.characterId.startsWith("/characters/") ||
                      currentPage.characterId.startsWith("data:image/")
                        ? currentPage.characterId
                        : undefined)
                    : undefined
                }
                onCharacterTap={handleCharacterTap}
              />
            </div>
          )}

          {isDoorTemplate && isDoorCardStage && !currentClueUnlocked ? (
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-4">
              <p className="rounded-full border border-[#d7b8ad] bg-[#fff2ec] px-4 py-2 text-xs font-semibold text-[#7a5048]">
                Tap the clue card to unlock the next door
              </p>
            </div>
          ) : null}

          {isDoorCardStage ? (
            <>
              <div className="pointer-events-none absolute right-2 top-2">
                <div
                  className="relative h-10 w-10 rounded-full border border-[#dfc3b9]"
                  style={{
                    background: `conic-gradient(#bf978c ${timerProgress * 360}deg, #f3ddd7 0deg)`
                  }}
                >
                  <div className="absolute inset-[4px] flex items-center justify-center rounded-full bg-[#fff8f5] text-[10px] font-semibold text-[#7a554d]">
                    {Math.max(0, Math.ceil(AUTO_ADVANCE_SECONDS - timerProgress * AUTO_ADVANCE_SECONDS))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {started && !pages.length ? (
        <Card>
          <p className="text-xs text-[#87675f]">No visible pages yet. Add content from the editor.</p>
        </Card>
      ) : null}

      {started ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>
              Page {pages.length ? Math.min(index + 1, pages.length) : 0} / {pages.length}
            </span>
            <span className="rounded-full border border-[#d2b5ab] bg-[#f3e5df] px-2 py-1 text-xs text-[#6f5049]">
              {template.transition}
            </span>
          </div>
          <p className="text-xs text-[#86665e]">
            Tap left or right sides of the card to move. Auto-next happens every {AUTO_ADVANCE_SECONDS} seconds.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={toggleMusic}>
              {musicOn ? "Music On" : "Music Off"}
            </Button>
            <Button variant="secondary" disabled={!narrationUrl} onClick={toggleNarration}>
              {narrationOn ? "Narration On" : "Narration Off"}
            </Button>
          </div>
        </Card>
      ) : null}

      {started && isPreviewMode ? (
        <Card className="space-y-2">
          <p className="text-xs text-[#87675f]">Preview mode</p>
          <div className={cn("grid gap-2", exitHref ? "grid-cols-2" : "grid-cols-1")}>
            {exitHref ? (
              <Link
                href={exitHref}
                className="touch-btn rounded-full border border-[#d2b5ab] bg-[#f3e5df] px-4 py-2.5 text-center text-sm font-semibold text-[#6a4b44] transition active:scale-[0.99]"
              >
                Back to Editor
              </Link>
            ) : null}
            <Link
              href={`/checkout?projectId=${project.id}`}
              className="touch-btn rounded-full border border-[#cda79b] bg-[#bf978c] px-4 py-2.5 text-center text-sm font-semibold text-[#fff8f4] transition active:scale-[0.99]"
            >
              Publish
            </Link>
          </div>
        </Card>
      ) : null}

      {started && isLastPage ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Reactable 💗</p>
            {project.is_premium ? (
              <Button
                variant="secondary"
                className="!min-h-0 h-8 w-auto px-3 py-1 text-xs"
                onClick={() => setReactableOpen((value) => !value)}
              >
                {reactableOpen ? "Hide Reactable" : "Open Reactable"}
              </Button>
            ) : null}
          </div>
          {project.is_premium ? (
            reactableOpen ? (
              <>
                <p className="text-xs text-[#87675f]">React and send a tiny reply clue back to the creator.</p>
                <div className="grid grid-cols-3 gap-2">
                  {REACTIONS.map((reaction) => (
                    <button
                      key={reaction}
                      className={cn(
                        "rounded-xl border border-[#d8bdb3] bg-[#fbf3ef] px-3 py-2 text-sm text-[#6f5049]",
                        reactionSent === reaction && "border-[#c79e91] bg-[#ead5cd] text-[#6a4b44]"
                      )}
                      onClick={() => void sendReaction(reaction)}
                      type="button"
                    >
                      {reaction}
                    </button>
                  ))}
                </div>
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value.slice(0, 160))}
                  placeholder="Optional small reply for your lover..."
                  className="vt-input min-h-[76px] resize-none text-sm"
                />
                <p className="text-[11px] text-[#886860]">Premium: reaction + reply is sent to creator notifications.</p>
              </>
            ) : (
              <p className="text-xs text-[#87675f]">Tap “Open Reactable” to react and leave a reply.</p>
            )
          ) : (
            <p className="text-xs text-[#87675f]">Premium only: reactions notify the creator.</p>
          )}
        </Card>
      ) : null}

      {selectedVibe ? (
        <audio
          ref={bgAudioRef}
          src={selectedVibe.trackUrl}
          autoPlay
          loop
          className="hidden"
          onCanPlay={() => {
            applyTrackStartIfNeeded();
            if (musicOn) {
              void bgAudioRef.current?.play().catch(() => {});
            }
          }}
        />
      ) : null}
      {narrationUrl ? <audio ref={narrationRef} src={narrationUrl} className="hidden" /> : null}
    </div>
  );
}
