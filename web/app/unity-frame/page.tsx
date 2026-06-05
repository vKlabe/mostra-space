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
        <div>
          <h1 className="text-2xl font-semibold">GalleryId mancante</h1>

          <p className="mt-3 text-sm text-neutral-400">
            Impossibile avviare Unity senza una galleria valida.
          </p>
        </div>
      </main>
    );
  }

  return (
    <UnityFrameClient
      galleryId={galleryId}
      mode={mode}
    />
  );
}