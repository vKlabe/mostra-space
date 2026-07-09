import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import InquiryStatusButton from "@/components/dashboard/InquiryStatusButton";
import DeleteInquiryButton from "@/components/dashboard/DeleteInquiryButton";
import DataErrorCard from "@/components/system/DataErrorCard";
import EmptyStateCard from "@/components/system/EmptyStateCard";
import { getErrorMessage } from "@/lib/system/getErrorMessage";
import { getPlanLimits, normalizePlanName } from "@/lib/plans";

type DashboardInquiriesPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "diamond" | "institution";
};

type InquiryStatus = "new" | "read" | "closed";
type InquiryFilter = "all" | InquiryStatus;

type GalleryRelation = {
  id: string;
  title: string;
  slug: string;
  owner_id: string;
};

type ArtworkRelation = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
};

type GalleryInquiry = {
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

function normalizeFilter(value: string | undefined): InquiryFilter {
  if (value === "new" || value === "read" || value === "closed") {
    return value;
  }

  return "all";
}

function getFilterHref(filter: InquiryFilter) {
  if (filter === "all") {
    return "/dashboard/richieste";
  }

  return `/dashboard/richieste?status=${filter}`;
}

function getFilterLabel(filter: InquiryFilter) {
  if (filter === "new") {
    return "Nuove";
  }

  if (filter === "read") {
    return "Lette";
  }

  if (filter === "closed") {
    return "Chiuse";
  }

  return "Tutte";
}

function getStatusLabel(status: InquiryStatus) {
  if (status === "new") {
    return "Nuova";
  }

  if (status === "read") {
    return "Letta";
  }

  return "Chiusa";
}

function getStatusBadgeClass(status: InquiryStatus) {
  if (status === "new") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "read") {
    return "border-neutral-700 bg-neutral-950 text-neutral-300";
  }

  return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
}

function normalizeRelation<T>(value: T | T[] | null) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function getCurrentMonthStart() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  );
}

