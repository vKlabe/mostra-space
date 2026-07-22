import UnityFrameClient from "@/components/unity/UnityFrameClient";
import T from "@/components/i18n/T";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GallerySoundtrack } from "@/components/gallery/GallerySoundtrackPlayer";

type UnityFramePageProps = {
  searchParams?: Promise<{
    galleryId?: string;
    mode?: string;
  }>;
};

type GalleryRecord = {
  id: string;
  soundtrack_id: string | null;
};

type SoundtrackRecord = {
  id: string;
  title: string;
  mood: string | null;
  loop_duration_seconds: number | null;
  audio_url: string | null;
  is_active: boolean;
};

async function getGallerySoundtrack({
  galleryId,
  mode,
}: {
  galleryId: string;
  mode: "visitor" | "editor";
}): Promise<GallerySoundtrack | null> {
  if (!galleryId || mode !== "visitor") {
    return null;
  }

  try {
    const admin = createAdminClient();

    const { data: gallery } = await admin
      .from("galleries")
      .select("id, soundtrack_id")
      .eq("id", galleryId)
      .maybeSingle<GalleryRecord>();

    if (!gallery?.soundtrack_id) {
      return null;
    }

    const { data: soundtrack } = await admin
      .from("gallery_soundtracks")
      .select("id, title, mood, loop_duration_seconds, audio_url, is_active")
      .eq("id", gallery.soundtrack_id)
      .maybeSingle<SoundtrackRecord>();

    if (
      !soundtrack ||
      soundtrack.is_active !== true ||
      !soundtrack.audio_url
    ) {
      return null;
    }

    return {
      id: soundtrack.id,
      title: soundtrack.title,
      mood: soundtrack.mood,
      loopDurationSeconds: soundtrack.loop_duration_seconds,
      audioUrl: soundtrack.audio_url,
    };
  } catch {
    return null;
  }
}

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
            <T
              textKey="unityFrame.error.label"
              fallback="Unity Frame"
            />
          </p>

          <h1 className="text-2xl font-semibold">
            <T
              textKey="unityFrame.error.title"
              fallback="GalleryId mancante"
            />
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-400">
            <T
              textKey="unityFrame.error.description"
              fallback="Impossibile avviare Unity senza una galleria valida. Torna alla dashboard e apri il viewer da una galleria esistente."
            />
          </p>

          <a
            href="/dashboard/gallerie"
            className="mt-6 inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="unityFrame.error.backToGalleries"
              fallback="Torna alle gallerie"
            />
          </a>
        </div>
      </main>
    );
  }

  const soundtrack = await getGallerySoundtrack({
    galleryId,
    mode,
  });

  return (
    <UnityFrameClient
      galleryId={galleryId}
      mode={mode}
      soundtrack={soundtrack}
    />
  );
}
