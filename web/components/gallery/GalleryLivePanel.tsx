"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

type GalleryLivePanelProps = {
  galleryId: string;
  roomId?: string;
};

type VisitorIdentity = {
  sessionId: string;
  visitorName: string;
};

type PresenceVisitor = {
  sessionId: string;
  visitorName: string;
  roomId: string;
  lastSeenAt: string;
};

type ChatMessage = {
  id: string;
  galleryId: string;
  roomId: string;
  sessionId: string;
  userId: string | null;
  visitorName: string;
  message: string;
  createdAt: string;
};

type PanelTab = "chat" | "voice" | "people" | "events";

type LiveAccessMode = "public" | "password" | "invite_only" | "private_link";
type LiveVoiceMode = "owner_only" | "everyone" | "request_to_speak";

type LiveGuidedVisitPreview = {
  id: string;
  galleryId: string;
  galleryEventId: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  accessMode: LiveAccessMode;
  voiceMode: LiveVoiceMode;
  maxParticipants: number | null;
  roomName: string | null;
  calendarStatus: "scheduled" | "live" | "completed" | "cancelled" | null;
  isActive: boolean;
  isLiveNow: boolean;
  isJoinWindowOpen: boolean;
  joinOpensAt: string;
  joinClosesAt: string;
};

type LiveGuidedVisitsStatus = {
  enabledForGallery: boolean;
  institutionOnly: boolean;
  ownerPlan: string;
  ownerPlanRequired: string;
  isInstitutionGallery: boolean;
  serverNow: string;
  currentEvent: LiveGuidedVisitPreview | null;
  upcomingEvent: LiveGuidedVisitPreview | null;
  events: LiveGuidedVisitPreview[];
};

type VoiceTokenResult = {
  success?: boolean;
  token?: string;
  wsUrl?: string;
  url?: string;
  roomName?: string;
  identity?: string;
  role?: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  error?: string;
};

const identityStorageKey = "mostraspace_live_identity";

