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

export default function GalleryLivePanel({
  galleryId,
  roomId = "main",
}: GalleryLivePanelProps) {
  const [identity, setIdentity] = useState<VisitorIdentity | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [galleryCount, setGalleryCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [activeVisitors, setActiveVisitors] = useState<PresenceVisitor[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
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

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!identity || isSending) {
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
          visitorName: identity.visitorName,
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
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Messaggio non inviato."
      );
    } finally {
      setIsSending(false);
    }
  }

  const roomLabel = roomId === "main" ? "Galleria" : roomId;

  return (
    <div
      className="pointer-events-auto absolute right-4 top-4 z-[140] w-[min(23rem,calc(100%-2rem))] text-left"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="ml-auto flex max-w-full items-center gap-3 rounded-2xl border border-[rgba(197,151,94,0.5)] bg-[rgba(8,7,5,0.82)] px-4 py-3 text-left text-sm text-[var(--museum-ivory)] shadow-2xl backdrop-blur-md transition hover:border-[var(--museum-bronze)]"
        >
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.95)]" />
          <span>
            <span className="block text-xs uppercase tracking-[0.18em] text-[var(--museum-bronze-light)]">
              Live
            </span>
            <span className="block text-sm text-[var(--museum-ivory-soft)]">
              {roomCount} in sala · {galleryCount} nella galleria
            </span>
          </span>
        </button>
      ) : (
        <section className="overflow-hidden rounded-[1.5rem] border border-[rgba(197,151,94,0.48)] bg-[rgba(8,7,5,0.9)] text-[var(--museum-ivory)] shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 border-b border-[rgba(197,151,94,0.22)] px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--museum-bronze-light)]">
                Live nella galleria
              </p>
              <p className="mt-1 text-sm text-[var(--museum-ivory-soft)]">
                {roomLabel} · {roomCount} presenti
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-[rgba(243,237,226,0.22)] px-3 py-1 text-xs text-[var(--museum-stone)] transition hover:text-[var(--museum-ivory)]"
            >
              Chiudi
            </button>
          </div>

          <div className="grid gap-3 p-4">
            <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/35 p-3">
              <p className="mb-2 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                Presenze
              </p>
              <div className="flex flex-wrap gap-2">
                {activeVisitors.length > 0 ? (
                  activeVisitors.slice(0, 8).map((visitor) => (
                    <span
                      key={visitor.sessionId}
                      className="rounded-full border border-[rgba(243,237,226,0.12)] bg-[rgba(243,237,226,0.05)] px-3 py-1 text-xs text-[var(--museum-ivory-soft)]"
                    >
                      {visitor.visitorName}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--museum-stone-muted)]">
                    Presenze in caricamento...
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-64 space-y-3 overflow-y-auto rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/35 p-3">
              {messages.length > 0 ? (
                messages.map((item) => {
                  const isMine = identity?.sessionId === item.sessionId;

                  return (
                    <div
                      key={item.id}
                      className={
                        isMine
                          ? "rounded-2xl bg-[rgba(197,151,94,0.16)] p-3"
                          : "rounded-2xl bg-[rgba(243,237,226,0.05)] p-3"
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
                  Ancora nessun messaggio. Apri tu la conversazione della
                  mostra.
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
                    ? `Scrivi come ${identity.visitorName}`
                    : "Scrivi un messaggio"
                }
                className="min-w-0 flex-1 rounded-2xl border border-[rgba(243,237,226,0.14)] bg-black/55 px-4 py-3 text-sm text-[var(--museum-ivory)] outline-none transition placeholder:text-[var(--museum-stone-muted)] focus:border-[var(--museum-bronze)]"
              />

              <button
                type="submit"
                disabled={isSending || !messageDraft.trim()}
                className="rounded-2xl bg-[var(--museum-bronze)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? "..." : "Invia"}
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
