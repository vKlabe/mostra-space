import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canReceiveRequest, getPlanLimits, normalizePlanName } from "@/lib/plans";
import { sendGalleryInquiryEmail } from "@/lib/email/sendGalleryInquiryEmail";

export const dynamic = "force-dynamic";

const PRIVACY_POLICY_VERSION = "2026-06-privacy-v1";

type GalleryInquiryPayload = {
  galleryId?: unknown;
  artworkId?: unknown;
  galleryArtworkId?: unknown;
  name?: unknown;
  email?: unknown;
  message?: unknown;
  website?: unknown;
  privacyAccepted?: unknown;
  marketingConsent?: unknown;
};

type GalleryRecord = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
};

type ArtworkRecord = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
};

type GalleryArtworkRecord = {
  id: string;
  gallery_id: string;
  artwork_id: string;
};

type ProfileRecord = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  plan: string | null;
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getMonthStartIso() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  ).toISOString();
}

export async function POST(request: Request) {
  let body: GalleryInquiryPayload;

  try {
    body = (await request.json()) as GalleryInquiryPayload;
  } catch {
    return NextResponse.json(
      { error: "Richiesta non valida." },
      { status: 400 }
    );
  }

  const galleryId = cleanText(body.galleryId);
  const artworkId = cleanNullableText(body.artworkId);
  const galleryArtworkId = cleanNullableText(body.galleryArtworkId);
  const name = cleanText(body.name);
  const email = cleanText(body.email).toLowerCase();
  const message = cleanNullableText(body.message);
  const website = cleanText(body.website);
  const privacyAccepted = body.privacyAccepted === true;
  const marketingConsent = body.marketingConsent === true;

  if (website) {
    return NextResponse.json({
      success: true,
    });
  }

  if (!galleryId) {
    return NextResponse.json(
      { error: "Galleria mancante." },
      { status: 400 }
    );
  }

  if (!name) {
    return NextResponse.json(
      { error: "Il nome è obbligatorio." },
      { status: 400 }
    );
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Inserisci un indirizzo email valido." },
      { status: 400 }
    );
  }

  if (!privacyAccepted) {
    return NextResponse.json(
      {
        error:
          "Devi dichiarare di aver letto l’informativa privacy per inviare la richiesta.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: gallery, error: galleryError } = await admin
    .from("galleries")
    .select("id, owner_id, title, slug")
    .eq("id", galleryId)
    .eq("status", "published")
    .single<GalleryRecord>();

  if (galleryError || !gallery) {
    return NextResponse.json(
      {
        error:
          "Galleria non trovata oppure non più disponibile pubblicamente.",
      },
      { status: 404 }
    );
  }

  const { data: ownerProfile, error: ownerProfileError } = await admin
    .from("profiles")
    .select("id, email, display_name, full_name, plan")
    .eq("id", gallery.owner_id)
    .single<ProfileRecord>();

  if (ownerProfileError || !ownerProfile) {
    return NextResponse.json(
      {
        error: "Proprietario galleria non trovato.",
        details: ownerProfileError?.message || null,
      },
      { status: 404 }
    );
  }

  const plan = normalizePlanName(ownerProfile.plan);
  const limits = getPlanLimits(plan);
  const monthStartIso = getMonthStartIso();

  const { count: monthlyRequestsCount, error: monthlyCountError } = await admin
    .from("gallery_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", gallery.id)
    .gte("created_at", monthStartIso);

  if (monthlyCountError) {
    return NextResponse.json(
      {
        error: "Errore controllo limite richieste mensili.",
        details: monthlyCountError.message,
      },
      { status: 500 }
    );
  }

  const monthlyCount = monthlyRequestsCount || 0;
  const requestCheck = canReceiveRequest(plan, monthlyCount);

  if (!requestCheck.allowed) {
    return NextResponse.json(
      {
        error:
          "Questa galleria ha raggiunto il limite mensile di richieste. Riprova più avanti o contatta direttamente il gallerista.",
        current: monthlyCount,
        limit: limits.maxRequestsPerMonth,
        upgradeTo: requestCheck.upgradeTo,
      },
      { status: 403 }
    );
  }

  let galleryArtwork: GalleryArtworkRecord | null = null;

  if (galleryArtworkId) {
    const { data: galleryArtworkData, error: galleryArtworkError } =
      await admin
        .from("gallery_artworks")
        .select("id, gallery_id, artwork_id")
        .eq("id", galleryArtworkId)
        .eq("gallery_id", gallery.id)
        .single<GalleryArtworkRecord>();

    if (galleryArtworkError || !galleryArtworkData) {
      return NextResponse.json(
        { error: "Opera allestita non trovata in questa galleria." },
        { status: 404 }
      );
    }

    if (artworkId && galleryArtworkData.artwork_id !== artworkId) {
      return NextResponse.json(
        {
          error:
            "L’opera richiesta non corrisponde all’opera allestita indicata.",
        },
        { status: 400 }
      );
    }

    galleryArtwork = galleryArtworkData;
  }

  const finalArtworkId = galleryArtwork?.artwork_id || artworkId || null;

  let artwork: ArtworkRecord | null = null;

  if (finalArtworkId) {
    const { data: artworkData, error: artworkError } = await admin
      .from("artworks")
      .select("id, title, artist_name, year")
      .eq("id", finalArtworkId)
      .eq("is_public", true)
      .single<ArtworkRecord>();

    if (artworkError || !artworkData) {
      return NextResponse.json(
        { error: "Opera richiesta non trovata o non pubblica." },
        { status: 404 }
      );
    }

    artwork = artworkData;
  }

  const userAgent = request.headers.get("user-agent") || null;

  const consentText =
    "Dichiaro di aver letto l’informativa privacy e autorizzo il trattamento dei dati inseriti per essere ricontattato in merito alla richiesta inviata tramite il form della galleria virtuale.";

  const nowIso = new Date().toISOString();

  const { data: inquiry, error: insertError } = await admin
    .from("gallery_inquiries")
    .insert({
      gallery_id: gallery.id,
      artwork_id: artwork?.id || null,
      gallery_artwork_id: galleryArtwork?.id || null,
      name,
      email,
      message,
      status: "new",
      privacy_accepted_at: nowIso,
      consent_text: consentText,
      privacy_policy_version: PRIVACY_POLICY_VERSION,
      marketing_consent: marketingConsent,
      marketing_consent_at: marketingConsent ? nowIso : null,
      user_agent: userAgent,
    })
    .select(
      "id, gallery_id, artwork_id, gallery_artwork_id, name, email, message, status, created_at"
    )
    .single();

  if (insertError || !inquiry) {
    return NextResponse.json(
      {
        error: "Errore salvataggio richiesta.",
        details: insertError?.message || null,
      },
      { status: 500 }
    );
  }

  if (ownerProfile.email) {
    await sendGalleryInquiryEmail({
      to: ownerProfile.email,
      galleryTitle: gallery.title,
      gallerySlug: gallery.slug,
      inquiryName: name,
      inquiryEmail: email,
      inquiryMessage: message || "",
      artworkTitle: artwork?.title || null,
    });
  }

  return NextResponse.json({
    success: true,
    inquiry,
    usage: {
      plan,
      current: monthlyCount + 1,
      limit: limits.maxRequestsPerMonth,
    },
  });
}