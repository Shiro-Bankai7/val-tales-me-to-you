import type { CharacterPack, TemplateDefinition, TemplateId, VibeId, VibeTrack } from "./types";

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
    startInteractionIcon: "Book",
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
    backgroundImage: "/templates/letter2.jpg",
    startInteractionLabel: "Open envelope",
    startInteractionIcon: "Letter",
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
    startInteractionIcon: "Phone",
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
    startInteractionIcon: "Door",
    startInteractionImage: "/templates/door1.jpg",
    premium: true
  }
];

export const vibes: VibeTrack[] = [
  {
    id: "romantic",
    label: "Romantic",
    trackUrl: "/music/romantic.mp3"
  },
  {
    id: "soft",
    label: "Soft",
    trackUrl: "/music/soft.mp3"
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
    trackUrl: "/music/playful.mp3"
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
  },
  {
    id: "african-queen",
    label: "African Queen",
    trackUrl: "/2Face - African Queen [Official Video] - Official2Baba (youtube).mp3",
    premium: true
  },
  {
    id: "dave-raindance",
    label: "Dave Raindance",
    trackUrl: "/Dave - Raindance (ft. Tems) - Santan Dave (youtube).mp3",
    premium: true
  },
  {
    id: "davido-assurance",
    label: "Davido Assurance",
    trackUrl: "/Davido - Assurance (Official Video) - DavidoVEVO (youtube).mp3",
    premium: true
  },
  {
    id: "fola-you",
    label: "FOLA You",
    trackUrl: "/FOLA - you (Official Video) - FolapondisVEVO (youtube).mp3",
    premium: true
  },
  {
    id: "tems-me-u",
    label: "Tems Me and U",
    trackUrl: "/Tems - Me & U (Official Video) - TemsVEVO (youtube).mp3",
    premium: true
  },
  {
    id: "wizkid-true-love",
    label: "Wizkid True Love",
    trackUrl: "/Wizkid - True Love (Audio) ft. Tay Iwar, Projexx - WizkidVEVO (youtube).mp3",
    premium: true
  }
];

export const characterPacks: CharacterPack[] = [];

export function getTemplateById(templateId: TemplateId) {
  return templates.find((template) => template.id === templateId) ?? templates[0];
}

export function getVibeById(vibeId: VibeId) {
  return vibes.find((vibe) => vibe.id === vibeId) ?? vibes[0];
}
