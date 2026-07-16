"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import T from "@/components/i18n/T";

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

export default function GalleryLivePanel({
  galleryId,
  roomId = "main",
}: GalleryLivePanelProps) {
  const [identity, setIdentity] = useState<VisitorIdentity | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [galleryCount, setGalleryCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [activeVisitors, setActiveVisitors] = useState<PresenceVisitor[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (!isOpen) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [isOpen, messages]);

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

  const roomLabel = roomId === "main" ? "Galleria" : roomId;
  const unreadBadgeLabel = roomCount > 99 ? "99+" : String(roomCount);

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
          aria-label="Apri chat della galleria"
          className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(197,151,94,0.45)] bg-[rgba(8,7,5,0.58)] text-[var(--museum-ivory)] shadow-2xl shadow-black/35 backdrop-blur-md transition hover:border-[var(--museum-bronze)] hover:bg-[rgba(8,7,5,0.78)] md:h-16 md:w-16"
        >
          <ChatIcon />

          <span className="absolute -right-1 -top-1 min-w-6 rounded-full border border-black/40 bg-[var(--museum-bronze)] px-1.5 py-0.5 text-center text-[0.65rem] font-semibold leading-5 text-black shadow-lg">
            {unreadBadgeLabel}
          </span>

          <span className="pointer-events-none absolute right-[calc(100%+0.75rem)] hidden whitespace-nowrap rounded-full border border-[rgba(197,151,94,0.35)] bg-[rgba(8,7,5,0.72)] px-3 py-2 text-xs text-[var(--museum-ivory-soft)] opacity-0 shadow-xl backdrop-blur-md transition group-hover:opacity-100 md:block">
            <T
              textKey="gallery.livePanel.tooltip.chatLive"
              fallback="Chat live"
            />{" "}
            · {galleryCount}{" "}
            <T
              textKey="gallery.livePanel.tooltip.present"
              fallback="presenti"
            />
          </span>

          <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.95)]" />
        </button>
      ) : (
        <section className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[1.6rem] border border-[rgba(197,151,94,0.46)] bg-[rgba(8,7,5,0.78)] text-[var(--museum-ivory)] shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 border-b border-[rgba(197,151,94,0.22)] px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--museum-bronze-light)]">
                <T
                  textKey="gallery.livePanel.header.title"
                  fallback="Chat live"
                />
              </p>
              <p className="mt-1 text-sm text-[var(--museum-ivory-soft)]">
                {roomLabel} · {roomCount}{" "}
                <T
                  textKey="gallery.livePanel.header.inRoom"
                  fallback="in sala"
                />{" "}
                · {galleryCount}{" "}
                <T
                  textKey="gallery.livePanel.header.total"
                  fallback="totali"
                />
              </p>
              <p className="mt-1 text-xs text-[var(--museum-stone-muted)]">
                <T
                  textKey="gallery.livePanel.header.messageRetention"
                  fallback="Messaggi visibili per 24 ore."
                />
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Chiudi chat"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(243,237,226,0.2)] text-lg leading-none text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
            >
              ×
            </button>
          </div>

          <div className="grid gap-3 p-3 md:p-4">
            <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/30 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                  <T
                    textKey="gallery.livePanel.presence.title"
                    fallback="Presenti"
                  />
                </p>
                <span className="rounded-full bg-[rgba(197,151,94,0.16)] px-2 py-0.5 text-[0.68rem] text-[var(--museum-bronze-light)]">
                  {activeVisitors.length}
                </span>
              </div>

              <div className="flex max-h-16 flex-wrap gap-2 overflow-y-auto">
                {activeVisitors.length > 0 ? (
                  activeVisitors.slice(0, 10).map((visitor) => (
                    <span
                      key={visitor.sessionId}
                      className="rounded-full border border-[rgba(243,237,226,0.12)] bg-[rgba(243,237,226,0.05)] px-3 py-1 text-xs text-[var(--museum-ivory-soft)]"
                    >
                      {visitor.visitorName}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--museum-stone-muted)]">
                    <T
                      textKey="gallery.livePanel.presence.loading"
                      fallback="Presenze in caricamento..."
                    />
                  </span>
                )}
              </div>
            </div>

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
                  <T
                    textKey="gallery.livePanel.messages.empty"
                    fallback="Ancora nessun messaggio. Apri tu la conversazione della mostra."
                  />
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
                {isSending ? (
                  "..."
                ) : cooldownSeconds > 0 ? (
                  `${cooldownSeconds}s`
                ) : (
                  <T
                    textKey="gallery.livePanel.actions.send"
                    fallback="Invia"
                  />
                )}
              </button>
            </form>

            {errorMessage && (
              <p className="rounded-2xl border border-red-900 bg-red-950/30 px-3 py-2 text-xs leading-5 text-red-200">
                {errorMessage}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}