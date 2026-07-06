import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ArtworkInventoryTable from "@/components/dashboard/ArtworkInventoryTable";
import DataErrorCard from "@/components/system/DataErrorCard";
import { getErrorMessage } from "@/lib/system/getErrorMessage";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type Artwork = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
  technique: string | null;
  price: number | string | null;
  currency: string | null;
  image_url: string;
  thumbnail_url: string | null;
  is_for_sale: boolean;
  created_at: string;
  updated_at: string | null;
};

export default async function DashboardArtworkInventoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return (
      <DashboardShell
        title="Inventario opere"
        subtitle="Modifica rapidamente le informazioni principali delle opere."
        activeSection="opere"
      >
        <DataErrorCard
          title="Profilo non trovato"
          message="Non riesco a leggere il profilo utente."
          details={getErrorMessage(profileError)}
          actionHref="/auth/login"
          actionLabel="Vai al login"
          secondaryHref="/dashboard"
          secondaryLabel="Dashboard"
        />
      </DashboardShell>
    );
  }

  const canManageArtworks =
    profile.role === "gallerist" || profile.role === "admin";

  if (!canManageArtworks) {
    return (
      <DashboardShell
        title="Area riservata ai galleristi"
        subtitle={`Il tuo ruolo attuale è ${profile.role}. Per gestire opere devi avere il ruolo gallerista.`}
        activeSection="opere"
      >
        <a
          href="/dashboard"
          className="inline-flex rounded-full border border-[var(--museum-border-soft)] px-5 py-2 text-sm text-[var(--museum-ivory-soft)] transition hover:border-[var(--museum-bronze)]"
        >
          Torna alla dashboard
        </a>
      </DashboardShell>
    );
  }

  const { data: artworks, error: artworksError } = await supabase
    .from("artworks")
    .select(
      "id, title, artist_name, year, technique, price, currency, image_url, thumbnail_url, is_for_sale, created_at, updated_at"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const safeArtworks = (artworks || []) as Artwork[];

  return (
    <DashboardShell
      title="Inventario opere"
      subtitle="Una vista rapida per modificare titolo, artista, anno, tecnica, prezzo, valuta e stato di vendita."
      activeSection="opere"
      actions={
        <div className="flex flex-wrap gap-3">
          <a
            href="/dashboard/opere"
            className="rounded-full border border-[var(--museum-border-soft)] px-5 py-2 text-sm text-[var(--museum-ivory-soft)] transition hover:border-[var(--museum-bronze)]"
          >
            Archivio opere
          </a>

          <a
            href="/dashboard/gallerie"
            className="rounded-full border border-[var(--museum-border-soft)] px-5 py-2 text-sm text-[var(--museum-ivory-soft)] transition hover:border-[var(--museum-bronze)]"
          >
            Gallerie
          </a>
        </div>
      }
    >
      {artworksError && (
        <div className="mb-6">
          <DataErrorCard
            title="Non riesco a caricare le opere"
            message="Le opere non sono state recuperate correttamente da Supabase."
            details={getErrorMessage(artworksError)}
            actionHref="/dashboard/opere/inventario"
            actionLabel="Ricarica inventario"
            secondaryHref="/dashboard/opere"
            secondaryLabel="Archivio opere"
          />
        </div>
      )}

      {!artworksError && <ArtworkInventoryTable artworks={safeArtworks} />}
    </DashboardShell>
  );
}
