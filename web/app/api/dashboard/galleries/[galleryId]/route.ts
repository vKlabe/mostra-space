import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canUseTemplateByPlan,
  isMarketplaceTemplate,
  normalizePlanName,
} from "@/lib/plans";

export const dynamic = "force-dynamic";

const CURATORIAL_AUDIO_BUCKET = "gallery-curatorial-audio";
const CURATORIAL_AUDIO_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const CURATORIAL_AUDIO_BUSINESS_MAX_DURATION_SECONDS = 10 * 60;
const CURATORIAL_AUDIO_DIAMOND_MAX_DURATION_SECONDS = 20 * 60;

const CURATORIAL_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
]);

type RouteContext = {
  params: Promise<{
    galleryId: string;
  }>;
};

type CuratorialAudioPayload = {
  title?: unknown;
  audioUrl?: unknown;
  storagePath?: unknown;
  durationSeconds?: unknown;
  fileSizeBytes?: unknown;
  mimeType?: unknown;
  initialVolume?: unknown;
};

type UpdateGalleryPayload = {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  coverImageUrl?: unknown;
  templateId?: unknown;
  soundtrackId?: unknown;
  soundtrackInitialVolume?: unknown;
  curatorialAudio?: unknown;
  curatorialAudioInitialVolume?: unknown;
  removeCuratorialAudio?: unknown;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: string | null;
};

type GalleryPermissionRecord = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  template_id: string | null;
  soundtrack_id: string | null;
  soundtrack_initial_volume: number | null;
  curatorial_audio_initial_volume: number | null;
  curatorial_audio_storage_path: string | null;
};

type TemplateRecord = {
  id: string;
  name: string;
  is_active: boolean;
  available_from_plan: string | null;
};

