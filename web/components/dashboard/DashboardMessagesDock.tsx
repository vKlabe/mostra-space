"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import T from "@/components/i18n/T";

type Contact = {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  profileSlug: string | null;
  hasConversation: boolean;
};

type ConversationSummary = {
  id: string;
  peer: {
    profileId: string | null;
    displayName: string;
    deleted: boolean;
    avatarUrl: string | null;
    profileSlug: string | null;
  };
  muted: boolean;
  unreadCount: number;
  lastMessageAt: string;
  lastMessage: {
    id: string;
    body: string | null;
    withdrawnAt: string | null;
    createdAt: string;
    mine: boolean;
    deliveredAt: string | null;
    readAt: string | null;
  } | null;
};

type UnreadAnnouncement = {
  messageId: string;
  conversationId: string;
  body: string | null;
  createdAt: string;
  peerName: string | null;
  muted: boolean;
};

type BootstrapResponse = {
  success?: boolean;
  activationRequired?: boolean;
  unreadCount?: number;
  unreadMessageIds?: string[];
  unreadAnnouncements?: UnreadAnnouncement[];
  conversations?: ConversationSummary[];
  contacts?: Contact[];
  settings?: {
    readReceiptsEnabled: boolean;
    termsVersion: string;
  } | null;
};

type MessageItem = {
  id: string;
  body: string | null;
  mine: boolean;
  deliveredAt: string | null;
  readAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  canWithdraw: boolean;
};

type ConversationDetail = {
  id: string;
  selfMemberId: string;
  peer: {
    profileId: string | null;
    displayName: string;
    deleted: boolean;
    avatarUrl: string | null;
    profileSlug: string | null;
  };
  muted: boolean;
  canSend: boolean;
  blockState: {
    blockedByMe: boolean;
  };
  reasonCode: string | null;
};

type ConversationResponse = {
  success?: boolean;
  conversation?: ConversationDetail;
  messages?: MessageItem[];
};

type DockView = "list" | "contacts" | "conversation" | "settings";

type ToastState =
  | { mode: "message"; item: UnreadAnnouncement }
  | { mode: "summary"; count: number; latest: UnreadAnnouncement | null }
  | null;

type ReportReason =
  | "harassment_threats"
  | "hate_discrimination"
  | "sexual_exploitation"
  | "scam_phishing"
  | "impersonation"
  | "private_data"
  | "spam"
  | "illegal_activity"
  | "other";

const ANNOUNCED_STORAGE_KEY = "mostraspace:direct-messages-announced";
const MAX_MESSAGE_LENGTH = 2000;

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-6 w-6">
      <path d="M7.5 8.5h9M7.5 12h6.5M10 18.5 6.25 21v-3.1A4.25 4.25 0 0 1 2.5 13.7V7A4.5 4.5 0 0 1 7 2.5h10A4.5 4.5 0 0 1 21.5 7v6.5A4.5 4.5 0 0 1 17 18h-7Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-5 w-5">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-5 w-5">
      <path d="m14.5 6.5-5.5 5.5 5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getInitial(value: string | null | undefined) {
  return value?.trim().slice(0, 1).toUpperCase() || "M";
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function loadAnnouncedIds() {
  try {
    const raw = window.sessionStorage.getItem(ANNOUNCED_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function saveAnnouncedIds(ids: Set<string>) {
  try {
    window.sessionStorage.setItem(
      ANNOUNCED_STORAGE_KEY,
      JSON.stringify(Array.from(ids).slice(-300))
    );
  } catch {
    // Session storage is only used to avoid repeating toasts across dashboard navigation.
  }
}

function MessageBody({ body }: { body: string }) {
  const parts = body.split(/(https?:\/\/[^\s]+)/g);

  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-neutral-100">
      {parts.map((part, index) =>
        /^https?:\/\//i.test(part) ? (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="text-amber-300 underline decoration-amber-900 underline-offset-2 hover:text-amber-200"
          >
            {part}
          </a>
        ) : (
          <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>
        )
      )}
    </p>
  );
}


function PeerName({ deleted, name }: { deleted: boolean; name: string }) {
  return deleted ? (
    <T textKey="messages.deletedUser" fallback="Utente eliminato" />
  ) : (
    <>{name}</>
  );
}

function Avatar({ name, url, size = "md" }: { name: string; url: string | null; size?: "sm" | "md" }) {
  const className = size === "sm" ? "h-9 w-9 rounded-2xl" : "h-11 w-11 rounded-2xl";

  return (
    <div className={`flex ${className} shrink-0 items-center justify-center overflow-hidden border border-neutral-800 bg-black`}>
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="font-serif text-sm text-amber-500">{getInitial(name)}</span>
      )}
    </div>
  );
}

