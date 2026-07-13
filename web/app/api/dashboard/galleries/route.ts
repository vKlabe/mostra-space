import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canCreateGallery,
  canUseTemplateByPlan,
  getPlanLimits,
  isMarketplaceTemplate,
  normalizePlanName,
} from "@/lib/plans";

export const dynamic = "force-dynamic";

type CreateGalleryPayload = {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  templateId?: unknown;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: string | null;
};

type Template = {
  id: string;
  name: string;
  available_from_plan: string | null;
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
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

export async function POST(request: Request) {
  let body: CreateGalleryPayload;

  try {
    body = (await request.json()) as CreateGalleryPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = cleanText(body.title);
  const rawSlug = cleanText(body.slug);
  const description = cleanNullableText(body.description);
  const templateId = cleanText(body.templateId);

  if (!title) {
    return NextResponse.json(
      { error: "Il titolo della galleria è obbligatorio." },
      { status: 400 }
    );
  }

  if (!templateId) {
    return NextResponse.json(
      { error: "Devi selezionare un template." },
      { status: 400 }
    );
  }

  const slug = slugify(rawSlug || title);

  if (!slug) {
    return NextResponse.json({ error: "Slug non valido." }, { status: 400 });
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const canManage =
    profile.role === "gallerist" || profile.role === "admin";

  if (!canManage) {
    return NextResponse.json(
      { error: "Solo i galleristi possono creare gallerie." },
      { status: 403 }
    );
  }

  const plan = normalizePlanName(profile.plan);
  const limits = getPlanLimits(plan);

  const { count: galleryCount, error: countError } = await admin
    .from("galleries")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (countError) {
    return NextResponse.json(
      {
        error: "Errore controllo limite gallerie.",
        details: countError.message,
      },
      { status: 500 }
    );
  }

  const currentGalleryCount = galleryCount || 0;
  const galleryCheck = canCreateGallery(plan, currentGalleryCount);

  if (!galleryCheck.allowed) {
    return NextResponse.json(
      {
        error:
          galleryCheck.reason ||
          `Hai raggiunto il limite di gallerie del piano ${limits.label}.`,
        current: currentGalleryCount,
        limit: limits.maxGalleries,
        upgradeTo: galleryCheck.upgradeTo,
      },
      { status: 403 }
    );
  }

  const { data: templates, error: templatesError } = await admin
    .from("gallery_templates")
    .select("id, name, available_from_plan")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (templatesError) {
    return NextResponse.json(
      {
        error: "Errore caricamento template.",
        details: templatesError.message,
      },
      { status: 500 }
    );
  }

  const safeTemplates = (templates || []) as Template[];
  const selectedTemplate = safeTemplates.find(
    (template) => template.id === templateId
  );

  if (!selectedTemplate) {
    return NextResponse.json(
      { error: "Template non trovato o non attivo." },
      { status: 404 }
    );
  }

  const isAdmin = profile.role === "admin";
  const templateAccessPlan = selectedTemplate.available_from_plan || "free";
  const templatePlanCheck = canUseTemplateByPlan(plan, templateAccessPlan);

  let canUseTemplate = isAdmin || templatePlanCheck.allowed;

  if (!canUseTemplate && isMarketplaceTemplate(templateAccessPlan)) {
    try {
      canUseTemplate = await userHasPurchasedTemplate({
        admin,
        userId: user.id,
        templateId: selectedTemplate.id,
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
          : templatePlanCheck.reason ||
            "Questo template non è disponibile per il tuo piano.",
        upgradeTo: isMarketplace ? null : templatePlanCheck.upgradeTo,
      },
      { status: 403 }
    );
  }

  const { data: existingSlug } = await admin
    .from("galleries")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlug) {
    return NextResponse.json(
      {
        error:
          "Questo slug è già in uso. Scegli uno slug diverso per la galleria.",
      },
      { status: 409 }
    );
  }

  const { data: gallery, error: insertError } = await admin
    .from("galleries")
    .insert({
      owner_id: user.id,
      template_id: selectedTemplate.id,
      title,
      slug,
      description,
      status: "draft",
    })
    .select(
      "id, owner_id, template_id, title, slug, description, status, created_at"
    )
    .single();

  if (insertError || !gallery) {
    return NextResponse.json(
      {
        error: "Errore creazione galleria.",
        details: insertError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    gallery,
    usage: {
      current: currentGalleryCount + 1,
      limit: limits.maxGalleries,
      plan: limits.name,
    },
  });
}