function createFallbackSessionId() {
  return `ms_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function createGuestName() {
  return `Ospite ${Math.floor(100 + Math.random() * 900)}`;
}

function getOrCreateIdentity(): VisitorIdentity {
  try {
    const stored = window.localStorage.getItem(identityStorageKey);

    if (stored) {
      const parsed = JSON.parse(stored) as Partial<VisitorIdentity>;

      if (parsed.sessionId && parsed.visitorName) {
        return {
          sessionId: parsed.sessionId,
          visitorName: parsed.visitorName,
        };
      }
    }
  } catch {
    // Se localStorage non è disponibile, creiamo una sessione temporanea.
  }

  const identity = {
    sessionId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : createFallbackSessionId(),
    visitorName: createGuestName(),
  };

  try {
    window.localStorage.setItem(identityStorageKey, JSON.stringify(identity));
  } catch {
    // Ignora: la chat funziona comunque nella sessione corrente.
  }

  return identity;
}

function formatMessageTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatEventDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function getAccessModeLabel(mode: LiveAccessMode) {
  if (mode === "password") {
    return "Password";
  }

  if (mode === "invite_only") {
    return "Solo invito";
  }

  if (mode === "private_link") {
    return "Link privato";
  }

  return "Pubblico";
}

function getVoiceModeLabel(mode: LiveVoiceMode) {
  if (mode === "everyone") {
    return "Tutti possono parlare";
  }

  if (mode === "request_to_speak") {
    return "Richiesta parola";
  }

  return "Solo owner/moderatori";
}

function getEventStatusLabel(event: LiveGuidedVisitPreview) {
  if (event.isJoinWindowOpen) {
    return event.isLiveNow ? "Live ora" : "Apertura in corso";
  }

  const now = Date.now();
  const startsAt = new Date(event.startsAt).getTime();

  if (startsAt > now) {
    return "Programmata";
  }

  return "Chiusa";
}

function getPrivateTokenFromUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);

  return (
    params.get("liveToken") ||
    params.get("live_token") ||
    params.get("invite") ||
    params.get("token") ||
    ""
  ).trim();
}

function ChatIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
    >
      <path
        d="M7.5 9.25h9M7.5 12.25h6M10.25 18.25 6.5 21v-3.25H6A3.75 3.75 0 0 1 2.25 14V7A3.75 3.75 0 0 1 6 3.25h12A3.75 3.75 0 0 1 21.75 7v7A3.75 3.75 0 0 1 18 17.75h-7.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VoiceIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M12 14.25a3.25 3.25 0 0 0 3.25-3.25V6.5a3.25 3.25 0 0 0-6.5 0V11A3.25 3.25 0 0 0 12 14.25Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6.75 10.5v.5A5.25 5.25 0 0 0 12 16.25 5.25 5.25 0 0 0 17.25 11v-.5M12 16.25v3M9.5 19.25h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function GalleryLivePanel({
  galleryId,
  roomId = "main",
}: GalleryLivePanelProps) {
  const [identity, setIdentity] = useState<VisitorIdentity | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("chat");
  const [galleryCount, setGalleryCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [activeVisitors, setActiveVisitors] = useState<PresenceVisitor[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveGuidedVisitsStatus | null>(
    null
  );
  const [liveErrorMessage, setLiveErrorMessage] = useState<string | null>(null);
  const [voicePassword, setVoicePassword] = useState("");
  const [voiceJoinState, setVoiceJoinState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [voiceAccess, setVoiceAccess] = useState<VoiceTokenResult | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIdentity(getOrCreateIdentity());
  }, []);

  const refreshPresence = useCallback(async () => {
    if (!identity) {
      return;
    }

    try {
      const response = await fetch("/api/gallery-presence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          galleryId,
          roomId,
          sessionId: identity.sessionId,
          visitorName: identity.visitorName,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Presenza non disponibile.");
      }

      setGalleryCount(result?.presence?.galleryCount || 0);
      setRoomCount(result?.presence?.roomCount || 0);
      setActiveVisitors(result?.presence?.activeVisitors || []);

      if (typeof result?.presence?.viewerName === "string") {
        setDisplayName(result.presence.viewerName);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Presenza non disponibile."
      );
    }
  }, [galleryId, identity, roomId]);

  const loadMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        galleryId,
        roomId,
      });

      const response = await fetch(`/api/gallery-chat?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Chat non disponibile.");
      }

      setMessages(result?.messages || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Chat non disponibile."
      );
    }
  }, [galleryId, roomId]);

  const loadLiveGuidedVisits = useCallback(async () => {
    try {
      const params = new URLSearchParams({ galleryId });
      const response = await fetch(
        `/api/live-guided-visits/status?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "Live guided visits non disponibili."
        );
      }

      setLiveStatus(result?.liveGuidedVisits || null);
      setLiveErrorMessage(null);
    } catch (error) {
      setLiveStatus(null);
      setLiveErrorMessage(
        error instanceof Error
          ? error.message
          : "Live guided visits non disponibili."
      );
    }
  }, [galleryId]);

  useEffect(() => {
    if (!identity) {
      return;
    }

    refreshPresence();
    loadMessages();

    const presenceInterval = window.setInterval(refreshPresence, 15_000);
    const messagesInterval = window.setInterval(loadMessages, 5_000);

    return () => {
      window.clearInterval(presenceInterval);
      window.clearInterval(messagesInterval);
    };
  }, [identity, loadMessages, refreshPresence]);

  useEffect(() => {
    loadLiveGuidedVisits();

    const liveInterval = window.setInterval(loadLiveGuidedVisits, 30_000);

    return () => {
      window.clearInterval(liveInterval);
    };
  }, [loadLiveGuidedVisits]);

  useEffect(() => {
    if (!isOpen || activeTab !== "chat") {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeTab, isOpen, messages]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [cooldownSeconds]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!identity || isSending || cooldownSeconds > 0) {
      return;
    }

    const message = messageDraft.trim();

    if (!message) {
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/gallery-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          galleryId,
          roomId,
          sessionId: identity.sessionId,
          visitorName: displayName || identity.visitorName,
          message,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Messaggio non inviato.");
      }

      setMessageDraft("");

      if (result?.message) {
        setMessages((current) => [...current, result.message]);
      } else {
        await loadMessages();
      }

      setCooldownSeconds(3);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Messaggio non inviato."
      );
    } finally {
      setIsSending(false);
    }
  }

  async function prepareVoiceRoom() {
    const activeEvent = liveStatus?.currentEvent || null;

    if (!identity || !activeEvent || voiceJoinState === "loading") {
      return;
    }

    setVoiceJoinState("loading");
    setVoiceAccess(null);
    setLiveErrorMessage(null);

    try {
      const response = await fetch("/api/live-guided-visits/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          liveEventId: activeEvent.id,
          galleryId,
          password: voicePassword.trim() || undefined,
          privateToken: getPrivateTokenFromUrl() || undefined,
          sessionId: identity.sessionId,
          visitorName: displayName || identity.visitorName,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | VoiceTokenResult
        | null;

      if (!response.ok) {
        throw new Error(result?.error || "Accesso alla voice room non valido.");
      }

      setVoiceAccess(result || { success: true });
      setVoiceJoinState("ready");
    } catch (error) {
      setVoiceJoinState("error");
      setVoiceAccess(null);
      setLiveErrorMessage(
        error instanceof Error
          ? error.message
          : "Accesso alla voice room non valido."
      );
    }
  }

  function renderTabButton(tab: PanelTab, label: string, badge?: string) {
    const isActive = activeTab === tab;

    return (
      <button
        type="button"
        onClick={() => setActiveTab(tab)}
        className={
          isActive
            ? "rounded-full bg-[var(--museum-bronze)] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-black"
            : "rounded-full border border-[rgba(243,237,226,0.12)] bg-black/25 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
        }
      >
        {label}
        {badge ? <span className="ml-1">{badge}</span> : null}
      </button>
    );
  }

  function renderChatTab() {
    return (
      <div className="grid gap-3">
        <div className="max-h-[min(19rem,42vh)] space-y-3 overflow-y-auto rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-3">
          {messages.length > 0 ? (
            messages.map((item) => {
              const isMine = identity?.sessionId === item.sessionId;

              return (
                <div
                  key={item.id}
                  className={
                    isMine
                      ? "rounded-2xl bg-[rgba(197,151,94,0.17)] p-3"
                      : "rounded-2xl bg-[rgba(243,237,226,0.06)] p-3"
                  }
                >
                  <div className="mb-1 flex items-center justify-between gap-3 text-[0.68rem] uppercase tracking-[0.16em] text-[var(--museum-stone-muted)]">
                    <span>{item.visitorName}</span>
                    <span>{formatMessageTime(item.createdAt)}</span>
                  </div>
                  <p className="break-words text-sm leading-6 text-[var(--museum-ivory-soft)]">
                    {item.message}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-sm leading-6 text-[var(--museum-stone-muted)]">
              Ancora nessun messaggio. Apri tu la conversazione della mostra.
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            value={messageDraft}
            onChange={(event) => setMessageDraft(event.target.value)}
            maxLength={500}
            placeholder={
              identity
                ? `Scrivi come ${displayName || identity.visitorName}`
                : "Scrivi un messaggio"
            }
            className="min-w-0 flex-1 rounded-2xl border border-[rgba(243,237,226,0.14)] bg-black/45 px-4 py-3 text-sm text-[var(--museum-ivory)] outline-none transition placeholder:text-[var(--museum-stone-muted)] focus:border-[var(--museum-bronze)]"
          />

          <button
            type="submit"
            disabled={isSending || cooldownSeconds > 0 || !messageDraft.trim()}
            className="rounded-2xl bg-[var(--museum-bronze)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "..." : cooldownSeconds > 0 ? `${cooldownSeconds}s` : "Invia"}
          </button>
        </form>
      </div>
    );
  }

  function renderPeopleTab() {
    return (
      <div className="grid gap-3">
        <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
              Presenti
            </p>
            <span className="rounded-full bg-[rgba(197,151,94,0.16)] px-2 py-0.5 text-[0.68rem] text-[var(--museum-bronze-light)]">
              {activeVisitors.length}
            </span>
          </div>

          <div className="grid max-h-64 gap-2 overflow-y-auto">
            {activeVisitors.length > 0 ? (
              activeVisitors.map((visitor) => {
                const isMine = identity?.sessionId === visitor.sessionId;

                return (
                  <div
                    key={visitor.sessionId}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(243,237,226,0.12)] bg-[rgba(243,237,226,0.05)] px-3 py-2 text-xs text-[var(--museum-ivory-soft)]"
                  >
                    <span>{visitor.visitorName}</span>
                    <span className="text-[var(--museum-stone-muted)]">
                      {isMine ? "tu" : visitor.roomId === "main" ? "galleria" : visitor.roomId}
                    </span>
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-[var(--museum-stone-muted)]">
                Presenze in caricamento...
              </span>
            )}
          </div>
        </div>

        <p className="rounded-2xl border border-[rgba(197,151,94,0.22)] bg-[rgba(197,151,94,0.08)] px-3 py-2 text-xs leading-5 text-[var(--museum-stone)]">
          In questa fase mostriamo le presenze. Nella fase moderazione owner qui
          arriveranno mute locale, mute globale e gestione speaker.
        </p>
      </div>
    );
  }

  function renderLiveEventCard(event: LiveGuidedVisitPreview) {
    return (
      <article
        key={event.id}
        className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              event.isJoinWindowOpen
                ? "rounded-full border border-emerald-900 bg-emerald-950/35 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-emerald-200"
                : "rounded-full border border-amber-900 bg-amber-950/25 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-amber-200"
            }
          >
            {getEventStatusLabel(event)}
          </span>

          <span className="rounded-full border border-[rgba(243,237,226,0.12)] px-2.5 py-1 text-[0.68rem] text-[var(--museum-stone)]">
            {getAccessModeLabel(event.accessMode)}
          </span>
        </div>

        <h3 className="mt-3 font-editorial text-2xl leading-tight text-[var(--museum-ivory)]">
          {event.title}
        </h3>

        <p className="mt-2 text-xs leading-5 text-[var(--museum-bronze-light)]">
          {formatEventDateTime(event.startsAt)} → {formatEventDateTime(event.endsAt)} · {event.timezone}
        </p>

        {event.description && (
          <p className="mt-3 text-xs leading-5 text-[var(--museum-stone)]">
            {event.description}
          </p>
        )}

        <div className="mt-3 grid gap-2 text-xs text-[var(--museum-stone-muted)] sm:grid-cols-2">
          <div className="rounded-xl border border-[rgba(243,237,226,0.1)] bg-black/25 p-2">
            <span className="block uppercase tracking-[0.16em]">Voce</span>
            <span className="mt-1 block text-[var(--museum-ivory-soft)]">
              {getVoiceModeLabel(event.voiceMode)}
            </span>
          </div>

          <div className="rounded-xl border border-[rgba(243,237,226,0.1)] bg-black/25 p-2">
            <span className="block uppercase tracking-[0.16em]">Capienza</span>
            <span className="mt-1 block text-[var(--museum-ivory-soft)]">
              {event.maxParticipants || "N/D"}
            </span>
          </div>
        </div>
      </article>
    );
  }

  function renderEventsTab() {
    const events = liveStatus?.events || [];

    return (
      <div className="grid gap-3">
        {!liveStatus && !liveErrorMessage && (
          <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-4 text-sm text-[var(--museum-stone-muted)]">
            Caricamento Live guided visits...
          </div>
        )}

        {liveStatus && !liveStatus.isInstitutionGallery && (
          <div className="rounded-2xl border border-[rgba(197,151,94,0.22)] bg-[rgba(197,151,94,0.08)] p-4 text-sm leading-6 text-[var(--museum-stone)]">
            Le Live guided visits sono una feature Institution-only. Questa
            galleria non ha accesso alla voice room live.
          </div>
        )}

        {liveStatus?.isInstitutionGallery && events.length === 0 && (
          <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-4 text-sm leading-6 text-[var(--museum-stone-muted)]">
            Nessuna visita guidata live programmata per questa galleria.
          </div>
        )}

        {events.map((event) => renderLiveEventCard(event))}
      </div>
    );
  }

  function renderVoiceTab() {
    const activeEvent = liveStatus?.currentEvent || null;
    const upcomingEvent = liveStatus?.upcomingEvent || null;
    const eventForDisplay = activeEvent || upcomingEvent;

    return (
      <div className="grid gap-3">
        <div className="rounded-2xl border border-[rgba(197,151,94,0.28)] bg-[rgba(197,151,94,0.08)] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(197,151,94,0.55)] bg-[rgba(197,151,94,0.12)] text-[var(--museum-bronze-light)]">
              <VoiceIcon />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--museum-bronze-light)]">
                Live guided visits
              </p>
              <h3 className="mt-1 font-editorial text-2xl text-[var(--museum-ivory)]">
                Voice room audio
              </h3>
              <p className="mt-2 text-xs leading-5 text-[var(--museum-stone)]">
                Questa fase prepara l’ingresso alla room. La connessione audio
                reale verrà collegata nella prossima fase con LiveKit client.
              </p>
            </div>
          </div>
        </div>

        {!liveStatus && !liveErrorMessage && (
          <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-4 text-sm text-[var(--museum-stone-muted)]">
            Controllo voice room in corso...
          </div>
        )}

        {liveStatus && !liveStatus.isInstitutionGallery && (
          <div className="rounded-2xl border border-yellow-900 bg-yellow-950/25 p-4 text-sm leading-6 text-yellow-100/90">
            Voice room disponibile solo per gallerie Institution.
          </div>
        )}

        {liveStatus?.isInstitutionGallery && !eventForDisplay && (
          <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-4 text-sm leading-6 text-[var(--museum-stone-muted)]">
            Nessuna Live guided visit attiva o programmata.
          </div>
        )}

        {eventForDisplay && renderLiveEventCard(eventForDisplay)}

        {eventForDisplay?.accessMode === "password" && (
          <label className="grid gap-2">
            <span className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
              Password evento
            </span>
            <input
              type="password"
              value={voicePassword}
              onChange={(event) => setVoicePassword(event.target.value)}
              placeholder="Inserisci password"
              className="rounded-2xl border border-[rgba(243,237,226,0.14)] bg-black/45 px-4 py-3 text-sm text-[var(--museum-ivory)] outline-none transition placeholder:text-[var(--museum-stone-muted)] focus:border-[var(--museum-bronze)]"
            />
          </label>
        )}

        {eventForDisplay?.accessMode === "invite_only" && (
          <div className="rounded-2xl border border-[rgba(197,151,94,0.22)] bg-black/32 p-3 text-xs leading-5 text-[var(--museum-stone)]">
            Questo evento è su invito. Il token di accesso verrà gestito nella
            fase inviti/allowlist.
          </div>
        )}

        {eventForDisplay?.accessMode === "private_link" && (
          <div className="rounded-2xl border border-[rgba(197,151,94,0.22)] bg-black/32 p-3 text-xs leading-5 text-[var(--museum-stone)]">
            Questo evento richiede un link privato. Se il link contiene il token,
            il pannello lo passerà automaticamente alla API.
          </div>
        )}

        {activeEvent ? (
          <button
            type="button"
            onClick={prepareVoiceRoom}
            disabled={voiceJoinState === "loading"}
            className="rounded-2xl bg-[var(--museum-bronze)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {voiceJoinState === "loading"
              ? "Preparo accesso..."
              : voiceJoinState === "ready"
                ? "Accesso preparato"
                : "Prepara ingresso voice room"}
          </button>
        ) : eventForDisplay ? (
          <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-3 text-xs leading-5 text-[var(--museum-stone-muted)]">
            L’ingresso sarà disponibile da {formatEventDateTime(eventForDisplay.joinOpensAt)}.
          </div>
        ) : null}

        {voiceJoinState === "ready" && voiceAccess && (
          <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 p-3 text-xs leading-5 text-emerald-100/90">
            Token LiveKit generato correttamente. Ruolo: {voiceAccess.role || "listener"}. Permesso microfono: {voiceAccess.canPublish ? "sì" : "no"}. Nella prossima fase useremo questo token per entrare davvero in audio.
          </div>
        )}
      </div>
    );
  }

  const roomLabel = roomId === "main" ? "Galleria" : roomId;
  const hasLiveNow = Boolean(liveStatus?.currentEvent?.isJoinWindowOpen);
  const hasUpcomingLive = Boolean(liveStatus?.upcomingEvent);
  const unreadBadgeLabel = hasLiveNow ? "LIVE" : roomCount > 99 ? "99+" : String(roomCount);
  const voiceBadge = hasLiveNow ? "•" : hasUpcomingLive ? "+" : undefined;

  return (
    <div
      className="pointer-events-auto absolute bottom-4 right-4 z-[140] text-left md:bottom-5 md:right-5"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Apri Live Panel della galleria"
          className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(197,151,94,0.45)] bg-[rgba(8,7,5,0.58)] text-[var(--museum-ivory)] shadow-2xl shadow-black/35 backdrop-blur-md transition hover:border-[var(--museum-bronze)] hover:bg-[rgba(8,7,5,0.78)] md:h-16 md:w-16"
        >
          <ChatIcon />

          <span
            className={
              hasLiveNow
                ? "absolute -right-2 -top-1 rounded-full border border-black/40 bg-emerald-400 px-2 py-0.5 text-center text-[0.62rem] font-bold leading-5 text-black shadow-lg"
                : "absolute -right-1 -top-1 min-w-6 rounded-full border border-black/40 bg-[var(--museum-bronze)] px-1.5 py-0.5 text-center text-[0.65rem] font-semibold leading-5 text-black shadow-lg"
            }
          >
            {unreadBadgeLabel}
          </span>

          <span className="pointer-events-none absolute right-[calc(100%+0.75rem)] hidden whitespace-nowrap rounded-full border border-[rgba(197,151,94,0.35)] bg-[rgba(8,7,5,0.72)] px-3 py-2 text-xs text-[var(--museum-ivory-soft)] opacity-0 shadow-xl backdrop-blur-md transition group-hover:opacity-100 md:block">
            Live Panel · {galleryCount} presenti
          </span>

          <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.95)]" />
        </button>
      ) : (
        <section className="w-[min(27rem,calc(100vw-2rem))] overflow-hidden rounded-[1.6rem] border border-[rgba(197,151,94,0.46)] bg-[rgba(8,7,5,0.78)] text-[var(--museum-ivory)] shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 border-b border-[rgba(197,151,94,0.22)] px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--museum-bronze-light)]">
                Live Panel
              </p>
              <p className="mt-1 text-sm text-[var(--museum-ivory-soft)]">
                {roomLabel} · {roomCount} in sala · {galleryCount} totali
              </p>
              <p className="mt-1 text-xs text-[var(--museum-stone-muted)]">
                Chat, presenze e Live guided visits.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Chiudi Live Panel"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(243,237,226,0.2)] text-lg leading-none text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
            >
              ×
            </button>
          </div>

          <div className="border-b border-[rgba(197,151,94,0.16)] px-3 py-3">
            <div className="flex flex-wrap gap-2">
              {renderTabButton("chat", "Chat", messages.length > 0 ? String(messages.length) : undefined)}
              {renderTabButton("voice", "Voice", voiceBadge)}
              {renderTabButton("people", "People", String(activeVisitors.length))}
              {renderTabButton("events", "Events", liveStatus?.events?.length ? String(liveStatus.events.length) : undefined)}
            </div>
          </div>

          <div className="grid gap-3 p-3 md:p-4">
            {activeTab === "chat" && renderChatTab()}
            {activeTab === "voice" && renderVoiceTab()}
            {activeTab === "people" && renderPeopleTab()}
            {activeTab === "events" && renderEventsTab()}

            {errorMessage && (
              <p className="rounded-2xl border border-red-900 bg-red-950/30 px-3 py-2 text-xs leading-5 text-red-200">
                {errorMessage}
              </p>
            )}

            {liveErrorMessage && activeTab !== "chat" && (
              <p className="rounded-2xl border border-red-900 bg-red-950/30 px-3 py-2 text-xs leading-5 text-red-200">
                {liveErrorMessage}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
