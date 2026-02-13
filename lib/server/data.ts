import { nanoid } from "nanoid";
import { hasServerEnv } from "@/lib/env";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type {
  ProjectRecord,
  PublishedTaleRecord,
  PurchaseType,
  ReactionPayload,
  StoryPage,
  TemplateId,
  VibeId
} from "@/lib/types";

type LocalStore = {
  projects: Map<string, ProjectRecord>;
  publishedByProjectId: Map<string, PublishedTaleRecord>;
  publishedBySlug: Map<string, PublishedTaleRecord>;
  reactionsByPublishedId: Map<string, Array<{ reaction: string; reply_text?: string; created_at: string }>>;
  purchaseRefs: Set<string>;
};

type GlobalWithLocalStore = typeof globalThis & {
  __valentinesLocalStore?: LocalStore;
};

function now() {
  return new Date().toISOString();
}

function getLocalStore() {
  const globalObject = globalThis as GlobalWithLocalStore;
  if (!globalObject.__valentinesLocalStore) {
    globalObject.__valentinesLocalStore = {
      projects: new Map(),
      publishedByProjectId: new Map(),
      publishedBySlug: new Map(),
      reactionsByPublishedId: new Map(),
      purchaseRefs: new Set()
    };
  }
  return globalObject.__valentinesLocalStore;
}

function createLocalDraftProject(payload: {
  templateId: TemplateId;
  vibe: VibeId;
  characterRefs?: string[];
  pages?: StoryPage[];
}) {
  const store = getLocalStore();
  const id = nanoid(14);
  const starterCharacter = payload.characterRefs?.[0];
  const record: ProjectRecord = {
    id,
    owner_id: null,
    template_id: payload.templateId,
    vibe: payload.vibe,
    pages_json:
      payload.pages ?? [
        {
          id: nanoid(),
          title: "",
          body: "",
          signature: "",
          characterId: starterCharacter
        }
      ],
    character_refs: payload.characterRefs ?? [],
    is_premium: false,
    created_at: now(),
    updated_at: now()
  };
  store.projects.set(id, record);
  return record;
}

function updateLocalProject(
  projectId: string,
  updates: Partial<Pick<ProjectRecord, "template_id" | "vibe" | "pages_json" | "character_refs" | "is_premium">>
) {
  const store = getLocalStore();
  const existing = store.projects.get(projectId);
  if (!existing) {
    throw new Error("Project not found.");
  }

  const next: ProjectRecord = {
    ...existing,
    ...Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined)),
    updated_at: now()
  };
  store.projects.set(projectId, next);
  return next;
}

function createLocalPublished(projectId: string, isPremium = false) {
  const store = getLocalStore();
  const existing = store.publishedByProjectId.get(projectId);
  if (existing) {
    if (isPremium && !existing.is_premium) {
      const upgraded: PublishedTaleRecord = {
        ...existing,
        is_premium: true
      };
      store.publishedByProjectId.set(projectId, upgraded);
      store.publishedBySlug.set(upgraded.slug, upgraded);
      return upgraded;
    }
    return existing;
  }

  const published: PublishedTaleRecord = {
    id: nanoid(14),
    project_id: projectId,
    slug: nanoid(14),
    is_premium: isPremium,
    narration_url: null,
    published_at: now()
  };

  store.publishedByProjectId.set(projectId, published);
  store.publishedBySlug.set(published.slug, published);
  return published;
}

export async function createDraftProject(payload: {
  templateId: TemplateId;
  vibe: VibeId;
  characterRefs?: string[];
  pages?: StoryPage[];
}) {
  if (!hasServerEnv()) {
    return createLocalDraftProject(payload);
  }

  const supabase = createServiceSupabaseClient();
  const insertPayload = {
    template_id: payload.templateId,
    vibe: payload.vibe,
    pages_json:
      payload.pages ?? [
        {
          id: nanoid(),
          title: "",
          body: "",
          signature: "",
          characterId: payload.characterRefs?.[0]
        }
      ],
    character_refs: payload.characterRefs ?? [],
    is_premium: false,
    created_at: now(),
    updated_at: now()
  };

  const { data, error } = await supabase.from("projects").insert(insertPayload).select("*").single();
  if (error) {
    throw error;
  }
  return data as ProjectRecord;
}