export default function DashboardMessagesDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<DockView>("list");
  const [isLoading, setIsLoading] = useState(true);
  const [activationRequired, setActivationRequired] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [search, setSearch] = useState("");
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [feedbackCode, setFeedbackCode] = useState<string | null>(null);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("spam");
  const [reportNote, setReportNote] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [pendingProfileFromUrl, setPendingProfileFromUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return conversations;
    return conversations.filter((item) =>
      item.peer.displayName.toLocaleLowerCase().includes(term)
    );
  }, [conversations, search]);

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return contacts;
    return contacts.filter((item) => item.displayName.toLocaleLowerCase().includes(term));
  }, [contacts, search]);

  function scheduleToastDismiss() {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 7000);
  }

  function announceUnread(payload: BootstrapResponse) {
    const announcements = payload.unreadAnnouncements || [];
    const visible = announcements.filter((item) => !item.muted);
    if (visible.length === 0) return;

    const announced = loadAnnouncedIds();
    const unseen = visible.filter((item) => !announced.has(item.messageId));
    if (unseen.length === 0) return;

    unseen.forEach((item) => announced.add(item.messageId));
    saveAnnouncedIds(announced);

    if (unseen.length === 1) {
      setToast({ mode: "message", item: unseen[0] });
    } else {
      setToast({ mode: "summary", count: unseen.length, latest: unseen[0] || null });
    }
    scheduleToastDismiss();
  }

  async function fetchBootstrap(options?: { announce?: boolean }) {
    try {
      const response = await fetch("/api/messages/bootstrap", { cache: "no-store" });
      const result = (await response.json().catch(() => null)) as BootstrapResponse | null;

      if (!response.ok || !result?.success) {
        setFeedbackCode("LOAD_FAILED");
        return null;
      }

      setActivationRequired(Boolean(result.activationRequired));
      setConversations(result.conversations || []);
      setContacts(result.contacts || []);
      setUnreadCount(Number(result.unreadCount) || 0);
      setReadReceiptsEnabled(result.settings?.readReceiptsEnabled ?? true);
      setIsLoading(false);

      if (options?.announce) announceUnread(result);
      return result;
    } catch {
      setFeedbackCode("LOAD_FAILED");
      setIsLoading(false);
      return null;
    }
  }

  async function loadConversation(conversationId: string, options?: { keepView?: boolean }) {
    const response = await fetch(`/api/messages/conversations/${conversationId}`, {
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as ConversationResponse | null;

    if (!response.ok || !result?.success || !result.conversation) {
      setFeedbackCode("CONVERSATION_LOAD_FAILED");
      return false;
    }

    setActiveConversation(result.conversation);
    activeConversationIdRef.current = result.conversation.id;
    setMessages(result.messages || []);
    setConfirmBlock(false);
    setReportMessageId(null);
    setFeedbackCode(null);
    if (!options?.keepView) setView("conversation");

    await fetch(`/api/messages/conversations/${conversationId}/read`, { method: "PATCH" }).catch(() => null);
    await fetchBootstrap();
    return true;
  }

  async function openOrCreateConversation(profileId: string) {
    setIsWorking(true);
    setFeedbackCode(null);
    try {
      const response = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.conversationId) {
        setFeedbackCode(result?.code || "CONVERSATION_CREATE_FAILED");
        return;
      }

      setIsOpen(true);
      await loadConversation(result.conversationId);

      try {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.has("messageProfile")) {
          currentUrl.searchParams.delete("messageProfile");
          window.history.replaceState({}, "", currentUrl.toString());
        }
      } catch {
        // URL cleanup is cosmetic only.
      }
      setPendingProfileFromUrl(null);
    } finally {
      setIsWorking(false);
    }
  }

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: number | null = null;
    let conversationTimer: number | null = null;
    let cancelled = false;

    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        setIsLoading(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const requestedProfile = params.get("messageProfile");
      if (requestedProfile) {
        setPendingProfileFromUrl(requestedProfile);
        setIsOpen(true);
      }

      const result = await fetchBootstrap({ announce: true });
      if (cancelled) return;

      if (requestedProfile && result && !result.activationRequired) {
        await openOrCreateConversation(requestedProfile);
      }

      channel = supabase
        .channel(`direct-messages:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "direct_messages" },
          () => {
            window.setTimeout(async () => {
              await fetchBootstrap({ announce: true });
              if (activeConversationIdRef.current) {
                await loadConversation(activeConversationIdRef.current, { keepView: true });
              }
            }, 200);
          }
        )
        .subscribe();

      pollTimer = window.setInterval(() => {
        void fetchBootstrap({ announce: true });
      }, 30000);

      conversationTimer = window.setInterval(() => {
        if (activeConversationIdRef.current) {
          void loadConversation(activeConversationIdRef.current, { keepView: true });
        }
      }, 7000);
    }

    void initialize();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
      if (pollTimer) window.clearInterval(pollTimer);
      if (conversationTimer) window.clearInterval(conversationTimer);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (view === "conversation") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, view]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (reportMessageId) {
        setReportMessageId(null);
        return;
      }
      if (isOpen) setIsOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, reportMessageId]);

  async function activateMessaging() {
    if (!adultConfirmed || !acceptTerms || isActivating) return;
    setIsActivating(true);
    setFeedbackCode(null);

    try {
      const response = await fetch("/api/messages/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adultConfirmed, acceptTerms }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setFeedbackCode(result?.code || "ACTIVATION_FAILED");
        return;
      }

      setActivationRequired(false);
      await fetchBootstrap();

      if (pendingProfileFromUrl) {
        await openOrCreateConversation(pendingProfileFromUrl);
      }
    } finally {
      setIsActivating(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeConversation || !draft.trim() || isSending) return;

    const body = draft.trim();
    setIsSending(true);
    setFeedbackCode(null);

    try {
      const response = await fetch(
        `/api/messages/conversations/${activeConversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        }
      );
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.message) {
        setFeedbackCode(result?.code || "SEND_FAILED");
        return;
      }

      setDraft("");
      setMessages((current) => [...current, result.message]);
      await fetchBootstrap();
    } finally {
      setIsSending(false);
    }
  }

  async function hideMessage(messageId: string) {
    const response = await fetch(`/api/messages/messages/${messageId}/hide`, {
      method: "POST",
    });
    if (!response.ok) {
      setFeedbackCode("ACTION_FAILED");
      return;
    }
    setMessages((current) => current.filter((message) => message.id !== messageId));
    await fetchBootstrap();
  }

  async function withdrawMessage(messageId: string) {
    const response = await fetch(`/api/messages/messages/${messageId}/withdraw`, {
      method: "PATCH",
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedbackCode(result?.code || "WITHDRAW_FAILED");
      return;
    }
    if (activeConversation) await loadConversation(activeConversation.id, { keepView: true });
  }

  async function toggleMute() {
    if (!activeConversation) return;
    const nextMuted = !activeConversation.muted;
    const response = await fetch(
      `/api/messages/conversations/${activeConversation.id}/mute`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ muted: nextMuted }),
      }
    );
    if (!response.ok) {
      setFeedbackCode("ACTION_FAILED");
      return;
    }
    setActiveConversation((current) =>
      current ? { ...current, muted: nextMuted } : current
    );
    await fetchBootstrap();
  }

  async function hideConversation() {
    if (!activeConversation) return;
    const response = await fetch(
      `/api/messages/conversations/${activeConversation.id}/hide`,
      { method: "PATCH" }
    );
    if (!response.ok) {
      setFeedbackCode("ACTION_FAILED");
      return;
    }
    setActiveConversation(null);
    activeConversationIdRef.current = null;
    setMessages([]);
    setView("list");
    await fetchBootstrap();
  }

  async function blockPeer() {
    const profileId = activeConversation?.peer.profileId;
    if (!profileId) return;
    setIsWorking(true);
    try {
      const response = await fetch("/api/messages/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (!response.ok) {
        setFeedbackCode("BLOCK_FAILED");
        return;
      }
      setConfirmBlock(false);
      await loadConversation(activeConversation.id, { keepView: true });
      await fetchBootstrap();
    } finally {
      setIsWorking(false);
    }
  }

  async function unblockPeer() {
    const profileId = activeConversation?.peer.profileId;
    if (!profileId) return;
    const response = await fetch(`/api/messages/blocks?profileId=${encodeURIComponent(profileId)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setFeedbackCode("UNBLOCK_FAILED");
      return;
    }
    await loadConversation(activeConversation.id, { keepView: true });
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportMessageId || isReporting) return;
    setIsReporting(true);
    try {
      const response = await fetch("/api/messages/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: reportMessageId,
          reason: reportReason,
          note: reportNote,
        }),
      });
      if (!response.ok) {
        setFeedbackCode("REPORT_FAILED");
        return;
      }
      setReportMessageId(null);
      setReportNote("");
      setFeedbackCode("REPORT_SENT");
    } finally {
      setIsReporting(false);
    }
  }

  async function updateReadReceipts(enabled: boolean) {
    setReadReceiptsEnabled(enabled);
    const response = await fetch("/api/messages/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readReceiptsEnabled: enabled }),
    });
    if (!response.ok) {
      setReadReceiptsEnabled(!enabled);
      setFeedbackCode("ACTION_FAILED");
    }
  }

  function openConversationFromToast(item: UnreadAnnouncement) {
    setToast(null);
    setIsOpen(true);
    void loadConversation(item.conversationId);
  }

  function goBackToList() {
    setView("list");
    setActiveConversation(null);
    activeConversationIdRef.current = null;
    setMessages([]);
    setFeedbackCode(null);
    setReportMessageId(null);
  }

  function renderFeedbackText(code: string) {
    switch (code) {
      case "LOAD_FAILED":
        return <T textKey="messages.errors.load" fallback="Non riesco a caricare i messaggi." />;
      case "CONVERSATION_LOAD_FAILED":
        return <T textKey="messages.errors.conversationLoad" fallback="Non riesco ad aprire la conversazione." />;
      case "CONVERSATION_CREATE_FAILED":
        return <T textKey="messages.errors.conversationCreate" fallback="Non riesco ad aprire questa conversazione." />;
      case "MUTUAL_FOLLOW_REQUIRED":
        return <T textKey="messages.errors.mutualFollow" fallback="Potete scrivervi solo quando vi seguite a vicenda." />;
      case "MESSAGING_NOT_ENABLED_PEER":
        return <T textKey="messages.errors.peerDisabled" fallback="Questo profilo non ha ancora attivato Messaggi." />;
      case "MESSAGING_BLOCKED":
        return <T textKey="messages.errors.blocked" fallback="I messaggi con questo profilo non sono disponibili." />;
      case "RATE_LIMIT":
        return <T textKey="messages.errors.rateLimit" fallback="Stai scrivendo troppo velocemente. Attendi qualche secondo." />;
      case "DUPLICATE_MESSAGE":
        return <T textKey="messages.errors.duplicate" fallback="Hai appena inviato lo stesso messaggio." />;
      case "SEND_FAILED":
        return <T textKey="messages.errors.send" fallback="Messaggio non inviato." />;
      case "WITHDRAW_WINDOW_EXPIRED":
        return <T textKey="messages.errors.withdrawExpired" fallback="Il tempo disponibile per ritirare questo messaggio è scaduto." />;
      case "WITHDRAW_FAILED":
        return <T textKey="messages.errors.withdraw" fallback="Non riesco a ritirare il messaggio." />;
      case "BLOCK_FAILED":
        return <T textKey="messages.errors.block" fallback="Non riesco a bloccare questo profilo." />;
      case "UNBLOCK_FAILED":
        return <T textKey="messages.errors.unblock" fallback="Non riesco a sbloccare questo profilo." />;
      case "REPORT_FAILED":
        return <T textKey="messages.errors.report" fallback="Non riesco a inviare la segnalazione." />;
      case "ACTIVATION_FAILED":
        return <T textKey="messages.errors.activation" fallback="Non riesco ad attivare Messaggi." />;
      case "REPORT_SENT":
        return <T textKey="messages.report.sent" fallback="Segnalazione inviata." />;
      default:
        return <T textKey="messages.errors.action" fallback="Operazione non riuscita." />;
    }
  }

  function renderFeedback() {
    if (!feedbackCode) return null;
    const success = feedbackCode === "REPORT_SENT";
    return (
      <p className={`rounded-2xl border px-3 py-2 text-xs leading-5 ${success ? "border-emerald-900 bg-emerald-950/25 text-emerald-200" : "border-red-900 bg-red-950/30 text-red-200"}`}>
        {renderFeedbackText(feedbackCode)}
      </p>
    );
  }

  function renderActivation() {
    return (
      <div className="p-5 md:p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-amber-500">
          <T textKey="messages.activation.label" fallback="Attiva Messaggi" />
        </p>
        <h3 className="mt-3 font-editorial text-3xl text-neutral-50">
          <T textKey="messages.activation.title" fallback="Conversazioni private, solo tra follow reciproci." />
        </h3>
        <p className="mt-3 text-sm leading-6 text-neutral-400">
          <T
            textKey="messages.activation.description"
            fallback="Messaggi è disponibile nella V1 soltanto agli utenti maggiorenni. Le conversazioni sono individuali e puoi scrivere solo ai profili che segui e che ti seguono."
          />
        </p>

        <div className="mt-5 space-y-3 rounded-3xl border border-neutral-800 bg-black/35 p-4 text-xs leading-5 text-neutral-400">
          <p><T textKey="messages.activation.rule1" fallback="Non condividere password, codici di accesso o dati di pagamento sensibili." /></p>
          <p><T textKey="messages.activation.rule2" fallback="Molestie, minacce, odio, truffe, spam e attività illecite possono essere segnalati e moderati." /></p>
          <p><T textKey="messages.activation.rule3" fallback="Quando segnali un messaggio, il messaggio e un breve contesto della conversazione vengono condivisi con MostraSpace per la revisione." /></p>
          <p><T textKey="messages.activation.rule4" fallback="Un messaggio ritirato può essere conservato in area protetta fino a 30 giorni per sicurezza, segnalazioni o obblighi legali validi." /></p>
          <p><T textKey="messages.activation.rule5" fallback="La V1 usa protezioni di trasporto e infrastruttura, ma non crittografia end-to-end." /></p>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
          <input type="checkbox" checked={adultConfirmed} onChange={(event) => setAdultConfirmed(event.target.checked)} className="mt-1" />
          <span><T textKey="messages.activation.adult" fallback="Dichiaro di avere almeno 18 anni." /></span>
        </label>

        <label className="mt-3 flex items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
          <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-1" />
          <span>
            <T textKey="messages.activation.acceptPrefix" fallback="Accetto le Regole della messaggistica e confermo di aver letto" />{" "}
            <a href="/legal/termini" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
              <T textKey="messages.activation.terms" fallback="i Termini" />
            </a>{" "}
            <T textKey="messages.activation.and" fallback="e" />{" "}
            <a href="/legal/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
              <T textKey="messages.activation.privacy" fallback="la Privacy Policy" />
            </a>.
          </span>
        </label>

        <button
          type="button"
          onClick={() => void activateMessaging()}
          disabled={!adultConfirmed || !acceptTerms || isActivating}
          className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isActivating ? <T textKey="messages.activation.activating" fallback="Attivazione..." /> : <T textKey="messages.activation.action" fallback="Attiva Messaggi" />}
        </button>
        <div className="mt-3">{renderFeedback()}</div>
      </div>
    );
  }

  function renderList() {
    return (
      <>
        <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-amber-500"><T textKey="messages.header.label" fallback="Messaggi" /></p>
            <p className="mt-1 text-xs text-neutral-500">
              {unreadCount > 0 ? <><strong className="text-neutral-200">{unreadCount}</strong>{" "}<T textKey="messages.header.unread" fallback="da leggere" /></> : <T textKey="messages.header.noneUnread" fallback="Nessun messaggio non letto" />}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setView("contacts"); setSearch(""); }} className="rounded-full border border-neutral-700 px-3 py-2 text-xs text-neutral-200 hover:border-neutral-500">
              <T textKey="messages.actions.new" fallback="Nuovo" />
            </button>
            <button type="button" onClick={() => setView("settings")} className="rounded-full border border-neutral-700 px-3 py-2 text-xs text-neutral-300 hover:border-neutral-500">
              <T textKey="messages.actions.settings" fallback="Impostazioni" />
            </button>
            <button type="button" onClick={() => setIsOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 text-neutral-400 hover:text-white"><CloseIcon /><span className="sr-only"><T textKey="messages.actions.close" fallback="Chiudi Messaggi" /></span></button>
          </div>
        </div>

        <div className="p-3">
          <label className="block"><span className="sr-only"><T textKey="messages.search.conversations" fallback="Cerca conversazioni" /></span><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-2xl border border-neutral-800 bg-black/45 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-neutral-600" /></label>
          <div className="mt-3 max-h-[58vh] space-y-1 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-neutral-500"><T textKey="messages.loading" fallback="Carico messaggi..." /></p>
            ) : filteredConversations.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800 bg-black/30 p-5 text-sm leading-6 text-neutral-500">
                <T textKey="messages.empty" fallback="Non ci sono ancora conversazioni. Puoi iniziare a scrivere a un profilo con cui hai un follow reciproco." />
              </div>
            ) : (
              filteredConversations.map((item) => (
                <button key={item.id} type="button" onClick={() => void loadConversation(item.id)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-neutral-900">
                  <Avatar name={item.peer.deleted ? "?" : item.peer.displayName} url={item.peer.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-neutral-100"><PeerName deleted={item.peer.deleted} name={item.peer.displayName} /></p>
                      <span className="shrink-0 text-[11px] text-neutral-600">{formatShortDate(item.lastMessageAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="truncate text-xs text-neutral-500">
                        {item.lastMessage ? (item.lastMessage.withdrawnAt ? <T textKey="messages.preview.withdrawn" fallback="Messaggio ritirato" /> : item.lastMessage.body || "") : <T textKey="messages.preview.empty" fallback="Conversazione aperta" />}
                      </p>
                      {item.unreadCount > 0 && <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-black">{item.unreadCount > 99 ? "99+" : item.unreadCount}</span>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="mt-3">{renderFeedback()}</div>
        </div>
      </>
    );
  }

  function renderContacts() {
    return (
      <>
        <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-4">
          <button type="button" onClick={goBackToList} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 text-neutral-400 hover:text-white"><BackIcon /></button>
          <div className="min-w-0 flex-1"><p className="text-sm font-medium text-neutral-100"><T textKey="messages.contacts.title" fallback="Nuovo messaggio" /></p><p className="mt-1 text-xs text-neutral-500"><T textKey="messages.contacts.subtitle" fallback="Solo profili con follow reciproco e Messaggi attivo." /></p></div>
          <button type="button" onClick={() => setIsOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 text-neutral-400 hover:text-white"><CloseIcon /></button>
        </div>
        <div className="p-3">
          <label className="block"><span className="sr-only"><T textKey="messages.search.contacts" fallback="Cerca profili" /></span><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-2xl border border-neutral-800 bg-black/45 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-neutral-600" /></label>
          <div className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto">
            {filteredContacts.length === 0 ? <p className="rounded-2xl border border-neutral-800 bg-black/30 p-5 text-sm leading-6 text-neutral-500"><T textKey="messages.contacts.empty" fallback="Non ci sono ancora profili disponibili. Quando due persone si seguono a vicenda e hanno attivato Messaggi, compariranno qui." /></p> : filteredContacts.map((contact) => (
              <button key={contact.profileId} type="button" disabled={isWorking} onClick={() => void openOrCreateConversation(contact.profileId)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-neutral-900 disabled:opacity-50">
                <Avatar name={contact.displayName} url={contact.avatarUrl} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-neutral-100">{contact.displayName}</p><p className="mt-1 text-xs text-neutral-500">{contact.hasConversation ? <T textKey="messages.contacts.existing" fallback="Conversazione già aperta" /> : <T textKey="messages.contacts.mutual" fallback="Vi seguite a vicenda" />}</p></div>
              </button>
            ))}
          </div>
          <div className="mt-3">{renderFeedback()}</div>
        </div>
      </>
    );
  }

  function renderMessageStatus(message: MessageItem) {
    if (!message.mine || message.withdrawnAt) return null;
    if (message.readAt) return <T textKey="messages.receipt.read" fallback="Letto" />;
    if (message.deliveredAt) return <T textKey="messages.receipt.delivered" fallback="Consegnato" />;
    return <T textKey="messages.receipt.sent" fallback="Inviato" />;
  }

  function renderConversation() {
    if (!activeConversation) return renderList();

    return (
      <>
        <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-3">
          <button type="button" onClick={goBackToList} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 text-neutral-400 hover:text-white"><BackIcon /><span className="sr-only"><T textKey="messages.actions.back" fallback="Torna alle conversazioni" /></span></button>
          <Avatar name={activeConversation.peer.deleted ? "?" : activeConversation.peer.displayName} url={activeConversation.peer.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-100"><PeerName deleted={activeConversation.peer.deleted} name={activeConversation.peer.displayName} /></p>
            <p className="mt-0.5 text-[11px] text-neutral-500">{activeConversation.canSend ? <T textKey="messages.conversation.mutual" fallback="Vi seguite a vicenda" /> : <T textKey="messages.conversation.readOnly" fallback="Conversazione in sola lettura" />}</p>
          </div>
          <details className="relative">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-neutral-800 text-neutral-400 hover:text-white">•••</summary>
            <div className="absolute right-0 top-full z-[4] mt-2 w-52 rounded-2xl border border-neutral-800 bg-neutral-950 p-2 shadow-2xl">
              {activeConversation.peer.profileSlug && <a href={`/profili/${activeConversation.peer.profileSlug}`} target="_blank" rel="noreferrer" className="block rounded-xl px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-900"><T textKey="messages.menu.profile" fallback="Vedi profilo" /></a>}
              <button type="button" onClick={() => void toggleMute()} className="block w-full rounded-xl px-3 py-2 text-left text-xs text-neutral-300 hover:bg-neutral-900">{activeConversation.muted ? <T textKey="messages.menu.unmute" fallback="Riattiva notifiche" /> : <T textKey="messages.menu.mute" fallback="Silenzia" />}</button>
              <button type="button" onClick={() => void hideConversation()} className="block w-full rounded-xl px-3 py-2 text-left text-xs text-neutral-300 hover:bg-neutral-900"><T textKey="messages.menu.hideConversation" fallback="Nascondi conversazione" /></button>
              {activeConversation.blockState.blockedByMe ? (
                <button type="button" onClick={() => void unblockPeer()} className="block w-full rounded-xl px-3 py-2 text-left text-xs text-amber-300 hover:bg-neutral-900"><T textKey="messages.menu.unblock" fallback="Sblocca profilo" /></button>
              ) : activeConversation.peer.profileId ? (
                <button type="button" onClick={() => setConfirmBlock(true)} className="block w-full rounded-xl px-3 py-2 text-left text-xs text-red-300 hover:bg-neutral-900"><T textKey="messages.menu.block" fallback="Blocca profilo" /></button>
              ) : null}
            </div>
          </details>
          <button type="button" onClick={() => setIsOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 text-neutral-400 hover:text-white"><CloseIcon /></button>
        </div>

        {confirmBlock && (
          <div className="border-b border-red-900/60 bg-red-950/20 px-4 py-3 text-xs leading-5 text-red-100">
            <p><T textKey="messages.block.confirm" fallback="Bloccando questo profilo verranno rimossi entrambi i follow. La cronologia resterà leggibile, ma non potrete inviarvi nuovi messaggi finché il blocco non verrà rimosso e il follow reciproco non verrà ristabilito." /></p>
            <div className="mt-3 flex gap-2"><button type="button" disabled={isWorking} onClick={() => void blockPeer()} className="rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-red-950"><T textKey="messages.block.confirmAction" fallback="Conferma blocco" /></button><button type="button" onClick={() => setConfirmBlock(false)} className="rounded-full border border-red-900 px-3 py-1.5 text-xs"><T textKey="messages.actions.cancel" fallback="Annulla" /></button></div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-4">
            <div className="space-y-3">
              {messages.length === 0 && <p className="py-10 text-center text-sm text-neutral-600"><T textKey="messages.conversation.empty" fallback="Ancora nessun messaggio. Scrivi tu per primo." /></p>}
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const showDay = !previous || formatDay(previous.createdAt) !== formatDay(message.createdAt);
                return (
                  <div key={message.id}>
                    {showDay && <div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-neutral-900" /><span className="text-[10px] uppercase tracking-[0.16em] text-neutral-600">{formatDay(message.createdAt)}</span><div className="h-px flex-1 bg-neutral-900" /></div>}
                    <div className={`flex ${message.mine ? "justify-end" : "justify-start"}`}>
                      <div className={`group max-w-[86%] rounded-2xl px-3 py-2.5 ${message.mine ? "bg-amber-950/35 text-neutral-100" : "bg-neutral-900 text-neutral-100"}`}>
                        {message.withdrawnAt ? <p className="text-sm italic text-neutral-500"><T textKey="messages.message.withdrawn" fallback="Messaggio ritirato" /></p> : message.body ? <MessageBody body={message.body} /> : null}
                        <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-neutral-600">
                          <span>{formatMessageTime(message.createdAt)}</span>
                          {message.mine && <span>{renderMessageStatus(message)}</span>}
                          <details className="relative">
                            <summary className="cursor-pointer list-none px-1 text-neutral-500 opacity-50 transition group-hover:opacity-100">•••</summary>
                            <div className={`absolute bottom-full z-[5] mb-1 w-44 rounded-2xl border border-neutral-800 bg-neutral-950 p-2 shadow-2xl ${message.mine ? "right-0" : "left-0"}`}>
                              <button type="button" onClick={() => void hideMessage(message.id)} className="block w-full rounded-xl px-3 py-2 text-left text-xs text-neutral-300 hover:bg-neutral-900"><T textKey="messages.message.deleteForMe" fallback="Elimina per te" /></button>
                              {message.mine && message.canWithdraw && !message.withdrawnAt && <button type="button" onClick={() => void withdrawMessage(message.id)} className="block w-full rounded-xl px-3 py-2 text-left text-xs text-amber-300 hover:bg-neutral-900"><T textKey="messages.message.withdraw" fallback="Ritira per tutti" /></button>}
                              {!message.mine && <button type="button" onClick={() => { setReportMessageId(message.id); setReportReason("spam"); setReportNote(""); }} className="block w-full rounded-xl px-3 py-2 text-left text-xs text-red-300 hover:bg-neutral-900"><T textKey="messages.message.report" fallback="Segnala" /></button>}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-neutral-800 bg-neutral-950 p-3 md:p-4">
            {!activeConversation.canSend && <div className="mb-3 rounded-2xl border border-neutral-800 bg-black/30 px-3 py-2 text-xs leading-5 text-neutral-500">{activeConversation.blockState.blockedByMe ? <T textKey="messages.composer.blockedByMe" fallback="Hai bloccato questo profilo. La cronologia resta disponibile, ma non puoi inviare nuovi messaggi." /> : <T textKey="messages.composer.unavailable" fallback="I nuovi messaggi non sono disponibili. Per scrivervi dovete avere Messaggi attivo, seguirvi a vicenda e non avere blocchi attivi." />}</div>}
            <form onSubmit={sendMessage} className="flex items-end gap-2">
              <label className="min-w-0 flex-1"><span className="sr-only"><T textKey="messages.composer.label" fallback="Scrivi un messaggio" /></span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={MAX_MESSAGE_LENGTH} rows={1} disabled={!activeConversation.canSend || isSending} className="max-h-32 min-h-11 w-full resize-y rounded-2xl border border-neutral-800 bg-black/45 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-neutral-600 disabled:opacity-50" /></label>
              <button type="submit" disabled={!activeConversation.canSend || !draft.trim() || isSending} className="rounded-2xl bg-white px-4 py-3 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40">{isSending ? "…" : <T textKey="messages.composer.send" fallback="Invia" />}</button>
            </form>
            <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-neutral-600"><span><T textKey="messages.composer.safety" fallback="Non condividere password o codici di accesso." /></span><span>{draft.length}/{MAX_MESSAGE_LENGTH}</span></div>
            <div className="mt-2">{renderFeedback()}</div>
          </div>
        </div>
      </>
    );
  }

  function renderSettings() {
    return (
      <>
        <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-4"><button type="button" onClick={goBackToList} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 text-neutral-400 hover:text-white"><BackIcon /></button><div className="flex-1"><p className="text-sm font-medium text-neutral-100"><T textKey="messages.settings.title" fallback="Impostazioni Messaggi" /></p></div><button type="button" onClick={() => setIsOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 text-neutral-400 hover:text-white"><CloseIcon /></button></div>
        <div className="space-y-4 p-4">
          <label className="flex items-start justify-between gap-4 rounded-2xl border border-neutral-800 bg-black/30 p-4"><span><span className="block text-sm font-medium text-neutral-100"><T textKey="messages.settings.readReceipts" fallback="Conferme di lettura" /></span><span className="mt-1 block text-xs leading-5 text-neutral-500"><T textKey="messages.settings.readReceiptsDescription" fallback="Se disattivate, gli altri non vedranno quando hai letto i loro messaggi. Il sistema continuerà comunque a gestire internamente i non letti." /></span></span><input type="checkbox" checked={readReceiptsEnabled} onChange={(event) => void updateReadReceipts(event.target.checked)} className="mt-1" /></label>
          <div className="rounded-2xl border border-neutral-800 bg-black/30 p-4 text-xs leading-6 text-neutral-500"><p><T textKey="messages.settings.privacy" fallback="Messaggi V1 è riservato ai maggiorenni, funziona solo con follow reciproco e non utilizza crittografia end-to-end. Blocchi e segnalazioni restano sempre disponibili." /></p></div>
          {renderFeedback()}
        </div>
      </>
    );
  }

  return (
    <>
      {!isOpen && (
        <button type="button" onClick={() => setIsOpen(true)} className="fixed bottom-4 right-4 z-[80] flex h-14 w-14 items-center justify-center rounded-full border border-[var(--museum-bronze)]/60 bg-neutral-950 text-neutral-100 shadow-2xl shadow-black/50 transition hover:border-[var(--museum-bronze)] hover:text-amber-300 md:bottom-6 md:right-6">
          <ChatIcon /><span className="sr-only"><T textKey="messages.actions.open" fallback="Apri Messaggi" /></span>
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-black">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </button>
      )}

      {isOpen && (
        <section className="fixed inset-0 z-[100] flex flex-col overflow-hidden border-neutral-800 bg-neutral-950 text-neutral-100 shadow-2xl md:inset-auto md:bottom-6 md:right-6 md:h-[min(680px,calc(100vh-3rem))] md:w-[420px] md:rounded-[1.75rem] md:border">
          {activationRequired ? renderActivation() : view === "contacts" ? renderContacts() : view === "conversation" ? renderConversation() : view === "settings" ? renderSettings() : renderList()}
        </section>
      )}

      {toast && !isOpen && (
        <div className="fixed bottom-24 right-4 z-[95] w-[min(calc(100vw-2rem),370px)] rounded-3xl border border-neutral-800 bg-neutral-950/95 p-4 shadow-2xl shadow-black/50 backdrop-blur md:bottom-24 md:right-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-500"><T textKey="messages.toast.label" fallback="Nuovo messaggio" /></p>
              {toast.mode === "summary" ? <><p className="mt-2 text-lg font-medium text-neutral-100">{toast.count} <T textKey="messages.toast.summary" fallback="nuovi messaggi" /></p><p className="mt-1 truncate text-sm text-neutral-500">{toast.latest?.peerName || "mostra.space"}</p></> : <><p className="mt-2 text-sm font-medium text-neutral-100">{toast.item.peerName || "mostra.space"}</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-neutral-400">{toast.item.body || <T textKey="messages.preview.withdrawn" fallback="Messaggio ritirato" />}</p></>}
            </div>
            <button type="button" onClick={() => setToast(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-800 text-neutral-500 hover:text-white"><CloseIcon /></button>
          </div>
          <div className="mt-4 flex gap-2">
            {toast.mode === "message" && <button type="button" onClick={() => openConversationFromToast(toast.item)} className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black"><T textKey="messages.toast.open" fallback="Apri" /></button>}
            <button type="button" onClick={() => { setToast(null); setIsOpen(true); setView("list"); }} className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200"><T textKey="messages.toast.viewAll" fallback="Vedi Messaggi" /></button>
          </div>
        </div>
      )}

      {reportMessageId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form onSubmit={submitReport} className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.22em] text-red-300"><T textKey="messages.report.label" fallback="Segnala messaggio" /></p><h3 className="mt-2 text-xl font-medium text-neutral-100"><T textKey="messages.report.title" fallback="Perché vuoi segnalarlo?" /></h3></div><button type="button" onClick={() => setReportMessageId(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-800 text-neutral-500 hover:text-white"><CloseIcon /></button></div>
            <p className="mt-3 text-xs leading-5 text-neutral-500"><T textKey="messages.report.context" fallback="Il messaggio selezionato e un breve contesto vicino verranno condivisi con i moderatori MostraSpace." /></p>
            <div className="mt-4 grid gap-2">
              <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300"><input type="radio" name="reportReason" checked={reportReason === "harassment_threats"} onChange={() => setReportReason("harassment_threats")} /><T textKey="messages.report.reasons.harassment" fallback="Molestie o minacce" /></label>
              <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300"><input type="radio" name="reportReason" checked={reportReason === "hate_discrimination"} onChange={() => setReportReason("hate_discrimination")} /><T textKey="messages.report.reasons.hate" fallback="Odio o discriminazione" /></label>
              <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300"><input type="radio" name="reportReason" checked={reportReason === "sexual_exploitation"} onChange={() => setReportReason("sexual_exploitation")} /><T textKey="messages.report.reasons.sexual" fallback="Contenuti sessuali / sfruttamento" /></label>
              <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300"><input type="radio" name="reportReason" checked={reportReason === "scam_phishing"} onChange={() => setReportReason("scam_phishing")} /><T textKey="messages.report.reasons.scam" fallback="Truffa o phishing" /></label>
              <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300"><input type="radio" name="reportReason" checked={reportReason === "impersonation"} onChange={() => setReportReason("impersonation")} /><T textKey="messages.report.reasons.impersonation" fallback="Impersonificazione" /></label>
              <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300"><input type="radio" name="reportReason" checked={reportReason === "private_data"} onChange={() => setReportReason("private_data")} /><T textKey="messages.report.reasons.privateData" fallback="Dati privati" /></label>
              <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300"><input type="radio" name="reportReason" checked={reportReason === "spam"} onChange={() => setReportReason("spam")} /><T textKey="messages.report.reasons.spam" fallback="Spam" /></label>
              <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300"><input type="radio" name="reportReason" checked={reportReason === "illegal_activity"} onChange={() => setReportReason("illegal_activity")} /><T textKey="messages.report.reasons.illegal" fallback="Attività illecita" /></label>
              <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300"><input type="radio" name="reportReason" checked={reportReason === "other"} onChange={() => setReportReason("other")} /><T textKey="messages.report.reasons.other" fallback="Altro" /></label>
            </div>
            <label className="mt-3 block"><span className="mb-2 block text-xs text-neutral-500"><T textKey="messages.report.note" fallback="Nota facoltativa" /></span><textarea value={reportNote} onChange={(event) => setReportNote(event.target.value)} maxLength={1000} rows={4} className="w-full resize-none rounded-2xl border border-neutral-800 bg-black px-4 py-3 text-sm text-neutral-100 outline-none" /></label>
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setReportMessageId(null)} className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-300"><T textKey="messages.actions.cancel" fallback="Annulla" /></button><button type="submit" disabled={isReporting} className="rounded-full bg-red-100 px-4 py-2 text-xs font-medium text-red-950 disabled:opacity-50"><T textKey="messages.report.send" fallback="Invia segnalazione" /></button></div>
          </form>
        </div>
      )}
    </>
  );
}
