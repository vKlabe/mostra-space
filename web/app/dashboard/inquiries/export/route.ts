import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type GalleryRecord = {
  id: string;
  owner_id: string;
};

type InquiryStatus = "new" | "read" | "closed";

type GalleryRelation = {
  id: string;
  title: string;
  slug: string;
};

type ArtworkRelation = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
};

type InquiryRecord = {
  id: string;
  gallery_id: string;
  artwork_id: string | null;
  name: string;
  email: string;
  message: string | null;
  status: InquiryStatus;
  created_at: string;
  galleries: GalleryRelation | GalleryRelation[] | null;
  artworks: ArtworkRelation | ArtworkRelation[] | null;
};

function normalizeRelation<T>(value: T | T[] | null) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function escapeCsvCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value).replace(/\r?\n|\r/g, " ").trim();

  if (text.includes(",") || text.includes('"') || text.includes(";")) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function createCsv(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
}

export async function GET() {
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

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  let galleryIds: string[] = [];

  if (!isAdmin) {
    const { data: ownedGalleries, error: galleriesError } = await admin
      .from("galleries")
      .select("id, owner_id")
      .eq("owner_id", user.id);

    if (galleriesError) {
      return NextResponse.json(
        {
          error: "Errore caricamento gallerie.",
          details: galleriesError.message,
        },
        { status: 500 }
      );
    }

    galleryIds = ((ownedGalleries || []) as GalleryRecord[]).map(
      (gallery) => gallery.id
    );

    if (galleryIds.length === 0) {
      const emptyCsv = createCsv([
        [
          "created_at",
          "status",
          "name",
          "email",
          "message",
          "gallery_title",
          "gallery_slug",
          "artwork_title",
          "artwork_artist",
          "artwork_year",
        ],
      ]);

      return new Response(emptyCsv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="richieste-gallerie.csv"`,
        },
      });
    }
  }

  let query = admin
    .from("gallery_inquiries")
    .select(
      `
      id,
      gallery_id,
      artwork_id,
      name,
      email,
      message,
      status,
      created_at,
      galleries (
        id,
        title,
        slug
      ),
      artworks (
        id,
        title,
        artist_name,
        year
      )
    `
    )
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.in("gallery_id", galleryIds);
  }

  const { data: inquiries, error: inquiriesError } = await query;

  if (inquiriesError) {
    return NextResponse.json(
      {
        error: "Errore export richieste.",
        details: inquiriesError.message,
      },
      { status: 500 }
    );
  }

  const safeInquiries = (inquiries || []) as unknown as InquiryRecord[];

  const csvRows: string[][] = [
    [
      "created_at",
      "status",
      "name",
      "email",
      "message",
      "gallery_title",
      "gallery_slug",
      "artwork_title",
      "artwork_artist",
      "artwork_year",
    ],
  ];

  safeInquiries.forEach((inquiry) => {
    const gallery = normalizeRelation(inquiry.galleries);
    const artwork = normalizeRelation(inquiry.artworks);

    csvRows.push([
      new Date(inquiry.created_at).toLocaleString("it-IT"),
      inquiry.status,
      inquiry.name,
      inquiry.email,
      inquiry.message || "",
      gallery?.title || "",
      gallery?.slug || "",
      artwork?.title || "",
      artwork?.artist_name || "",
      artwork?.year || "",
    ]);
  });

  const csv = createCsv(csvRows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="richieste-gallerie.csv"`,
    },
  });
}