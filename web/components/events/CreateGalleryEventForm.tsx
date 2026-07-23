"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import T from "@/components/i18n/T";
import type { PlanName } from "@/lib/plans";

type GalleryOption = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  cover_image_url: string | null;
  hasActiveEvent: boolean;
  ownerPlan: PlanName;
  ownerPlanLabel: string;
  liveGuidedEligible: boolean;
};

type CreateGalleryEventFormProps = {
  galleries: GalleryOption[];
};

type LiveAccessMode = "public" | "password" | "invite_only" | "private_link";
type LiveVoiceMode = "owner_only" | "everyone" | "request_to_speak";

function toLocalDateTimeValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 16);
}

function getAccessModeDescription(mode: LiveAccessMode) {
  if (mode === "password") {
    return "I visitatori potranno entrare nella voice room solo inserendo la password evento.";
  }

  if (mode === "invite_only") {
    return "Opzione preparata per gli eventi chiusi: nella fase inviti aggiungeremo allowlist e inviti nominativi.";
  }

  if (mode === "private_link") {
    return "Opzione preparata per link privati: la room avrà un token dedicato per l’accesso controllato.";
  }

  return "Chi visita la galleria durante l’orario dell’evento potrà entrare nella voice room.";
}

function getVoiceModeDescription(mode: LiveVoiceMode) {
  if (mode === "everyone") {
    return "Tutti i partecipanti potranno attivare il microfono. Consigliato solo per gruppi piccoli.";
  }

  if (mode === "request_to_speak") {
    return "Il pubblico ascolta e potrà chiedere la parola. La coda richieste verrà attivata nelle fasi successive.";
  }

  return "Solo owner e moderatori potranno parlare. È la modalità migliore per visite guidate, opening e talk curatoriali.";
}

