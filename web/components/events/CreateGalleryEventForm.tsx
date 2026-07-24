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

type EventAccessMode = "public" | "password" | "invite_only" | "private_link";
type LiveAccessMode = "public" | "password" | "invite_only" | "private_link";
type LiveVoiceMode = "owner_only" | "everyone" | "request_to_speak";

type MessageState =
  | {
      type: "success" | "error";
      textKey: string;
      fallback: string;
    }
  | {
      type: "success" | "error";
      raw: string;
    };

function toLocalDateTimeValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 16);
}

function splitInviteEmails(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
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

  const [eventAccessMode, setEventAccessMode] =
    useState<EventAccessMode>("public");
  const [eventPassword, setEventPassword] = useState("");
  const [eventInviteEmails, setEventInviteEmails] = useState("");

  const [enableLiveGuidedVisit, setEnableLiveGuidedVisit] = useState(false);
  const [liveAccessMode, setLiveAccessMode] = useState<LiveAccessMode>("public");
  const [liveVoiceMode, setLiveVoiceMode] =
    useState<LiveVoiceMode>("owner_only");
  const [liveMaxParticipants, setLiveMaxParticipants] = useState("50");
  const [livePassword, setLivePassword] = useState("");

  const [message, setMessage] = useState<MessageState | null>(null);

  const selectedGallery = useMemo(
    () => galleries.find((gallery) => gallery.id === galleryId) || null,
    [galleries, galleryId]
  );

  const canEnableLiveGuidedVisit = Boolean(
    selectedGallery &&
      !selectedGallery.hasActiveEvent &&
      selectedGallery.liveGuidedEligible
  );

  const inviteEmails = useMemo(
    () => splitInviteEmails(eventInviteEmails),
    [eventInviteEmails]
  );

  useEffect(() => {
    if (!canEnableLiveGuidedVisit) {
      setEnableLiveGuidedVisit(false);
    }
  }, [canEnableLiveGuidedVisit]);

  useEffect(() => {
    if (eventAccessMode === "password") {
      setLiveAccessMode("password");
    }

    if (eventAccessMode === "invite_only") {
      setLiveAccessMode("invite_only");
    }

    if (eventAccessMode === "private_link") {
      setLiveAccessMode("private_link");
    }
  }, [eventAccessMode]);

  function setLocalError(textKey: string, fallback: string) {
    setMessage({ type: "error", textKey, fallback });
  }

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!galleryId) {
      setLocalError(
        "dashboard.events.create.errors.selectGallery",
        "Seleziona una galleria."
      );
      return;
    }

    if (!title.trim()) {
      setLocalError(
        "dashboard.events.create.errors.titleRequired",
        "Inserisci un titolo evento."
      );
      return;
    }

    if (eventAccessMode === "password" && eventPassword.trim().length < 4) {
      setLocalError(
        "dashboard.events.create.errors.eventPasswordRequired",
        "Inserisci una password evento di almeno 4 caratteri."
      );
      return;
    }

    if (eventAccessMode === "invite_only" && inviteEmails.length === 0) {
      setLocalError(
        "dashboard.events.create.errors.invitesRequired",
        "Inserisci almeno una email invitata per un evento solo su invito."
      );
      return;
    }

    if (enableLiveGuidedVisit && !canEnableLiveGuidedVisit) {
      setLocalError(
        "dashboard.events.create.errors.liveInstitutionOnly",
        "Le Live guided visits sono disponibili solo per gallerie con piano Institution."
      );
      return;
    }

    if (
      enableLiveGuidedVisit &&
      liveAccessMode === "password" &&
      livePassword.trim().length < 4 &&
      eventAccessMode !== "password"
    ) {
      setLocalError(
        "dashboard.events.create.errors.livePasswordRequired",
        "Inserisci una password di almeno 4 caratteri per la Live guided visit."
      );
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
          eventAccess: {
            accessMode: eventAccessMode,
            password: eventAccessMode === "password" ? eventPassword : "",
            inviteEmails,
          },
          liveGuidedVisit: enableLiveGuidedVisit
            ? {
                enabled: true,
                accessMode: liveAccessMode,
                voiceMode: liveVoiceMode,
                maxParticipants: liveMaxParticipants,
                password:
                  liveAccessMode === "password"
                    ? livePassword || eventPassword
                    : "",
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
      setEventAccessMode("public");
      setEventPassword("");
      setEventInviteEmails("");
      setEnableLiveGuidedVisit(false);
      setLiveAccessMode("public");
      setLiveVoiceMode("owner_only");
      setLiveMaxParticipants("50");
      setLivePassword("");
      setMessage({
        type: "success",
        textKey: result?.privateEventUrl
          ? "dashboard.events.create.success.privateLink"
          : result?.liveGuidedVisit
            ? "dashboard.events.create.success.liveCreated"
            : "dashboard.events.create.success.created",
        fallback: result?.privateEventUrl
          ? "Evento creato. Copia il link privato dalla scheda evento."
          : result?.liveGuidedVisit
            ? "Evento creato con Live guided visit. È pronto per la voice room."
            : "Evento creato. È visibile nel calendario pubblico e nei calendari dei follower.",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage({
        type: "error",
        raw:
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
          {"raw" in message ? (
            message.raw
          ) : (
            <T textKey={message.textKey} fallback={message.fallback} />
          )}
        </div>
      )}

      <form onSubmit={createEvent} className="mt-6 grid gap-5">
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
              Seleziona galleria
            </option>
            {galleries.map((gallery) => (
              <option
                key={gallery.id}
                value={gallery.id}
                disabled={gallery.hasActiveEvent}
              >
                {gallery.title} · {gallery.status}
                {gallery.hasActiveEvent ? " · evento attivo già presente" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            <T textKey="dashboard.events.create.fields.title" fallback="Titolo evento" />
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
              <T textKey="dashboard.events.create.fields.dateTime" fallback="Data e orario" />
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
            {description.length}/600{" "}
            <T textKey="dashboard.events.create.fields.characters" fallback="caratteri" />
          </span>
        </label>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-500">
            <T
              textKey="dashboard.events.create.access.label"
              fallback="Accesso evento"
            />
          </p>
          <h3 className="mt-2 text-xl font-medium text-neutral-50">
            <T
              textKey="dashboard.events.create.access.title"
              fallback="Decidi chi può vedere e ricevere questo evento"
            />
          </h3>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {([
              ["public", "Pubblico", "Visibile nel calendario pubblico e nei calendari dei follower."],
              ["password", "Con password", "Visibile nel calendario pubblico, ma l’accesso live richiederà password."],
              ["invite_only", "Solo invito", "Visibile solo agli invitati e al proprietario."],
              ["private_link", "Link privato", "Non listato: entra solo chi riceve il link privato."],
            ] as Array<[EventAccessMode, string, string]>).map(([mode, label, descriptionText]) => (
              <label
                key={mode}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  eventAccessMode === mode
                    ? "border-amber-700 bg-amber-950/20"
                    : "border-neutral-800 bg-neutral-900 hover:border-neutral-600"
                }`}
              >
                <input
                  type="radio"
                  name="event-access-mode"
                  value={mode}
                  checked={eventAccessMode === mode}
                  onChange={() => setEventAccessMode(mode)}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-neutral-100">
                  {label}
                </span>
                <span className="mt-2 block text-xs leading-5 text-neutral-500">
                  {descriptionText}
                </span>
              </label>
            ))}
          </div>

          {eventAccessMode === "password" && (
            <label className="mt-4 grid gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                <T
                  textKey="dashboard.events.create.access.password"
                  fallback="Password evento"
                />
              </span>
              <input
                type="password"
                value={eventPassword}
                onChange={(event) => setEventPassword(event.target.value)}
                minLength={4}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-600"
              />
            </label>
          )}

          {eventAccessMode === "invite_only" && (
            <label className="mt-4 grid gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                <T
                  textKey="dashboard.events.create.access.invitedEmails"
                  fallback="Email invitate"
                />
              </span>
              <textarea
                value={eventInviteEmails}
                onChange={(event) => setEventInviteEmails(event.target.value)}
                rows={4}
                placeholder="mario@email.com, lucia@email.com"
                className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm leading-7 text-neutral-100 outline-none transition focus:border-amber-600"
              />
              <span className="text-xs text-neutral-600">
                {inviteEmails.length} <T textKey="dashboard.events.create.access.invitesParsed" fallback="inviti rilevati" />
              </span>
            </label>
          )}
        </section>

        <section className="rounded-3xl border border-sky-900/60 bg-sky-950/15 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
                <T
                  textKey="dashboard.events.create.live.label"
                  fallback="Live guided visits"
                />
              </p>
              <h3 className="mt-2 text-xl font-medium text-neutral-50">
                <T
                  textKey="dashboard.events.create.live.title"
                  fallback="Aggiungi voice room curatoriale"
                />
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100/70">
                <T
                  textKey="dashboard.events.create.live.description"
                  fallback="Feature premium Institution: trasforma l’evento in una visita guidata live con audio room e moderazione."
                />
              </p>
              {selectedGallery && !selectedGallery.liveGuidedEligible && (
                <p className="mt-3 text-xs text-yellow-200">
                  <T
                    textKey="dashboard.events.create.live.institutionOnly"
                    fallback="Questa galleria non è Institution: puoi creare l’evento, ma non la Live guided visit."
                  />
                </p>
              )}
            </div>

            <label className="flex items-center gap-3 rounded-full border border-sky-800 bg-sky-950/30 px-4 py-2 text-sm text-sky-100">
              <input
                type="checkbox"
                checked={enableLiveGuidedVisit}
                disabled={!canEnableLiveGuidedVisit}
                onChange={(event) => setEnableLiveGuidedVisit(event.target.checked)}
              />
              <T
                textKey="dashboard.events.create.live.enable"
                fallback="Abilita"
              />
            </label>
          </div>

          {enableLiveGuidedVisit && (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-sky-200/80">
                    <T
                      textKey="dashboard.events.create.live.accessMode"
                      fallback="Accesso voice room"
                    />
                  </span>
                  <select
                    value={liveAccessMode}
                    onChange={(event) =>
                      setLiveAccessMode(event.target.value as LiveAccessMode)
                    }
                    className="rounded-2xl border border-sky-900 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-sky-500"
                  >
                    <option value="public">Pubblico</option>
                    <option value="password">Password</option>
                    <option value="invite_only">Solo invito</option>
                    <option value="private_link">Link privato</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-sky-200/80">
                    <T
                      textKey="dashboard.events.create.live.voiceMode"
                      fallback="Permessi microfono"
                    />
                  </span>
                  <select
                    value={liveVoiceMode}
                    onChange={(event) =>
                      setLiveVoiceMode(event.target.value as LiveVoiceMode)
                    }
                    className="rounded-2xl border border-sky-900 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-sky-500"
                  >
                    <option value="owner_only">Owner/moderatori parlano</option>
                    <option value="everyone">Tutti parlano</option>
                    <option value="request_to_speak">Richiesta parola</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-sky-200/80">
                    <T
                      textKey="dashboard.events.create.live.maxParticipants"
                      fallback="Max partecipanti"
                    />
                  </span>
                  <input
                    type="number"
                    min={2}
                    max={1000}
                    value={liveMaxParticipants}
                    onChange={(event) => setLiveMaxParticipants(event.target.value)}
                    className="rounded-2xl border border-sky-900 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-sky-500"
                  />
                </label>
              </div>

              {liveAccessMode === "password" && eventAccessMode !== "password" && (
                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-sky-200/80">
                    <T
                      textKey="dashboard.events.create.live.password"
                      fallback="Password Live guided visit"
                    />
                  </span>
                  <input
                    type="password"
                    value={livePassword}
                    onChange={(event) => setLivePassword(event.target.value)}
                    minLength={4}
                    className="rounded-2xl border border-sky-900 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-sky-500"
                  />
                </label>
              )}
            </div>
          )}
        </section>

        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <T textKey="dashboard.events.create.actions.creating" fallback="Creo evento..." />
          ) : (
            <T textKey="dashboard.events.create.actions.create" fallback="Crea evento" />
          )}
        </button>
      </form>
    </section>
  );
}
