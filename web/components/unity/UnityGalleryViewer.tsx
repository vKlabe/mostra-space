"use client";

type UnityMode = "visitor" | "editor";

type UnityGalleryViewerProps = {
  galleryId: string;
  mode: UnityMode;
};

export default function UnityGalleryViewer({
  galleryId,
  mode,
}: UnityGalleryViewerProps) {
  const iframeSrc = `/unity-frame?galleryId=${encodeURIComponent(
    galleryId
  )}&mode=${encodeURIComponent(mode)}`;

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-black">
        <iframe
          src={iframeSrc}
          title={`Unity gallery viewer ${galleryId}`}
          className="block h-[70vh] w-full bg-black"
          allow="fullscreen; gamepad; xr-spatial-tracking; clipboard-read; clipboard-write"
        />
      </div>

      <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300 md:flex-row md:items-center">
        <div>
          <p className="text-neutral-100">
            Unity isolato in iframe
          </p>

          <p className="mt-1 break-all text-xs text-neutral-500">
            GalleryId: {galleryId} · Mode: {mode}
          </p>

          <p className="mt-1 text-xs text-neutral-600">
            Se clicchi dentro Unity, il controllo rimane nell iframe. Il form
            sotto resta indipendente.
          </p>
        </div>

        <a
          href={iframeSrc}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Apri Unity a schermo intero
        </a>
      </div>
    </div>
  );
}