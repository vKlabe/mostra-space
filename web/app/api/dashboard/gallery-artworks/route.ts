import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canAddArtworkToGallery,
  getPlanLimits,
  normalizePlanName,
} from "@/lib/plans";

export const dynamic = "force-dynamic";

type AddArtworkPayload = {
  galleryId?: unknown;
  artworkId?: unknown;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: string | null;
};

type Gallery = {
  id: string;
  owner_id: string;
  template_id: string | null;
};

type GalleryTemplate = {
  id: string;
  max_artworks: number;
};

type Artwork = {
  id: string;
  owner_id: string;
  title: string;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getEffectiveLimit(
  planLimit: number | null,
  templateLimit: number | null
) {
  if (planLimit === null && templateLimit === null) {
    return null;
  }

  if (planLimit === null) {
    return templateLimit;
  }

  if (templateLimit === null) {
    return planLimit;
  }

  return Math.min(planLimit, templateLimit);
}

export async function POST(request: Request) {
  let body: AddArtworkPayload;

  try {
    body = (await request.json()) as AddArtworkPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const galleryId = cleanText(body.galleryId);
  const artworkId = cleanText(body.artworkId);

  if (!galleryId) {
    return NextResponse.json(
      { error: "Gallery ID mancante." },
      { status: 400 }
    );
  }

  if (!artworkId) {
    return NextResponse.json(
      { error: "Artwork ID mancante." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, plan")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return NextResponse.json(
      {
        error: "Profilo non trovato.",
        details: profileError?.message || null,
      },
      { status: 404 }
    );
  }

  const { data: gallery, error: galleryError } = await admin
    .from("galleries")
    .select("id, owner_id, template_id")
    .eq("id", galleryId)
    .single<Gallery>();

  if (galleryError || !gallery) {
    return NextResponse.json(
      {
        error: "Galleria non trovata.",
        details: galleryError?.message || null,
      },
      { status: 404 }
    );
  }

  const isAdmin = profile.role === "admin";
  const isOwner = gallery.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      { error: "Non puoi modificare questa galleria." },
      { status: 403 }
    );
  }

  const { data: artwork, error: artworkError } = await admin
    .from("artworks")
    .select("id, owner_id, title")
    .eq("id", artworkId)
    .eq("owner_id", gallery.owner_id)
    .single<Artwork>();

  if (artworkError || !artwork) {
    return NextResponse.json(
      {
        error: "Opera non trovata oppure non appartiene al proprietario della galleria.",
        details: artworkError?.message || null,
      },
      { status: 404 }
    );
  }

  const { data: existingLink } = await admin
    .from("gallery_artworks")
    .select("id")
    .eq("gallery_id", gallery.id)
    .eq("artwork_id", artwork.id)
    .maybeSingle();

  if (existingLink) {
    return NextResponse.json(
      { error: "Questa opera è già collegata alla galleria." },
      { status: 409 }
    );
  }

  const { count: currentGalleryArtworkCount, error: countError } = await admin
    .from("gallery_artworks")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", gallery.id);

  if (countError) {
    return NextResponse.json(
      {
        error: "Errore controllo opere nella galleria.",
        details: countError.message,
      },
      { status: 500 }
    );
  }

  const currentCount = currentGalleryArtworkCount || 0;

  const plan = normalizePlanName(profile.plan);
  const limits = getPlanLimits(plan);

  const planCheck = canAddArtworkToGallery(plan, currentCount);

  if (!planCheck.allowed) {
    return NextResponse.json(
      {
        error:
          planCheck.reason ||
          `Questa galleria ha raggiunto il limite opere del piano ${limits.label}.`,
        current: currentCount,
        limit: limits.maxArtworksPerGallery,
        upgradeTo: planCheck.upgradeTo,
      },
      { status: 403 }
    );
  }

  let templateLimit: number | null = null;

  if (gallery.template_id) {
    const { data: template } = await admin
      .from("gallery_templates")
      .select("id, max_artworks")
      .eq("id", gallery.template_id)
      .single<GalleryTemplate>();

    if (template && template.max_artworks > 0) {
      templateLimit = template.max_artworks;
    }
  }

  const effectiveLimit = getEffectiveLimit(
    limits.maxArtworksPerGallery,
    templateLimit
  );

  if (effectiveLimit !== null && currentCount >= effectiveLimit) {
    return NextResponse.json(
      {
        error:
          "Questa galleria ha raggiunto il numero massimo di opere consentito dal piano o dal template stanza.",
        current: currentCount,
        limit: effectiveLimit,
        planLimit: limits.maxArtworksPerGallery,
        templateLimit,
      },
      { status: 403 }
    );
  }

  const nextSortOrder = currentCount + 1;

  const { data: galleryArtwork, error: insertError } = await admin
    .from("gallery_artworks")
    .insert({
      gallery_id: gallery.id,
      artwork_id: artwork.id,
      position_x: 0,
      position_y: 1.6,
      position_z: 0,
      rotation_x: 0,
      rotation_y: 0,
      rotation_z: 0,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
      wall_key: null,
      sort_order: nextSortOrder,
    })
    .select("id, gallery_id, artwork_id, sort_order")
    .single();

  if (insertError || !galleryArtwork) {
    return NextResponse.json(
      {
        error: "Errore collegamento opera alla galleria.",
        details: insertError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    galleryArtwork,
    usage: {
      current: currentCount + 1,
      effectiveLimit,
      planLimit: limits.maxArtworksPerGallery,
      templateLimit,
      plan,
    },
  });
}