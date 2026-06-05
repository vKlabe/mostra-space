import UnityGalleryViewer from "@/components/unity/UnityGalleryViewer";
import { createClient } from "@/lib/supabase/server";

type ViewerGalleryPageProps = {
  params: Promise<{
    galleryId: string;
  }>;
};

export default async function ViewerGalleryPage({
  params,
}: ViewerGalleryPageProps) {
  const { galleryId } = await params;

  const supabase = await createClient();

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("id, title, description, status")
    .eq("id", galleryId)
    .single();

  if (galleryError || !gallery || gallery.status !== "published") {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
        <section className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-neutral-500">
            Viewer
          </p>

          <h1 className="text-4xl font-semibold">Galleria non disponibile</h1>

          <p className="mt-4 max-w-2xl text-neutral-300">
            Questa galleria non è pubblicata oppure non è più disponibile.
          </p>

          <a
            href="/"
            className="mt-8 inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Torna al sito
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-50">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
              ArtPortal Viewer
            </p>

            <h1 className="text-3xl font-semibold">
              {gallery.title}
            </h1>

            {gallery.description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                {gallery.description}
              </p>
            )}

            {!gallery.description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                Viewer pubblico della galleria virtuale.
              </p>
            )}
          </div>

          <a
            href="/"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Torna al sito
          </a>
        </div>

        <UnityGalleryViewer galleryId={gallery.id} mode="visitor" />
      </section>
    </main>
  );
}