import AdminShell from "@/components/admin/AdminShell";
import AdminCreateSoundtrackForm from "@/components/admin/AdminCreateSoundtrackForm";
import AdminSoundtrackControls from "@/components/admin/AdminSoundtrackControls";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import LocalDateTime from "@/components/time/LocalDateTime";

type GallerySoundtrack = {
  id: string;
  title: string;
  mood: string | null;
  loop_duration_seconds: number | null;
  audio_url: string;
  storage_path: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
};

type Gallery = {
  id: string;
  soundtrack_id: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return <LocalDateTime value={value} format="datetime" fallback="-" />;
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return "-";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")} min`;
}

export default async function AdminSoundtracksPage() {
  const { admin } = await requireAdmin();

  const [soundtracksResult, galleriesResult] = await Promise.all([
    admin
      .from("gallery_soundtracks")
      .select(
        [
          "id",
          "title",
          "mood",
          "loop_duration_seconds",
          "audio_url",
          "storage_path",
          "is_active",
          "sort_order",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    admin.from("galleries").select("id, soundtrack_id"),
  ]);

  const soundtracks =
    (soundtracksResult.data || []) as unknown as GallerySoundtrack[];
  const galleries = (galleriesResult.data || []) as unknown as Gallery[];

  const activeCount = soundtracks.filter((item) => item.is_active).length;
  const usedCount = new Set(
    galleries
      .map((gallery) => gallery.soundtrack_id)
      .filter((value): value is string => Boolean(value))
  ).size;

  return (
    <AdminShell
      title="Musiche"
      subtitle="Gestisci le soundtrack disponibili per le gallerie pubbliche. I proprietari potranno scegliere una musica in loop oppure lasciare la galleria senza audio."
      activeSection="soundtracks"
    >
      {(soundtracksResult.error || galleriesResult.error) && (
        <div className="mb-6 rounded-3xl border border-red-800 bg-red-950/30 p-6">
          <p className="text-lg font-medium">Errore caricamento musiche</p>

          {soundtracksResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Soundtracks: {soundtracksResult.error.message}
            </p>
          )}

          {galleriesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Galleries: {galleriesResult.error.message}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Totale musiche
          </p>

          <p className="text-4xl font-semibold">{soundtracks.length}</p>

          <p className="mt-3 text-sm text-neutral-400">
            Libreria audio disponibile da admin.
          </p>
        </article>

        <article className="rounded-3xl border border-green-900/50 bg-green-950/20 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-green-300">
            Attive
          </p>

          <p className="text-4xl font-semibold">{activeCount}</p>

          <p className="mt-3 text-sm text-neutral-400">
            Visibili nel dropdown galleria.
          </p>
        </article>

        <article className="rounded-3xl border border-amber-900/60 bg-amber-950/20 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-amber-300">
            In uso
          </p>

          <p className="text-4xl font-semibold">{usedCount}</p>

          <p className="mt-3 text-sm text-neutral-400">
            Soundtrack collegate ad almeno una galleria.
          </p>
        </article>
      </div>

      <div className="mt-6">
        <AdminCreateSoundtrackForm />
      </div>

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Libreria audio
          </p>

          <h2 className="text-2xl font-medium">Soundtrack gallerie</h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
            Carica loop ambientali leggeri. Le gallerie potranno scegliere una
            soundtrack oppure restare senza musica.
          </p>
        </div>

        {soundtracks.length === 0 && (
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <p className="text-neutral-300">
              Nessuna soundtrack presente. Carica il primo loop audio dal form
              sopra.
            </p>
          </div>
        )}

        {soundtracks.length > 0 && (
          <div className="mt-6 space-y-4">
            {soundtracks.map((soundtrack) => {
              const usageCount = galleries.filter(
                (gallery) => gallery.soundtrack_id === soundtrack.id
              ).length;

              return (
                <article
                  key={soundtrack.id}
                  className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            soundtrack.is_active
                              ? "rounded-full border border-green-900 bg-green-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-green-300"
                              : "rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-400"
                          }
                        >
                          {soundtrack.is_active ? "Attiva" : "Disattivata"}
                        </span>

                        {soundtrack.mood && (
                          <span className="rounded-full border border-amber-900/50 bg-amber-950/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-amber-300">
                            {soundtrack.mood}
                          </span>
                        )}

                        <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-400">
                          {formatDuration(soundtrack.loop_duration_seconds)}
                        </span>
                      </div>

                      <h3 className="mt-4 text-2xl font-medium">
                        {soundtrack.title}
                      </h3>

                      <p className="mt-2 break-all text-xs text-neutral-600">
                        {soundtrack.id}
                      </p>

                      <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-neutral-600">
                          Preview audio
                        </p>

                        <audio controls preload="none" className="w-full">
                          <source src={soundtrack.audio_url} />
                          Il browser non supporta il player audio.
                        </audio>

                        <p className="mt-3 break-all text-xs leading-5 text-neutral-500">
                          {soundtrack.audio_url}
                        </p>
                      </div>

                      <dl className="mt-5 grid gap-3 text-sm md:grid-cols-3">
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Ordine
                          </dt>
                          <dd className="mt-2 text-xl font-semibold text-neutral-100">
                            {soundtrack.sort_order}
                          </dd>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Usata da
                          </dt>
                          <dd className="mt-2 text-xl font-semibold text-neutral-100">
                            {usageCount}
                          </dd>
                          <p className="mt-1 text-xs text-neutral-500">
                            gallerie
                          </p>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Creata
                          </dt>
                          <dd className="mt-2 text-xs leading-5 text-neutral-300">
                            {formatDate(soundtrack.created_at)}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <AdminSoundtrackControls
                      soundtrackId={soundtrack.id}
                      currentTitle={soundtrack.title}
                      currentMood={soundtrack.mood}
                      currentLoopDurationSeconds={
                        soundtrack.loop_duration_seconds
                      }
                      currentAudioUrl={soundtrack.audio_url}
                      currentStoragePath={soundtrack.storage_path}
                      currentIsActive={soundtrack.is_active}
                      currentSortOrder={soundtrack.sort_order}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
