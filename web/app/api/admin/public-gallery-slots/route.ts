import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SLOT_KEYS = ["main", "featured_1", "featured_2", "featured_3"] as const;

type SlotKey = (typeof SLOT_KEYS)[number];

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type PublicGallerySlot = {
  slot_key: SlotKey;
  gallery_id: string | null;
};

function emptySlots(): Record<SlotKey, string | null> {
  return {
    main: null,
    featured_1: null,
    featured_2: null,
    featured_3: null,
  };
}

function normalizeGalleryId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
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
    .select("slot_key, gallery_id")
    .in("slot_key", SLOT_KEYS as unknown as string[]);

  if (slotsError) {
    return NextResponse.json(
      {
        error: "Errore caricamento vetrina pubblica.",
        details: slotsError.message,
      },
      { status: 500 }
    );
  }

  const slots = emptySlots();

  for (const row of (slotRows || []) as PublicGallerySlot[]) {
    if (SLOT_KEYS.includes(row.slot_key)) {
      slots[row.slot_key] = row.gallery_id;
    }
  }

  return NextResponse.json({
    galleries: galleries || [],
    slots,
  });
}

export async function POST(request: Request) {
  const { user, admin, error } = await requireAdmin();

  if (error) {
    return error;
  }

  let body: {
    slots?: Partial<Record<SlotKey, string | null>>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON non valido." },
      { status: 400 }
    );
  }

  const requestedSlots = body.slots || {};

  const normalizedSlots = {
    main: normalizeGalleryId(requestedSlots.main),
    featured_1: normalizeGalleryId(requestedSlots.featured_1),
    featured_2: normalizeGalleryId(requestedSlots.featured_2),
    featured_3: normalizeGalleryId(requestedSlots.featured_3),
  } satisfies Record<SlotKey, string | null>;

  const selectedIds = Object.values(normalizedSlots).filter(Boolean) as string[];

  if (selectedIds.length > 0) {
    const { data: publishedGalleries, error: validationError } = await admin
      .from("galleries")
      .select("id")
      .eq("status", "published")
      .in("id", selectedIds);

    if (validationError) {
      return NextResponse.json(
        {
          error: "Errore validazione gallerie.",
          details: validationError.message,
        },
        { status: 500 }
      );
    }

    const validIds = new Set((publishedGalleries || []).map((gallery) => gallery.id));

    const invalidIds = selectedIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: "Puoi selezionare solo gallerie pubblicate.",
          invalidIds,
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
    slots: normalizedSlots,
  });
}