export default function CreateGalleryEventForm({
  galleries,
}: CreateGalleryEventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const firstAvailableGallery = useMemo(
    () => galleries.find((gallery) => !gallery.hasActiveEvent),
    [galleries]
  );

  const defaultStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setMinutes(0, 0, 0);

    return toLocalDateTimeValue(date);
  }, []);

  const [galleryId, setGalleryId] = useState(firstAvailableGallery?.id || "");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [description, setDescription] = useState("");
  const [enableLiveGuidedVisit, setEnableLiveGuidedVisit] = useState(false);
  const [liveAccessMode, setLiveAccessMode] = useState<LiveAccessMode>("public");
  const [liveVoiceMode, setLiveVoiceMode] =
    useState<LiveVoiceMode>("owner_only");
  const [liveMaxParticipants, setLiveMaxParticipants] = useState("50");
  const [livePassword, setLivePassword] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const selectedGallery = useMemo(
    () => galleries.find((gallery) => gallery.id === galleryId) || null,
    [galleries, galleryId]
  );

  const canEnableLiveGuidedVisit = Boolean(
    selectedGallery &&
      !selectedGallery.hasActiveEvent &&
      selectedGallery.liveGuidedEligible
  );

  useEffect(() => {
    if (!canEnableLiveGuidedVisit) {
      setEnableLiveGuidedVisit(false);
    }
  }, [canEnableLiveGuidedVisit]);

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!galleryId) {
      setMessage({
        type: "error",
        text: "Seleziona una galleria.",
      });
      return;
    }

    if (!title.trim()) {
      setMessage({
        type: "error",
        text: "Inserisci un titolo evento.",
      });
      return;
    }

    if (enableLiveGuidedVisit && !canEnableLiveGuidedVisit) {
      setMessage({
        type: "error",
        text: "Le Live guided visits sono disponibili solo per gallerie con piano Institution.",
      });
      return;
    }

    if (
      enableLiveGuidedVisit &&
      liveAccessMode === "password" &&
      livePassword.trim().length < 4
    ) {
      setMessage({
        type: "error",
        text: "Inserisci una password di almeno 4 caratteri per la Live guided visit.",
      });
      return;
    }

    try {
      const response = await fetch("/api/dashboard/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          galleryId,
          title,
          description,
          startsAt,
          durationMinutes,
          timezone: "Europe/Rome",
          liveGuidedVisit: enableLiveGuidedVisit
            ? {
                enabled: true,
                accessMode: liveAccessMode,
                voiceMode: liveVoiceMode,
                maxParticipants: liveMaxParticipants,
                password: liveAccessMode === "password" ? livePassword : "",
              }
            : {
                enabled: false,
              },
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Non riesco a creare l'evento.");
      }

      setTitle("");
      setDescription("");
      setDurationMinutes("60");
      setGalleryId("");
      setEnableLiveGuidedVisit(false);
      setLiveAccessMode("public");
      setLiveVoiceMode("owner_only");
      setLiveMaxParticipants("50");
      setLivePassword("");
      setMessage({
        type: "success",
        text: result?.liveGuidedVisit
          ? "Evento creato con Live guided visit. È visibile nel calendario pubblico e sarà pronto per la voice room."
          : "Evento creato. È visibile nel calendario pubblico e nei calendari dei follower.",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Non riesco a creare l'evento.",
      });
    }
  }

  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-amber-500">
        <T textKey="dashboard.events.create.label" fallback="Nuovo evento" />
      </p>

      <h2 className="font-serif text-3xl text-neutral-50">
        <T
          textKey="dashboard.events.create.title"
          fallback="Crea evento collegato a una galleria"
        />
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
        <T
          textKey="dashboard.events.create.description"
          fallback="Puoi collegare anche una galleria in bozza. L'immagine evento sarà la cover della galleria. Ogni galleria può avere massimo un evento attivo."
        />
      </p>

      {message && (
        <div
          className={
            message.type === "success"
              ? "mt-5 rounded-2xl border border-emerald-900 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-200"
              : "mt-5 rounded-2xl border border-red-900 bg-red-950/35 px-4 py-3 text-sm text-red-200"
          }
        >
          {message.text}
        </div>
      )}

      <form onSubmit={createEvent} className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            <T textKey="dashboard.events.create.fields.gallery" fallback="Galleria" />
          </span>
          <select
            value={galleryId}
            onChange={(event) => setGalleryId(event.target.value)}
            className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-600"
          >
            <option value="">
              <T
                textKey="dashboard.events.create.fields.selectGallery"
                fallback="Seleziona galleria"
              />
            </option>
            {galleries.map((gallery) => (
              <option
                key={gallery.id}
                value={gallery.id}
                disabled={gallery.hasActiveEvent}
              >
                {gallery.title} · {gallery.status} · piano {gallery.ownerPlanLabel}
                {gallery.hasActiveEvent ? " · evento attivo già presente" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            <T
              textKey="dashboard.events.create.fields.title"
              fallback="Titolo evento"
            />
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="Es. Vernissage digitale, visita guidata, opening online..."
            className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-600"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              <T
                textKey="dashboard.events.create.fields.dateTime"
                fallback="Data e orario"
              />
            </span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-600"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              <T textKey="dashboard.events.create.fields.duration" fallback="Durata" />
            </span>
            <select
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-600"
            >
              <option value="30">30 min</option>
              <option value="60">1 ora</option>
              <option value="90">1 ora e 30</option>
              <option value="120">2 ore</option>
            </select>
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            <T
              textKey="dashboard.events.create.fields.shortDescription"
              fallback="Descrizione breve"
            />
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={600}
            rows={4}
            placeholder="Due righe per raccontare cosa succede durante l'evento."
            className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm leading-7 text-neutral-100 outline-none transition focus:border-amber-600"
          />
          <span className="text-xs text-neutral-600">
            {description.length}/600 caratteri
          </span>
        </label>

        <section className="rounded-[1.75rem] border border-sky-900/60 bg-sky-950/20 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-sky-300/80">
                Live guided visits
              </p>
              <h3 className="mt-2 font-serif text-2xl text-neutral-50">
                Attiva visita guidata live audio
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100/70">
                Feature Institution-only. Crea una voice room collegata a questo evento: pubblica, con password, su invito o link privato.
              </p>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-sky-900/70 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-100">
              <input
                type="checkbox"
                checked={enableLiveGuidedVisit}
                disabled={!canEnableLiveGuidedVisit}
                onChange={(event) => setEnableLiveGuidedVisit(event.target.checked)}
              />
              Abilita
            </label>
          </div>

          {!selectedGallery && (
            <p className="mt-4 text-xs text-sky-100/60">
              Seleziona una galleria per verificare se può usare Live guided visits.
            </p>
          )}

          {selectedGallery && !selectedGallery.liveGuidedEligible && (
            <p className="mt-4 rounded-2xl border border-amber-900/70 bg-amber-950/25 px-4 py-3 text-xs leading-5 text-amber-100/80">
              Questa galleria appartiene al piano {selectedGallery.ownerPlanLabel}. Per ora le Live guided visits sono disponibili solo per Institution.
            </p>
          )}

          {selectedGallery?.hasActiveEvent && (
            <p className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-xs leading-5 text-neutral-400">
              Questa galleria ha già un evento attivo. Termina o elimina l’evento esistente prima di crearne uno nuovo.
            </p>
          )}

          {enableLiveGuidedVisit && canEnableLiveGuidedVisit && (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-sky-300/70">
                    Accesso room
                  </span>
                  <select
                    value={liveAccessMode}
                    onChange={(event) =>
                      setLiveAccessMode(event.target.value as LiveAccessMode)
                    }
                    className="rounded-2xl border border-sky-900/70 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-sky-500"
                  >
                    <option value="public">Pubblico</option>
                    <option value="password">Password</option>
                    <option value="invite_only">Solo invito</option>
                    <option value="private_link">Link privato</option>
                  </select>
                  <span className="text-xs leading-5 text-sky-100/55">
                    {getAccessModeDescription(liveAccessMode)}
                  </span>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-sky-300/70">
                    Permessi microfono
                  </span>
                  <select
                    value={liveVoiceMode}
                    onChange={(event) =>
                      setLiveVoiceMode(event.target.value as LiveVoiceMode)
                    }
                    className="rounded-2xl border border-sky-900/70 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-sky-500"
                  >
                    <option value="owner_only">Solo owner/moderatori parlano</option>
                    <option value="everyone">Tutti possono parlare</option>
                    <option value="request_to_speak">Richiesta parola</option>
                  </select>
                  <span className="text-xs leading-5 text-sky-100/55">
                    {getVoiceModeDescription(liveVoiceMode)}
                  </span>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-sky-300/70">
                    Max partecipanti
                  </span>
                  <input
                    type="number"
                    min={2}
                    max={1000}
                    value={liveMaxParticipants}
                    onChange={(event) => setLiveMaxParticipants(event.target.value)}
                    className="rounded-2xl border border-sky-900/70 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-sky-500"
                  />
                </label>

                {liveAccessMode === "password" && (
                  <label className="grid gap-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-sky-300/70">
                      Password evento
                    </span>
                    <input
                      type="password"
                      value={livePassword}
                      onChange={(event) => setLivePassword(event.target.value)}
                      placeholder="Es. vienna1900"
                      className="rounded-2xl border border-sky-900/70 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-sky-500"
                    />
                    <span className="text-xs leading-5 text-sky-100/55">
                      La password verrà salvata come hash, non in chiaro.
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}
        </section>

        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <T
              textKey="dashboard.events.create.actions.creating"
              fallback="Creo evento..."
            />
          ) : (
            <T
              textKey="dashboard.events.create.actions.create"
              fallback="Crea evento"
            />
          )}
        </button>
      </form>
    </section>
  );
}