export default async function DashboardInquiriesPage({
  searchParams,
}: DashboardInquiriesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedFilter = normalizeFilter(resolvedSearchParams.status);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, plan")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    redirect("/auth/login");
  }

  const canManage = profile.role === "gallerist" || profile.role === "admin";

  if (!canManage) {
    return (
      <DashboardShell
        title="Area riservata ai galleristi"
        subtitle="Per vedere le richieste devi avere il ruolo gallerista."
        activeSection="richieste"
      >
        <a
          href="/dashboard"
          className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Torna alla dashboard
        </a>
      </DashboardShell>
    );
  }

  const plan = normalizePlanName(profile.plan);
  const limits = getPlanLimits(plan);
  const monthStart = getCurrentMonthStart();

  const { data: inquiries, error: inquiriesError } = await supabase
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
        slug,
        owner_id
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

  const safeInquiries = (inquiries || []) as unknown as GalleryInquiry[];

  const monthlyInquiries = safeInquiries.filter((inquiry) => {
    return new Date(inquiry.created_at) >= monthStart;
  });

  const visibleInquiries =
    selectedFilter === "all"
      ? safeInquiries
      : safeInquiries.filter((item) => item.status === selectedFilter);

  const filters: Array<{
    filter: InquiryFilter;
    count: number;
  }> = [
    {
      filter: "all",
      count: safeInquiries.length,
    },
    {
      filter: "new",
      count: safeInquiries.filter((item) => item.status === "new").length,
    },
    {
      filter: "read",
      count: safeInquiries.filter((item) => item.status === "read").length,
    },
    {
      filter: "closed",
      count: safeInquiries.filter((item) => item.status === "closed").length,
    },
  ];

  return (
    <DashboardShell
      title="Richieste ricevute"
      subtitle="Qui trovi i contatti lasciati dai visitatori nelle pagine pubbliche delle tue gallerie."
      activeSection="richieste"
      actions={
        <>
          <a
            href="/gallerie"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Elenco pubblico
          </a>

          <a
            href="/api/dashboard/inquiries-export"
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            Scarica CSV
          </a>
        </>
      }
    >
      {inquiriesError && (
        <div className="mb-6">
          <DataErrorCard
            title="Non riesco a caricare le richieste"
            message="Le richieste non sono state recuperate correttamente da Supabase. Puoi ricaricare la pagina oppure tornare alla dashboard."
            details={getErrorMessage(inquiriesError)}
            actionHref="/dashboard/richieste"
            actionLabel="Ricarica richieste"
            secondaryHref="/dashboard"
            secondaryLabel="Dashboard"
          />
        </div>
      )}

      <div className="mb-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Limiti piano
            </p>

            <h2 className="text-2xl font-medium">{limits.label}</h2>

            <p className="mt-2 text-sm text-neutral-400">
              Richieste ricevute questo mese: {monthlyInquiries.length} /{" "}
              {limits.maxRequestsPerMonth === null
                ? "Illimitato"
                : limits.maxRequestsPerMonth}
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              Le richieste vengono conteggiate dal primo giorno del mese.
            </p>
          </div>

          {limits.maxRequestsPerMonth !== null &&
            monthlyInquiries.length >= limits.maxRequestsPerMonth && (
              <a
                href="/pricing"
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                Passa a un piano superiore
              </a>
            )}
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Inbox
            </p>

            <h2 className="text-2xl font-medium">Contatti e lead</h2>
          </div>

          <p className="text-sm text-neutral-500">
            Totale: {visibleInquiries.length}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {filters.map((item) => {
            const isActive = selectedFilter === item.filter;

            return (
              <a
                key={item.filter}
                href={getFilterHref(item.filter)}
                className={
                  isActive
                    ? "rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950"
                    : "rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-100"
                }
              >
                {getFilterLabel(item.filter)}{" "}
                <span
                  className={isActive ? "text-neutral-700" : "text-neutral-600"}
                >
                  {item.count}
                </span>
              </a>
            );
          })}
        </div>

        {!inquiriesError && safeInquiries.length === 0 && (
          <div className="mt-8">
            <EmptyStateCard
              eyebrow="Nessuna richiesta"
              title="Non hai ancora ricevuto richieste"
              message="Quando un visitatore compilera il form pubblico di una galleria o di un opera, la richiesta apparira qui."
              actionHref="/gallerie"
              actionLabel="Apri gallerie pubbliche"
            />
          </div>
        )}

        {!inquiriesError &&
          safeInquiries.length > 0 &&
          visibleInquiries.length === 0 && (
            <div className="mt-8">
              <EmptyStateCard
                eyebrow="Filtro vuoto"
                title="Nessuna richiesta in questa categoria"
                message="Cambia filtro per visualizzare altre richieste. Le richieste non sono state eliminate: non rientrano nel filtro selezionato."
                actionHref="/dashboard/richieste"
                actionLabel="Mostra tutte"
              />
            </div>
          )}

        {visibleInquiries.length > 0 && (
          <div className="mt-6 space-y-4">
            {visibleInquiries.map((inquiry) => {
              const gallery = normalizeRelation(inquiry.galleries);
              const artwork = normalizeRelation(inquiry.artworks);

              const emailSubject = artwork
                ? `Risposta alla richiesta per l opera ${artwork.title}`
                : `Risposta alla richiesta per ${
                    gallery?.title || "la galleria"
                  }`;

              return (
                <article
                  key={inquiry.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-medium">
                          {inquiry.name}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getStatusBadgeClass(
                            inquiry.status
                          )}`}
                        >
                          {getStatusLabel(inquiry.status)}
                        </span>

                        {artwork ? (
                          <span className="rounded-full border border-blue-900 bg-blue-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-blue-300">
                            Richiesta opera
                          </span>
                        ) : (
                          <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-400">
                            Richiesta galleria
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-neutral-400">
                        <a
                          href={`mailto:${inquiry.email}`}
                          className="underline-offset-4 hover:text-white hover:underline"
                        >
                          {inquiry.email}
                        </a>
                      </p>

                      {inquiry.message && (
                        <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                          {inquiry.message}
                        </p>
                      )}

                      <dl className="mt-4 space-y-1 text-xs text-neutral-500">
                        <div>
                          <dt className="inline">Galleria: </dt>
                          <dd className="inline">
                            {gallery ? gallery.title : "Galleria non trovata"}
                          </dd>
                        </div>

                        {gallery && (
                          <div>
                            <dt className="inline">Link pubblico: </dt>
                            <dd className="inline">
                              <a
                                href={`/gallerie/${gallery.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-neutral-300 underline-offset-4 hover:text-white hover:underline"
                              >
                                /gallerie/{gallery.slug}
                              </a>
                            </dd>
                          </div>
                        )}

                        {artwork && (
                          <div>
                            <dt className="inline">Opera richiesta: </dt>
                            <dd className="inline text-neutral-300">
                              {artwork.title}
                              {artwork.artist_name
                                ? ` — ${artwork.artist_name}`
                                : ""}
                              {artwork.year ? `, ${artwork.year}` : ""}
                            </dd>
                          </div>
                        )}

                        <div>
                          <dt className="inline">Ricevuta: </dt>
                          <dd className="inline">
                            {new Date(inquiry.created_at).toLocaleString(
                              "it-IT"
                            )}
                          </dd>
                        </div>
                      </dl>

                      <InquiryStatusButton
                        inquiryId={inquiry.id}
                        currentStatus={inquiry.status}
                      />

                      <DeleteInquiryButton
                        inquiryId={inquiry.id}
                        inquiryName={inquiry.name}
                      />
                    </div>

                    <a
                      href={`mailto:${inquiry.email}?subject=${encodeURIComponent(
                        emailSubject
                      )}`}
                      className="shrink-0 rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                    >
                      Rispondi via email
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}