export async function getProjectById(projectId: string) {
  if (!hasServerEnv()) {
    return getLocalStore().projects.get(projectId) ?? null;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (error) {
    return null;
  }
  return data as ProjectRecord;
}

export async function updateProjectById(
  projectId: string,
  updates: Partial<Pick<ProjectRecord, "template_id" | "vibe" | "pages_json" | "character_refs" | "is_premium">>
) {
  if (!hasServerEnv()) {
    return updateLocalProject(projectId, updates);
  }

  const supabase = createServiceSupabaseClient();
  const updatePayload = Object.fromEntries(
    Object.entries({
      ...updates,
      updated_at: now()
    }).filter(([, value]) => value !== undefined)
  );
  const { data, error } = await supabase
    .from("projects")
    .update(updatePayload)
    .eq("id", projectId)
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return data as ProjectRecord;
}

export async function getPublishedByProject(projectId: string) {
  if (!hasServerEnv()) {
    return getLocalStore().publishedByProjectId.get(projectId) ?? null;
  }

  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from("published_tales")
    .select("*")
    .eq("project_id", projectId)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as PublishedTaleRecord | null;
}

export async function createOrGetPublishedTale(projectId: string, isPremium = false) {
  if (!hasServerEnv()) {
    return createLocalPublished(projectId, isPremium);
  }

  const existing = await getPublishedByProject(projectId);
  if (existing) {
    if (isPremium && !existing.is_premium) {
      const supabase = createServiceSupabaseClient();
      const { data, error } = await supabase
        .from("published_tales")
        .update({ is_premium: true })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) {
        throw error;
      }
      return data as PublishedTaleRecord;
    }
    return existing;
  }

  const supabase = createServiceSupabaseClient();
  const slug = nanoid(14);
  const { data, error } = await supabase
    .from("published_tales")
    .insert({
      project_id: projectId,
      slug,
      is_premium: isPremium,
      published_at: now()
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }
  return data as PublishedTaleRecord;
}

export async function getPublishedBySlug(slug: string) {
  if (!hasServerEnv()) {
    const store = getLocalStore();
    const published = store.publishedBySlug.get(slug);
    if (!published) {
      return null;
    }
    const project = store.projects.get(published.project_id);
    if (!project) {
      return null;
    }
    return {
      ...published,
      projects: project
    } as PublishedTaleRecord & { projects: ProjectRecord };
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("published_tales")
    .select("*, projects(*)")
    .eq("slug", slug)
    .single();
  if (error) {
    return null;
  }
  return data as (PublishedTaleRecord & { projects: ProjectRecord }) | null;
}

export async function addPurchaseLog(payload: {
  type: PurchaseType;
  providerRef: string;
  amount: number;
  currency: string;
}) {
  if (!hasServerEnv()) {
    getLocalStore().purchaseRefs.add(payload.providerRef);
    return;
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("purchases").insert({
    owner_id: null,
    type: payload.type,
    provider_ref: payload.providerRef,
    amount: payload.amount,
    currency: payload.currency,
    created_at: now()
  });
  if (error && !String(error.message).toLowerCase().includes("duplicate")) {
    throw error;
  }
}

export async function markProjectPremium(projectId: string) {
  return updateProjectById(projectId, { is_premium: true });
}

export async function saveNarrationUrl(projectId: string, narrationUrl: string) {
  if (!hasServerEnv()) {
    const store = getLocalStore();
    const published = createLocalPublished(projectId, true);
    const nextPublished: PublishedTaleRecord = {
      ...published,
      narration_url: narrationUrl,
      is_premium: true
    };
    store.publishedByProjectId.set(projectId, nextPublished);
    store.publishedBySlug.set(nextPublished.slug, nextPublished);
    await markProjectPremium(projectId);
    return;
  }

  const supabase = createServiceSupabaseClient();
  const published = await createOrGetPublishedTale(projectId, true);
  const { error } = await supabase
    .from("published_tales")
    .update({
      narration_url: narrationUrl,
      is_premium: true
    })
    .eq("id", published.id);

  if (error) {
    throw error;
  }
}

export async function addReaction(payload: ReactionPayload) {
  if (!hasServerEnv()) {
    const store = getLocalStore();
    const published = store.publishedBySlug.get(payload.taleSlug);
    if (!published) {
      throw new Error("Tale not found.");
    }
    if (!published.is_premium) {
      throw new Error("Reactions are premium.");
    }
    const existing = store.reactionsByPublishedId.get(published.id) ?? [];
    store.reactionsByPublishedId.set(
      published.id,
      [
        {
          reaction: payload.reaction,
          reply_text: payload.replyText,
          created_at: now()
        },
        ...existing
      ].slice(0, 50)
    );
    return { ok: true };
  }

  const supabase = createServiceSupabaseClient();
  const { data: published, error: publishedError } = await supabase
    .from("published_tales")
    .select("id, project_id, is_premium")
    .eq("slug", payload.taleSlug)
    .single();

  if (publishedError || !published) {
    throw new Error("Tale not found.");
  }
  if (!published.is_premium) {
    throw new Error("Reactions are premium.");
  }

  const { error } = await supabase.from("reactions").insert({
    published_tale_id: published.id,
    reaction: payload.reaction,
    reply_text: payload.replyText,
    created_at: now()
  });
  if (error) {
    throw error;
  }

  return { ok: true };
}

export async function getDiscountUsageCount(code: string) {
  if (!hasServerEnv()) return 0;
  const supabase = createServiceSupabaseClient();
  const { count, error } = await supabase
    .from("purchases")
    .select("*", { count: "exact", head: true })
    .ilike("provider_ref", `discount_${code}_%`);

  if (error) return 0;
  return count ?? 0;
}

export async function recordDiscountUsage(code: string, type: PurchaseType) {
  const ref = `discount_${code}_${nanoid(10)}`;
  await addPurchaseLog({
    type,
    providerRef: ref,
    amount: 0,
    currency: "NGN"
  });
}

export async function getReactionSummary(slug: string) {
  if (!hasServerEnv()) {
    const store = getLocalStore();
    const published = store.publishedBySlug.get(slug);
    if (!published) {
      return [];
    }
    return store.reactionsByPublishedId.get(published.id) ?? [];
  }

  const supabase = createServiceSupabaseClient();
  const { data: published } = await supabase
    .from("published_tales")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!published) {
    return [];
  }

  const { data } = await supabase
    .from("reactions")
    .select("reaction, reply_text, created_at")
    .eq("published_tale_id", published.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}
