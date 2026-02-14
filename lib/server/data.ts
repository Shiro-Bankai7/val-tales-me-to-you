import { nanoid } from "nanoid";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { hasServerEnv } from "@/lib/env";
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

type LocalStoreSnapshot = {
  projects: Array<[string, ProjectRecord]>;
  publishedByProjectId: Array<[string, PublishedTaleRecord]>;
  publishedBySlug: Array<[string, PublishedTaleRecord]>;
  reactionsByPublishedId: Array<
    [string, Array<{ reaction: string; reply_text?: string; created_at: string }>]
  >;
  purchaseRefs: string[];
};

const LOCAL_STORE_PATH = path.join(process.cwd(), ".val-tales-local-store.json");
let localStoreLoadPromise: Promise<void> | null = null;
let supabaseFactoryPromise: Promise<() => unknown> | null = null;

function now() {
  return new Date().toISOString();
}

async function getServiceSupabaseClient() {
  if (!supabaseFactoryPromise) {
    supabaseFactoryPromise = import("@/lib/supabase/server").then(
      (module) => module.createServiceSupabaseClient as () => unknown
    );
  }
  const createClient = await supabaseFactoryPromise;
  return createClient() as ReturnType<
    (typeof import("@/lib/supabase/server"))["createServiceSupabaseClient"]
  >;
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

function shouldUseLocalStore() {
  return !hasServerEnv() && process.env.NODE_ENV !== "production";
}

function toLocalStoreSnapshot(store: LocalStore): LocalStoreSnapshot {
  return {
    projects: Array.from(store.projects.entries()),
    publishedByProjectId: Array.from(store.publishedByProjectId.entries()),
    publishedBySlug: Array.from(store.publishedBySlug.entries()),
    reactionsByPublishedId: Array.from(store.reactionsByPublishedId.entries()),
    purchaseRefs: Array.from(store.purchaseRefs.values())
  };
}

async function ensureLocalStoreReady() {
  if (localStoreLoadPromise) {
    return localStoreLoadPromise;
  }

  localStoreLoadPromise = (async () => {
    const store = getLocalStore();
    try {
      const raw = await readFile(LOCAL_STORE_PATH, "utf8");
      const parsed = JSON.parse(raw) as Partial<LocalStoreSnapshot>;

      store.projects = new Map(parsed.projects ?? []);
      store.publishedByProjectId = new Map(parsed.publishedByProjectId ?? []);
      store.publishedBySlug = new Map(parsed.publishedBySlug ?? []);
      store.reactionsByPublishedId = new Map(parsed.reactionsByPublishedId ?? []);
      store.purchaseRefs = new Set(parsed.purchaseRefs ?? []);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== "ENOENT") {
        console.warn("[val-tales] Failed to read local store:", nodeError.message);
      }
    }
  })();

  return localStoreLoadPromise;
}

async function persistLocalStore() {
  const store = getLocalStore();
  const snapshot = toLocalStoreSnapshot(store);
  try {
    await writeFile(LOCAL_STORE_PATH, JSON.stringify(snapshot, null, 2), "utf8");
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    console.warn("[val-tales] Failed to persist local store:", nodeError.message);
  }
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
  if (shouldUseLocalStore()) {
    await ensureLocalStoreReady();
    const project = createLocalDraftProject(payload);
    await persistLocalStore();
    return project;
  }

  const supabase = await getServiceSupabaseClient();
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
  if (shouldUseLocalStore()) {
    await ensureLocalStoreReady();
    return getLocalStore().projects.get(projectId) ?? null;
  }

  const supabase = await getServiceSupabaseClient();
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
  if (shouldUseLocalStore()) {
    await ensureLocalStoreReady();
    const project = updateLocalProject(projectId, updates);
    await persistLocalStore();
    return project;
  }

  const supabase = await getServiceSupabaseClient();
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
  if (shouldUseLocalStore()) {
    await ensureLocalStoreReady();
    return getLocalStore().publishedByProjectId.get(projectId) ?? null;
  }

  const supabase = await getServiceSupabaseClient();
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
  if (shouldUseLocalStore()) {
    await ensureLocalStoreReady();
    const published = createLocalPublished(projectId, isPremium);
    await persistLocalStore();
    return published;
  }

  const existing = await getPublishedByProject(projectId);
  if (existing) {
    if (isPremium && !existing.is_premium) {
      const supabase = await getServiceSupabaseClient();
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

  const supabase = await getServiceSupabaseClient();
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
  if (shouldUseLocalStore()) {
    await ensureLocalStoreReady();
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

  const supabase = await getServiceSupabaseClient();
  const { data: published, error } = await supabase
    .from("published_tales")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !published) {
    return null;
  }

  const project = await getProjectById(published.project_id);
  if (!project) {
    return null;
  }

  return {
    ...published,
    projects: project
  } as PublishedTaleRecord & { projects: ProjectRecord };
}

export async function addPurchaseLog(payload: {
  type: PurchaseType;
  providerRef: string;
  amount: number;
  currency: string;
}) {
  if (shouldUseLocalStore()) {
    await ensureLocalStoreReady();
    getLocalStore().purchaseRefs.add(payload.providerRef);
    await persistLocalStore();
    return;
  }

  const supabase = await getServiceSupabaseClient();
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
  if (shouldUseLocalStore()) {
    await ensureLocalStoreReady();
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
    await persistLocalStore();
    return;
  }

  const supabase = await getServiceSupabaseClient();
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
  if (shouldUseLocalStore()) {
    await ensureLocalStoreReady();
    const store = getLocalStore();
    const published = store.publishedBySlug.get(payload.taleSlug);
    if (!published) {
      throw new Error("Tale not found.");
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
    await persistLocalStore();
    return { ok: true };
  }

  const supabase = await getServiceSupabaseClient();
  const { data: published, error: publishedError } = await supabase
    .from("published_tales")
    .select("id")
    .eq("slug", payload.taleSlug)
    .single();

  if (publishedError || !published) {
    throw new Error("Tale not found.");
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

export async function getReactionSummary(slug: string) {
  if (shouldUseLocalStore()) {
    await ensureLocalStoreReady();
    const store = getLocalStore();
    const published = store.publishedBySlug.get(slug);
    if (!published) {
      return [];
    }
    return store.reactionsByPublishedId.get(published.id) ?? [];
  }

  const supabase = await getServiceSupabaseClient();
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

export async function getCouponUsageCount(code: string) {
  if (shouldUseLocalStore()) {
    await ensureLocalStoreReady();
    const store = getLocalStore();
    let count = 0;
    store.purchaseRefs.forEach((ref) => {
      if (ref.startsWith(`COUPON_${code.toUpperCase()}_`)) {
        count++;
      }
    });
    return count;
  }

  const supabase = await getServiceSupabaseClient();
  const { count, error } = await supabase
    .from("purchases")
    .select("*", { count: "exact", head: true })
    .like("provider_ref", `COUPON_${code.toUpperCase()}_%`);

  if (error) {
    throw error;
  }
  return count ?? 0;
}

export async function applyCoupon(projectId: string, code: string) {
  const usageCount = await getCouponUsageCount(code);
  const providerRef = `COUPON_${code.toUpperCase()}_${usageCount + 1}`;

  // Mark project as premium
  await markProjectPremium(projectId);

  // Create or get published tale
  const published = await createOrGetPublishedTale(projectId, true);

  // Log purchase
  await addPurchaseLog({
    type: "premium",
    providerRef,
    amount: 0,
    currency: "NGN"
  });

  return published;
}
