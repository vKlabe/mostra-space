import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SLOT_KEYS = ["main", "featured_1", "featured_2", "featured_3"] as const;

type SlotKey = (typeof SLOT_KEYS)[number];

type SlotsMap = Record<SlotKey, string | null>;

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type PublicGallerySlotRow = {
  slot_key: string;
  gallery_id: string | null;
  updated_at?: string | null;
};

type ShowcaseRequestBody = {
  mainGalleryId?: unknown;
  featuredGalleryIds?: unknown;
  slots?: unknown;
  slotMap?: unknown;
};

function emptySlots(): SlotsMap {
  return {
    main: null,
    featured_1: null,
    featured_2: null,
    featured_3: null,
  };
}

function isSlotKey(value: unknown): value is SlotKey {
  return (
    typeof value === "string" &&
    (SLOT_KEYS as readonly string[]).includes(value)
  );
}

function cleanNullableId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function slotsMapToRows(slots: SlotsMap) {
  return SLOT_KEYS.map((slotKey) => ({
    slot_key: slotKey,
    gallery_id: slots[slotKey],
  }));
}

function normalizeSlotsPayload(body: ShowcaseRequestBody): SlotsMap {
  const slots = emptySlots();

  // Questo è il formato usato dal componente attuale:
  // { mainGalleryId, featuredGalleryIds: [...] }
  if (
    "mainGalleryId" in body ||
    "featuredGalleryIds" in body
  ) {
    const featuredGalleryIds = Array.isArray(body.featuredGalleryIds)
      ? body.featuredGalleryIds
      : [];

    slots.main = cleanNullableId(body.mainGalleryId);
    slots.featured_1 = cleanNullableId(featuredGalleryIds[0]);
    slots.featured_2 = cleanNullableId(featuredGalleryIds[1]);
    slots.featured_3 = cleanNullableId(featuredGalleryIds[2]);

    return slots;
  }

  // Formato alternativo: { slots: [...] }
  if (Array.isArray(body.slots)) {
    for (const item of body.slots) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const record = item as {
        slot_key?: unknown;
        slotKey?: unknown;
        gallery_id?: unknown;
        galleryId?: unknown;
      };

      const slotKey = record.slot_key || record.slotKey;

      if (!isSlotKey(slotKey)) {
        continue;
      }

      slots[slotKey] = cleanNullableId(
        record.gallery_id || record.galleryId
      );
    }

    return slots;
  }

  // Formato alternativo: { slots: { main, featured_1... } }
  if (body.slots && typeof body.slots === "object") {
    const record = body.slots as Partial<Record<SlotKey, unknown>>;

    for (const slotKey of SLOT_KEYS) {
      slots[slotKey] = cleanNullableId(record[slotKey]);
    }

    return slots;
  }

  // Formato alternativo: { slotMap: { main, featured_1... } }
  if (body.slotMap && typeof body.slotMap === "object") {
    const record = body.slotMap as Partial<Record<SlotKey, unknown>>;

    for (const slotKey of SLOT_KEYS) {
      slots[slotKey] = cleanNullableId(record[slotKey]);
    }
  }

  return slots;
}

async function requireAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      admin,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return {
      user,
      admin,
      error: NextResponse.json(
        {
          error: "Profilo non trovato.",
          details: profileError?.message || null,
        },
        { status: 404 }
      ),
    };
  }

  if (profile.role !== "admin") {
    return {
      user,
      admin,
      error: NextResponse.json(
        { error: "Solo gli admin possono modificare la vetrina pubblica." },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    admin,
    error: null,
  };
}

export async function GET() {
  const { admin, error } = await requireAdmin();

  if (error) {
    return error;
  }

  const { data: galleries, error: galleriesError } = await admin
    .from("galleries")
    .select("id, title, slug, status, cover_image_url, updated_at, published_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (galleriesError) {
    return NextResponse.json(
      {
        error: "Errore caricamento gallerie pubblicate.",
        details: galleriesError.message,
      },
      { status: 500 }
    );
  }

  const { data: slotRows, error: slotsError } = await admin
    .from("public_gallery_slots")
    .select("slot_key, gallery_id, updated_at")
    .in("slot_key", [...SLOT_KEYS]);

  if (slotsError) {
    return NextResponse.json(
      {
        error: "Errore caricamento vetrina pubblica.",
        details: slotsError.message,
      },
      { status: 500 }
    );
  }

  const slotMap = emptySlots();

  for (const row of (slotRows || []) as PublicGallerySlotRow[]) {
    if (isSlotKey(row.slot_key)) {
      slotMap[row.slot_key] = row.gallery_id;
    }
  }

  return NextResponse.json({
    galleries: galleries || [],
    slots: slotsMapToRows(slotMap),
    slotMap,
  });
}

async function saveSlots(request: Request) {
  const { user, admin, error } = await requireAdmin();

  if (error) {
    return error;
  }

  let body: ShowcaseRequestBody;

  try {
    body = (await request.json()) as ShowcaseRequestBody;
  } catch {
    return NextResponse.json(
      { error: "JSON non valido." },
      { status: 400 }
    );
  }

  const normalizedSlots = normalizeSlotsPayload(body);

  const selectedIds = Array.from(
    new Set(Object.values(normalizedSlots).filter(Boolean))
  ) as string[];

  if (selectedIds.length > 0) {
    const { data: selectedGalleries, error: selectedGalleriesError } =
      await admin
        .from("galleries")
        .select("id, status")
        .in("id", selectedIds);

    if (selectedGalleriesError) {
      return NextResponse.json(
        {
          error: "Errore controllo gallerie selezionate.",
          details: selectedGalleriesError.message,
        },
        { status: 500 }
      );
    }

    const publishedGalleryIds = new Set(
      (selectedGalleries || [])
        .filter((gallery) => gallery.status === "published")
        .map((gallery) => gallery.id)
    );

    const invalidGalleryIds = selectedIds.filter(
      (galleryId) => !publishedGalleryIds.has(galleryId)
    );

    if (invalidGalleryIds.length > 0) {
      return NextResponse.json(
        {
          error: "Puoi selezionare solo gallerie pubblicate.",
          invalidGalleryIds,
        },
        { status: 400 }
      );
    }
  }

  const rows = SLOT_KEYS.map((slotKey) => ({
    slot_key: slotKey,
    gallery_id: normalizedSlots[slotKey],
    updated_by: user?.id || null,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await admin
    .from("public_gallery_slots")
    .upsert(rows, { onConflict: "slot_key" });

  if (upsertError) {
    return NextResponse.json(
      {
        error: "Errore salvataggio vetrina pubblica.",
        details: upsertError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    slots: slotsMapToRows(normalizedSlots),
    slotMap: normalizedSlots,
  });
}

export async function POST(request: Request) {
  return saveSlots(request);
}

export async function PUT(request: Request) {
  return saveSlots(request);
}

export async function PATCH(request: Request) {
  return saveSlots(request);
}