import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import UnityGalleryViewer from "@/components/unity/UnityGalleryViewer";

type DashboardGalleryUnityEditorPageProps = {
  params: Promise<{
    galleryId: string;
  }>;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type Gallery = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
};

export default async function DashboardGalleryUnityEditorPage({
  params,
}: DashboardGalleryUnityEditorPageProps) {
  const { galleryId } = await params;

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
    redirect("/auth/login");
  }

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("id, owner_id, title, slug, status")
    .eq("id", galleryId)
    .single<Gallery>();

  if (galleryError || !gallery) {
    return (
      <DashboardShell
        title="Galleria non trovata"
        subtitle="La galleria non esiste oppure non hai i permessi per leggerla."
        activeSection="gallerie"
      >
        <a
          href="/dashboard/gallerie"
          className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Torna alle gallerie
        </a>
      </DashboardShell>
    );
  }

  const isAdmin = profile.role === "admin";
  const isOwner = gallery.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return (
      <DashboardShell
        title="Accesso negato"
        subtitle="Non puoi aprire l editor Unity di questa galleria."
        activeSection="gallerie"
      >
        <a
          href="/dashboard/gallerie"
          className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Torna alle gallerie
        </a>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={`Editor Unity — ${gallery.title}`}
      subtitle="Da qui puoi aprire la scena in modalità editor, spostare le opere e salvare i valori su Supabase."
      activeSection="gallerie"
      actions={
        <>
          <a
            href={`/dashboard/gallerie/${gallery.id}`}
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Gestione galleria
          </a>

          <a
            href={`/gallerie/${gallery.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Viewer pubblico
          </a>
        </>
      }
    >
      <UnityGalleryViewer galleryId={gallery.id} mode="editor" />
    </DashboardShell>
  );
}