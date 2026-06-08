import UnityFrameClient from "@/components/unity/UnityFrameClient";

type UnityFramePageProps = {
  searchParams?: Promise<{
    galleryId?: string;
    mode?: string;
  }>;
};

export default async function UnityFramePage({
  searchParams,
}: UnityFramePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const galleryId = resolvedSearchParams.galleryId || "";
  const mode = resolvedSearchParams.mode === "editor" ? "editor" : "visitor";

  if (!galleryId) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-black p-8 text-white">
        <div className="max-w-xl rounded-3xl border border-neutral-800 bg-neutral-950 p-8">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Unity Frame
          </p>

          <h1 className="text-2xl font-semibold">GalleryId mancante</h1>

          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Impossibile avviare Unity senza una galleria valida. Torna alla
            dashboard e apri il viewer da una galleria esistente.
          </p>

          <a
            href="/dashboard/gallerie"
            className="mt-6 inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Torna alle gallerie
          </a>
        </div>
      </main>
    );
  }

  return <UnityFrameClient galleryId={galleryId} mode={mode} />;
}