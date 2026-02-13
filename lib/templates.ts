import type { CharacterPack, TemplateDefinition, TemplateId, VibeTrack } from "./types";

export const templates: TemplateDefinition[] = [
  {
    id: "papyrus",
    label: "Papyrus Paper",
    transition: "flip",
    fontClass: "font-serif",
    bgClass: "bg-cream",
    defaultCharacterPosition: "bottom-right",
    previewImage: "/templates/papy1.jpg",
    backgroundImage: "/templates/papy4.jpg",
    startInteractionLabel: "Open the book",
    startInteractionIcon: "📖",
    startInteractionImage: "/templates/papy1.jpg"
  },
  {
    id: "love-card",
    label: "Love Card",
    transition: "open",
    fontClass: "font-[cursive]",
    bgClass: "bg-white",
    defaultCharacterPosition: "bottom-left",
    previewImage: "/templates/letter2.jpg",
    backgroundImage: "/templates/letter1.jpg",
    startInteractionLabel: "Open envelope",
    startInteractionIcon: "💌",
    startInteractionImage: "/templates/letter2.jpg"
  },
  {
    id: "phone-texts",
    label: "Phone Mockup Texts",
    transition: "slide",
    fontClass: "font-sans",
    bgClass: "bg-cream",
    defaultCharacterPosition: "top-right",
    previewImage: "/templates/phone1.jpg",
    backgroundImage: "/templates/chat2.jpg",
    startInteractionLabel: "Tech transform",
    startInteractionIcon: "📱",
    startInteractionImage: "/templates/phone1.jpg"
  },
  {
    id: "door-reveal",
    label: "Door Reveal",
    transition: "open",
    fontClass: "font-serif",
    bgClass: "bg-cream",
    defaultCharacterPosition: "center-right",
    previewImage: "/templates/door1.jpg",
    backgroundImage: "/templates/door3.jpg",
    startInteractionLabel: "Enter through the door",
    startInteractionIcon: "🚪",
    startInteractionImage: "/templates/door1.jpg",
    premium: true
  }
];

export const vibes: VibeTrack[] = [
  {
    id: "romantic",
    label: "Romantic",
    trackUrl: "/music/romantic.mp3",
    premium: true
  },
  {
    id: "soft",
    label: "Soft",
    trackUrl: "/music/soft.mp3",
    premium: true
  },
  {
    id: "rain-dance",
    label: "Rain Dance",
    trackUrl: "/music/rain-dance.mp3",
    trackStartSeconds: 84,
    premium: true
  },
  {
    id: "playful",
    label: "Playful",
    trackUrl: "/music/playful.mp3",
    premium: true
  },
  {
    id: "heartbreak",
    label: "Heartbreak",
    trackUrl: "/music/heartbreak.mp3",
    premium: true
  },
  {
    id: "nostalgia",
    label: "Nostalgia",
    trackUrl: "/music/nostalgia.mp3",
    premium: true
  }
];

export const characterPacks: CharacterPack[] = [];

export function getTemplateById(templateId: TemplateId) {
  return templates.find((template) => template.id === templateId) ?? templates[0];
}
