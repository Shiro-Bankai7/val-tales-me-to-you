export type TemplateTransition = "flip" | "slide" | "open";

export type TemplateId =
  | "papyrus"
  | "love-card"
  | "phone-texts"
  | "door-reveal";

export type VibeId = string;

export type PurchaseType = "export" | "premium";

export interface StoryPage {
  id: string;
  title: string;
  body: string;
  signature?: string;
  highlightedNames?: string[];
  bgColor?: string;
  textColor?: string;
  characterId?: string;
  characterPosition?: string;
  stickerX?: number;
  stickerY?: number;
  stickerSize?: number;
  secret?: boolean;
}

export interface CharacterPack {
  id: string;
  name: string;
  premium?: boolean;
  characters: {
    id: string;
    name: string;
    src: string;
  }[];
}

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  transition: TemplateTransition;
  fontClass: string;
  bgClass: string;
  backgroundImage?: string;
  defaultCharacterPosition: string;
  premium?: boolean;
  previewImage: string;
  startInteractionLabel: string;
  startInteractionIcon?: string;
  startInteractionImage?: string;
}

export interface VibeTrack {
  id: VibeId;
  label: string;
  trackUrl: string;
  trackStartSeconds?: number;
  premium?: boolean;
}

export interface ProjectRecord {
  id: string;
  owner_id: string | null;
  template_id: TemplateId;
  vibe: VibeId;
  pages_json: StoryPage[];
  character_refs: string[];
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublishedTaleRecord {
  id: string;
  project_id: string;
  slug: string;
  is_premium: boolean;
  narration_url: string | null;
  published_at: string;
}

export interface ReactionPayload {
  taleSlug: string;
  reaction: "blush" | "scream" | "cry" | "omo" | "speechless" | "love";
  replyText?: string;
}