type SoundtrackRecord = {
  id: string;
  is_active: boolean;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toNumber(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeVolumePercent(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function canUseCuratorialAudio(
  role: string | null | undefined,
  planValue: string | null | undefined
) {
  if (role === "admin") {
    return true;
  }

  const plan = normalizePlanName(planValue);

  return plan === "business" || plan === "diamond" || plan === "institution";
}

function getCuratorialAudioMaxDurationSeconds(
  role: string | null | undefined,
  planValue: string | null | undefined
) {
  if (role === "admin") {
    return CURATORIAL_AUDIO_DIAMOND_MAX_DURATION_SECONDS;
  }

  const plan = normalizePlanName(planValue);

  if (plan === "diamond" || plan === "institution") {
    return CURATORIAL_AUDIO_DIAMOND_MAX_DURATION_SECONDS;
  }

  return CURATORIAL_AUDIO_BUSINESS_MAX_DURATION_SECONDS;
}

function formatDurationLimitMessage(maxDurationSeconds: number) {
  const minutes = Math.round(maxDurationSeconds / 60);

  return `Audio guida troppo lungo. Il limite massimo è ${minutes} minuti per il tuo piano.`;
}

async function getUserAndGalleryPermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  galleryId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
      user: null,
      profile: null,
      gallery: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, plan")
    .eq("id", user.id)
    .single<Profile>();

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select(
      "id, owner_id, title, slug, status, template_id, soundtrack_id, soundtrack_initial_volume, curatorial_audio_initial_volume, curatorial_audio_storage_path"
    )
    .eq("id", galleryId)
    .single<GalleryPermissionRecord>();

  if (galleryError || !gallery) {
    return {
      ok: false,
      status: 404,
      error: "Gallery not found",
      user,
      profile,
      gallery: null,
    };
  }

  const isAdmin = profile?.role === "admin";
  const isOwner = gallery.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      user,
      profile,
      gallery,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    user,
    profile,
    gallery,
  };
}

async function userHasPurchasedTemplate(params: {
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  templateId: string;
}) {
  const { data, error } = await params.admin
    .from("gallery_template_purchases")
    .select("id")
    .eq("user_id", params.userId)
    .eq("template_id", params.templateId)
    .eq("status", "paid")
    .maybeSingle();

  if (error) {
    throw new Error(`Errore controllo acquisto template: ${error.message}`);
  }

  return Boolean(data?.id);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { galleryId } = await context.params;

  if (!galleryId) {
    return NextResponse.json(
      { error: "Missing galleryId" },
      { status: 400 }
    );
  }

  let body: UpdateGalleryPayload;

  try {
    body = (await request.json()) as UpdateGalleryPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const permission = await getUserAndGalleryPermission(supabase, galleryId);

  if (
    !permission.ok ||
    !permission.gallery ||
    !permission.profile ||
    !permission.user
  ) {
    return NextResponse.json(
      { error: permission.error },
      { status: permission.status }
    );
  }

  const updatePayload: Record<string, unknown> = {};

  const wantsDetailsUpdate =
    body.title !== undefined ||
    body.slug !== undefined ||
    body.description !== undefined;

  const wantsCoverUpdate = body.coverImageUrl !== undefined;
  const templateId = cleanText(body.templateId);
  const wantsTemplateUpdate = templateId.length > 0;
  const wantsSoundtrackUpdate = body.soundtrackId !== undefined;
  const wantsSoundtrackInitialVolumeUpdate =
    body.soundtrackInitialVolume !== undefined;
  const wantsCuratorialAudioInitialVolumeUpdate =
    body.curatorialAudioInitialVolume !== undefined;
  const wantsCuratorialAudioUpdate =
    body.curatorialAudio !== undefined ||
    body.removeCuratorialAudio !== undefined;

  if (
    !wantsDetailsUpdate &&
    !wantsCoverUpdate &&
    !wantsTemplateUpdate &&
    !wantsSoundtrackUpdate &&
    !wantsSoundtrackInitialVolumeUpdate &&
    !wantsCuratorialAudioInitialVolumeUpdate &&
    !wantsCuratorialAudioUpdate
  ) {
    return NextResponse.json(
      { error: "Nessuna modifica ricevuta." },
      { status: 400 }
    );
  }

  if (wantsDetailsUpdate) {
    const title =
      body.title !== undefined
        ? cleanText(body.title)
        : permission.gallery.title;

    const rawSlug =
      body.slug !== undefined
        ? cleanText(body.slug)
        : permission.gallery.slug;

    const slug = slugify(rawSlug || title);
    const description =
      body.description !== undefined
        ? cleanNullableText(body.description)
        : undefined;

    if (!title) {
      return NextResponse.json(
        { error: "Il titolo e obbligatorio." },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: "Lo slug pubblico e obbligatorio." },
        { status: 400 }
      );
    }

    if (slug.length < 3) {
      return NextResponse.json(
        { error: "Lo slug deve contenere almeno 3 caratteri." },
        { status: 400 }
      );
    }

    const { data: existingSlugOwner, error: existingSlugError } =
      await supabase
        .from("galleries")
        .select("id")
        .eq("slug", slug)
        .neq("id", permission.gallery.id)
        .maybeSingle();

    if (existingSlugError) {
      return NextResponse.json(
        {
          error: "Errore controllo slug.",
          details: existingSlugError.message,
        },
        { status: 500 }
      );
    }

    if (existingSlugOwner) {
      return NextResponse.json(
        { error: "Questo slug e gia usato da un altra galleria." },
        { status: 409 }
      );
    }

    updatePayload.title = title;
    updatePayload.slug = slug;

    if (body.description !== undefined) {
      updatePayload.description = description;
    }
  }

  if (wantsCoverUpdate) {
    updatePayload.cover_image_url = cleanNullableText(body.coverImageUrl);
  }

  if (wantsTemplateUpdate) {
    if (templateId === permission.gallery.template_id) {
      return NextResponse.json(
        { error: "Questo template è già assegnato alla galleria." },
        { status: 400 }
      );
    }

    const { data: template, error: templateError } = await admin
      .from("gallery_templates")
      .select("id, name, is_active, available_from_plan")
      .eq("id", templateId)
      .single<TemplateRecord>();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template non trovato." },
        { status: 404 }
      );
    }

    if (!template.is_active) {
      return NextResponse.json(
        { error: "Questo template non è attivo." },
        { status: 403 }
      );
    }

    const isAdmin = permission.profile.role === "admin";

    if (!isAdmin) {
      const plan = normalizePlanName(permission.profile.plan);
      const templateAccessPlan = template.available_from_plan || "free";
      const templateCheck = canUseTemplateByPlan(plan, templateAccessPlan);

      let canUseTemplate = templateCheck.allowed;

      if (!canUseTemplate && isMarketplaceTemplate(templateAccessPlan)) {
        try {
          canUseTemplate = await userHasPurchasedTemplate({
            admin,
            userId: permission.user.id,
            templateId: template.id,
          });
        } catch (error) {
          return NextResponse.json(
            {
              error: "Errore controllo acquisto template.",
              details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
          );
        }
      }

      if (!canUseTemplate) {
        const isMarketplace = isMarketplaceTemplate(templateAccessPlan);

        return NextResponse.json(
          {
            error: isMarketplace
              ? "Questo template marketplace non risulta acquistato dal tuo account."
              : templateCheck.reason ||
                "Questo template non è disponibile per il tuo piano.",
            upgradeTo: isMarketplace ? null : templateCheck.upgradeTo,
          },
          { status: 403 }
        );
      }
    }

    updatePayload.template_id = template.id;
  }

  if (wantsSoundtrackUpdate) {
    const soundtrackId = cleanNullableText(body.soundtrackId);

    if (!soundtrackId) {
      updatePayload.soundtrack_id = null;
    } else {
      const { data: soundtrack, error: soundtrackError } = await admin
        .from("gallery_soundtracks")
        .select("id, is_active")
        .eq("id", soundtrackId)
        .maybeSingle<SoundtrackRecord>();

      if (soundtrackError) {
        return NextResponse.json(
          {
            error: "Errore controllo soundtrack.",
            details: soundtrackError.message,
          },
          { status: 500 }
        );
      }

      if (!soundtrack) {
        return NextResponse.json(
          { error: "Soundtrack non trovata." },
          { status: 404 }
        );
      }

      if (!soundtrack.is_active) {
        return NextResponse.json(
          { error: "Questa soundtrack non è attiva." },
          { status: 403 }
        );
      }

      updatePayload.soundtrack_id = soundtrack.id;
    }
  }

  if (wantsSoundtrackInitialVolumeUpdate) {
    updatePayload.soundtrack_initial_volume = normalizeVolumePercent(
      body.soundtrackInitialVolume,
      permission.gallery.soundtrack_initial_volume ?? 35
    );
  }

  if (wantsCuratorialAudioInitialVolumeUpdate) {
    if (!canUseCuratorialAudio(permission.profile.role, permission.profile.plan)) {
      return NextResponse.json(
        {
          error:
            "L’audio guida della galleria è disponibile solo dai piani Business, Diamond e Institution.",
        },
        { status: 403 }
      );
    }

    updatePayload.curatorial_audio_initial_volume = normalizeVolumePercent(
      body.curatorialAudioInitialVolume,
      permission.gallery.curatorial_audio_initial_volume ?? 75
    );
    updatePayload.curatorial_audio_updated_at = new Date().toISOString();
  }

  let oldCuratorialAudioPathToRemove: string | null = null;

  if (wantsCuratorialAudioUpdate) {
    if (!canUseCuratorialAudio(permission.profile.role, permission.profile.plan)) {
      return NextResponse.json(
        {
          error:
            "L’audio guida della galleria è disponibile solo dai piani Business, Diamond e Institution.",
        },
        { status: 403 }
      );
    }

    oldCuratorialAudioPathToRemove =
      permission.gallery.curatorial_audio_storage_path || null;

    if (body.removeCuratorialAudio === true) {
      updatePayload.curatorial_audio_title = null;
      updatePayload.curatorial_audio_url = null;
      updatePayload.curatorial_audio_storage_path = null;
      updatePayload.curatorial_audio_duration_seconds = null;
      updatePayload.curatorial_audio_file_size_bytes = null;
      updatePayload.curatorial_audio_mime_type = null;
      updatePayload.curatorial_audio_initial_volume = 75;
      updatePayload.curatorial_audio_updated_at = null;
    } else {
      if (!isRecord(body.curatorialAudio)) {
        return NextResponse.json(
          { error: "Payload audio guida non valido." },
          { status: 400 }
        );
      }

      const audioPayload = body.curatorialAudio as CuratorialAudioPayload;
      const title = cleanText(audioPayload.title);
      const audioUrl = cleanText(audioPayload.audioUrl);
      const storagePath = cleanText(audioPayload.storagePath);
      const mimeType = cleanText(audioPayload.mimeType).toLowerCase();
      const durationSeconds = toNumber(audioPayload.durationSeconds);
      const fileSizeBytes = toNumber(audioPayload.fileSizeBytes);

      if (!title) {
        return NextResponse.json(
          { error: "Il titolo dell’audio guida è obbligatorio." },
          { status: 400 }
        );
      }

      if (!audioUrl || !storagePath) {
        return NextResponse.json(
          { error: "URL o percorso storage audio mancanti." },
          { status: 400 }
        );
      }

      if (!CURATORIAL_AUDIO_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          { error: "Formato audio guida non supportato." },
          { status: 400 }
        );
      }

      const maxDurationSeconds = getCuratorialAudioMaxDurationSeconds(
        permission.profile.role,
        permission.profile.plan
      );

      if (
        durationSeconds === null ||
        durationSeconds < 0 ||
        durationSeconds > maxDurationSeconds
      ) {
        return NextResponse.json(
          {
            error: formatDurationLimitMessage(maxDurationSeconds),
            maxDurationSeconds,
          },
          { status: 400 }
        );
      }

      if (
        fileSizeBytes === null ||
        fileSizeBytes <= 0 ||
        fileSizeBytes > CURATORIAL_AUDIO_MAX_FILE_SIZE_BYTES
      ) {
        return NextResponse.json(
          { error: "Audio guida troppo pesante. Il limite massimo è 25 MB." },
          { status: 400 }
        );
      }

      const initialVolume = normalizeVolumePercent(
        audioPayload.initialVolume,
        permission.gallery.curatorial_audio_initial_volume ?? 75
      );

      updatePayload.curatorial_audio_title = title;
      updatePayload.curatorial_audio_url = audioUrl;
      updatePayload.curatorial_audio_storage_path = storagePath;
      updatePayload.curatorial_audio_duration_seconds = Math.round(durationSeconds);
      updatePayload.curatorial_audio_file_size_bytes = Math.round(fileSizeBytes);
      updatePayload.curatorial_audio_mime_type = mimeType;
      updatePayload.curatorial_audio_initial_volume = initialVolume;
      updatePayload.curatorial_audio_updated_at = new Date().toISOString();
    }
  }

  updatePayload.updated_at = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("galleries")
    .update(updatePayload)
    .eq("id", permission.gallery.id)
    .select(
      "id, title, slug, description, cover_image_url, template_id, soundtrack_id, soundtrack_initial_volume, curatorial_audio_title, curatorial_audio_url, curatorial_audio_storage_path, curatorial_audio_duration_seconds, curatorial_audio_file_size_bytes, curatorial_audio_mime_type, curatorial_audio_initial_volume, curatorial_audio_updated_at, status, updated_at"
    )
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      {
        error: "Update failed",
        details: updateError?.message || null,
      },
      { status: 500 }
    );
  }

  if (
    oldCuratorialAudioPathToRemove &&
    oldCuratorialAudioPathToRemove !== updated.curatorial_audio_storage_path
  ) {
    await admin.storage
      .from(CURATORIAL_AUDIO_BUCKET)
      .remove([oldCuratorialAudioPathToRemove])
      .catch(() => {
        // La rimozione del file precedente non deve bloccare l'update dati.
      });
  }

  return NextResponse.json({
    success: true,
    gallery: updated,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { galleryId } = await context.params;

  if (!galleryId) {
    return NextResponse.json(
      { error: "Missing galleryId" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const permission = await getUserAndGalleryPermission(supabase, galleryId);

  if (!permission.ok || !permission.gallery) {
    return NextResponse.json(
      { error: permission.error },
      { status: permission.status }
    );
  }

  if (permission.gallery.status === "published") {
    return NextResponse.json(
      {
        error:
          "Non puoi eliminare una galleria pubblicata. Riportala prima in bozza oppure archiviala.",
      },
      { status: 409 }
    );
  }

  const { error: deleteLinksError } = await supabase
    .from("gallery_artworks")
    .delete()
    .eq("gallery_id", permission.gallery.id);

  if (deleteLinksError) {
    return NextResponse.json(
      {
        error: "Errore eliminazione allestimento galleria.",
        details: deleteLinksError.message,
      },
      { status: 500 }
    );
  }

  const { error: deleteGalleryError } = await supabase
    .from("galleries")
    .delete()
    .eq("id", permission.gallery.id);

  if (deleteGalleryError) {
    return NextResponse.json(
      {
        error: "Errore eliminazione galleria.",
        details: deleteGalleryError.message,
      },
      { status: 500 }
    );
  }

  if (permission.gallery.curatorial_audio_storage_path) {
    const admin = createAdminClient();

    await admin.storage
      .from(CURATORIAL_AUDIO_BUCKET)
      .remove([permission.gallery.curatorial_audio_storage_path])
      .catch(() => {
        // Non blocchiamo la cancellazione galleria per errori storage.
      });
  }

  return NextResponse.json({
    success: true,
    deletedGalleryId: permission.gallery.id,
  });
}
