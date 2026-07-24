"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import T from "@/components/i18n/T";

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

type VisitorIdentity = {
  sessionId: string;
  visitorName: string;
};

type TokenResponse = {
  success?: boolean;
  token?: string;
  wsUrl?: string;
  url?: string;
  roomName?: string;
  participantIdentity?: string;
  participantName?: string;
  participantRole?: string;
  canPublishAudio?: boolean;
  accessMode?: LiveAccessMode;
  voiceMode?: LiveVoiceMode;
  error?: string;
};

type ParticipantView = {
  identity: string;
  name: string;
  isLocal: boolean;
  isSpeaking: boolean;
  canPublishAudio: boolean | null;
  role: string | null;
  audioTrackSid: string | null;
};

type ModerationAction =
  | "mute_for_all"
  | "block_microphone"
  | "allow_microphone"
  | "make_listener"
  | "remove_participant";

type LiveGuidedVoiceRoomProps = {
  galleryId: string;
  liveStatus: LiveGuidedVisitsStatus | null;
  liveErrorMessage: string | null;
  activeEvent: LiveGuidedVisitPreview | null;
  upcomingEvent: LiveGuidedVisitPreview | null;
  identity: VisitorIdentity | null;
  displayName: string | null;
  voicePassword: string;
  onVoicePasswordChange: (value: string) => void;
  privateToken?: string;
  inviteToken?: string;
};

type ConnectionState = "idle" | "requesting" | "connecting" | "connected" | "error";

type AudioDeviceOption = {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
};

type DeviceErrorCode =
  | "enumerate_unavailable"
  | "input_switch_failed"
  | "output_switch_failed"
  | "output_not_supported"
  | null;

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
    return <T textKey="gallery.livePanel.voice.access.password" fallback="Password" />;
  }

  if (mode === "invite_only") {
    return <T textKey="gallery.livePanel.voice.access.inviteOnly" fallback="Solo invito" />;
  }

  if (mode === "private_link") {
    return <T textKey="gallery.livePanel.voice.access.privateLink" fallback="Link privato" />;
  }

  return <T textKey="gallery.livePanel.voice.access.public" fallback="Pubblico" />;
}

function getVoiceModeLabel(mode: LiveVoiceMode) {
  if (mode === "everyone") {
    return (
      <T
        textKey="gallery.livePanel.voice.mode.everyone"
        fallback="Tutti possono parlare"
      />
    );
  }

  if (mode === "request_to_speak") {
    return (
      <T
        textKey="gallery.livePanel.voice.mode.requestToSpeak"
        fallback="Richiesta parola"
      />
    );
  }

  return (
    <T
      textKey="gallery.livePanel.voice.mode.ownerOnly"
      fallback="Solo owner/moderatori"
    />
  );
}

function getRoleLabel(role: string | null | undefined) {
  if (role === "admin") {
    return <T textKey="gallery.livePanel.voice.role.admin" fallback="Admin" />;
  }

  if (role === "owner") {
    return <T textKey="gallery.livePanel.voice.role.owner" fallback="Owner" />;
  }

  if (role === "moderator") {
    return <T textKey="gallery.livePanel.voice.role.moderator" fallback="Moderatore" />;
  }

  if (role === "speaker") {
    return <T textKey="gallery.livePanel.voice.role.speaker" fallback="Speaker" />;
  }

  if (role === "listener_can_request") {
    return (
      <T
        textKey="gallery.livePanel.voice.role.listenerCanRequest"
        fallback="Listener · può chiedere parola"
      />
    );
  }

  return <T textKey="gallery.livePanel.voice.role.listener" fallback="Listener" />;
}

function getParticipantName(participant: any) {
  return participant?.name || participant?.identity || "Visitor";
}

function parseParticipantMetadata(participant: any) {
  if (!participant?.metadata || typeof participant.metadata !== "string") {
    return null;
  }

  try {
    return JSON.parse(participant.metadata) as {
      role?: string;
      canPublishAudio?: boolean;
    };
  } catch {
    return null;
  }
}

function trackIsAudio(track: any) {
  return track?.kind === Track.Kind.Audio || track?.source === Track.Source.Microphone;
}

function getParticipantAudioTrackSid(participant: any) {
  const publications = participant?.trackPublications
    ? Array.from(participant.trackPublications.values())
    : [];

  const audioPublication = publications.find((publication: any) => {
    return (
      publication?.source === Track.Source.Microphone ||
      publication?.kind === Track.Kind.Audio ||
      trackIsAudio(publication?.track)
    );
  }) as any;

  return (
    audioPublication?.trackSid ||
    audioPublication?.sid ||
    audioPublication?.track?.sid ||
    null
  );
}

function canModerateRole(role: string | null | undefined) {
  return role === "admin" || role === "owner" || role === "moderator";
}

function getDeviceLabel(
  device: MediaDeviceInfo,
  index: number,
  fallbackPrefix: string
) {
  return device.label?.trim() || `${fallbackPrefix} ${index + 1}`;
}

function getMicrophoneOptions(deviceId: string | null | undefined) {
  if (!deviceId) {
    return undefined;
  }

  return {
    deviceId,
  } as any;
}

async function setElementSinkId(
  element: HTMLMediaElement,
  deviceId: string
) {
  const audioElement = element as HTMLMediaElement & {
    setSinkId?: (sinkId: string) => Promise<void>;
  };

  if (typeof audioElement.setSinkId !== "function") {
    throw new Error("setSinkId not supported");
  }

  await audioElement.setSinkId(deviceId);
}

export default function LiveGuidedVoiceRoom({
  galleryId,
  liveStatus,
  liveErrorMessage,
  activeEvent,
  upcomingEvent,
  identity,
  displayName,
  voicePassword,
  onVoicePasswordChange,
  privateToken = "",
  inviteToken = "",
}: LiveGuidedVoiceRoomProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [participants, setParticipants] = useState<ParticipantView[]>([]);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(false);
  const [mutedRemoteIdentities, setMutedRemoteIdentities] = useState<Set<string>>(
    () => new Set()
  );
  const [moderationLoadingIdentity, setModerationLoadingIdentity] =
    useState<string | null>(null);
  const [moderationMessage, setModerationMessage] = useState<string | null>(null);
  const [isDeviceSettingsOpen, setIsDeviceSettingsOpen] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState<AudioDeviceOption[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<AudioDeviceOption[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("");
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState("");
  const [deviceErrorCode, setDeviceErrorCode] = useState<DeviceErrorCode>(null);

  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);

  const eventForDisplay = activeEvent || upcomingEvent;
  const isConnected = connectionState === "connected";
  const canPublishAudio = Boolean(tokenData?.canPublishAudio);
  const isModerator = canModerateRole(tokenData?.participantRole);

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      if (a.isSpeaking && !b.isSpeaking) return -1;
      if (!a.isSpeaking && b.isSpeaking) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [participants]);

  const refreshAudioDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      setDeviceErrorCode("enumerate_unavailable");
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices
        .filter((device) => device.kind === "audioinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: getDeviceLabel(device, index, "Microfono"),
          kind: "audioinput" as const,
        }));

      const outputs = devices
        .filter((device) => device.kind === "audiooutput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: getDeviceLabel(device, index, "Uscita audio"),
          kind: "audiooutput" as const,
        }));

      setAudioInputDevices(inputs);
      setAudioOutputDevices(outputs);
      setSelectedAudioInputId((current) => current || inputs[0]?.deviceId || "");
      setSelectedAudioOutputId((current) => current || outputs[0]?.deviceId || "");
      setDeviceErrorCode(null);
    } catch {
      setDeviceErrorCode("enumerate_unavailable");
    }
  }, []);

  const applyAudioOutputDevice = useCallback(async (deviceId: string) => {
    if (!deviceId) {
      return;
    }

    const container = audioContainerRef.current;

    if (!container) {
      return;
    }

    const audioElements = Array.from(container.querySelectorAll<HTMLAudioElement>("audio"));

    if (audioElements.length === 0) {
      return;
    }

    try {
      await Promise.all(audioElements.map((element) => setElementSinkId(element, deviceId)));
      setDeviceErrorCode(null);
    } catch {
      setDeviceErrorCode("output_not_supported");
    }
  }, []);

  const applyRemoteMuteState = useCallback((identityToUpdate?: string) => {
    const container = audioContainerRef.current;

    if (!container) {
      return;
    }

    const audioElements = Array.from(
      container.querySelectorAll<HTMLAudioElement>("audio[data-participant-identity]")
    );

    audioElements.forEach((element) => {
      const participantIdentity = element.dataset.participantIdentity || "";

      if (identityToUpdate && identityToUpdate !== participantIdentity) {
        return;
      }

      element.muted = mutedRemoteIdentities.has(participantIdentity);
    });
  }, [mutedRemoteIdentities]);

  const updateParticipants = useCallback(() => {
    const room = roomRef.current;

    if (!room) {
      setParticipants([]);
      return;
    }

    const activeSpeakerIdentities = new Set(
      room.activeSpeakers?.map((participant: any) => participant.identity) || []
    );

    const localMetadata = parseParticipantMetadata(room.localParticipant);
    const localParticipant: ParticipantView = {
      identity: room.localParticipant.identity,
      name: getParticipantName(room.localParticipant),
      isLocal: true,
      isSpeaking:
        Boolean(room.localParticipant.isSpeaking) ||
        activeSpeakerIdentities.has(room.localParticipant.identity),
      canPublishAudio: tokenData?.canPublishAudio ?? null,
      role: tokenData?.participantRole || localMetadata?.role || null,
      audioTrackSid: getParticipantAudioTrackSid(room.localParticipant),
    };

    const remoteParticipants = Array.from(room.remoteParticipants.values()).map(
      (participant: any) => {
        const metadata = parseParticipantMetadata(participant);

        return {
          identity: participant.identity,
          name: getParticipantName(participant),
          isLocal: false,
          isSpeaking:
            Boolean(participant.isSpeaking) || activeSpeakerIdentities.has(participant.identity),
          canPublishAudio:
            typeof metadata?.canPublishAudio === "boolean"
              ? metadata.canPublishAudio
              : null,
          role: metadata?.role || null,
          audioTrackSid: getParticipantAudioTrackSid(participant),
        } satisfies ParticipantView;
      }
    );

    setParticipants([localParticipant, ...remoteParticipants]);
  }, [tokenData?.canPublishAudio, tokenData?.participantRole]);

  const changeAudioInputDevice = useCallback(async (deviceId: string) => {
    setSelectedAudioInputId(deviceId);
    setDeviceErrorCode(null);

    const room = roomRef.current;

    if (!room || !deviceId) {
      return;
    }

    try {
      const switchActiveDevice = (room as unknown as {
        switchActiveDevice?: (kind: MediaDeviceKind, deviceId: string, exact?: boolean) => Promise<void>;
      }).switchActiveDevice;

      if (typeof switchActiveDevice === "function") {
        await switchActiveDevice.call(room, "audioinput", deviceId, true);
      } else if (isMicrophoneEnabled && canPublishAudio) {
        await room.localParticipant.setMicrophoneEnabled(false);
        await room.localParticipant.setMicrophoneEnabled(true, getMicrophoneOptions(deviceId));
      }

      updateParticipants();
    } catch {
      setDeviceErrorCode("input_switch_failed");
    }
  }, [canPublishAudio, isMicrophoneEnabled, updateParticipants]);

  const changeAudioOutputDevice = useCallback(async (deviceId: string) => {
    setSelectedAudioOutputId(deviceId);
    setDeviceErrorCode(null);

    try {
      await applyAudioOutputDevice(deviceId);
    } catch {
      setDeviceErrorCode("output_switch_failed");
    }
  }, [applyAudioOutputDevice]);


  const attachAudioTrack = useCallback((track: any, participant: any) => {
    if (!trackIsAudio(track) || !audioContainerRef.current) {
      return;
    }

    try {
      const element = track.attach() as HTMLAudioElement;
      element.autoplay = true;
      element.dataset.participantIdentity = participant.identity;
      element.muted = mutedRemoteIdentities.has(participant.identity);

      if (selectedAudioOutputId) {
        void setElementSinkId(element, selectedAudioOutputId).catch(() => {
          setDeviceErrorCode("output_not_supported");
        });
      }

      audioContainerRef.current.appendChild(element);
    } catch {
      // Se il browser blocca un attach specifico, la room resta comunque aperta.
    }
  }, [mutedRemoteIdentities, selectedAudioOutputId]);

  const detachAudioTrack = useCallback((track: any) => {
    if (!track || typeof track.detach !== "function") {
      return;
    }

    try {
      const elements = track.detach() as HTMLMediaElement[];
      elements.forEach((element) => element.remove());
    } catch {
      // Ignora detach non disponibili.
    }
  }, []);

  const disconnectVoiceRoom = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;

    if (room) {
      try {
        await room.localParticipant.setMicrophoneEnabled(false);
      } catch {
        // Ignora.
      }

      try {
        room.disconnect();
      } catch {
        // Ignora.
      }
    }

    if (audioContainerRef.current) {
      audioContainerRef.current.innerHTML = "";
    }

    setParticipants([]);
    setIsMicrophoneEnabled(false);
    setConnectionState("idle");
    setTokenData(null);
  }, []);

  useEffect(() => {
    applyRemoteMuteState();
  }, [applyRemoteMuteState]);

  useEffect(() => {
    if (isConnected) {
      void refreshAudioDevices();
    }
  }, [isConnected, refreshAudioDevices]);

  useEffect(() => {
    if (isDeviceSettingsOpen) {
      void refreshAudioDevices();
    }
  }, [isDeviceSettingsOpen, refreshAudioDevices]);

  useEffect(() => {
    if (!selectedAudioOutputId) {
      return;
    }

    void applyAudioOutputDevice(selectedAudioOutputId);
  }, [selectedAudioOutputId, applyAudioOutputDevice]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.addEventListener) {
      return;
    }

    navigator.mediaDevices.addEventListener("devicechange", refreshAudioDevices);

    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", refreshAudioDevices);
    };
  }, [refreshAudioDevices]);

  useEffect(() => {
    return () => {
      void disconnectVoiceRoom();
    };
  }, [disconnectVoiceRoom]);

  async function connectVoiceRoom() {
    if (!activeEvent || !identity || connectionState === "requesting" || connectionState === "connecting") {
      return;
    }

    setConnectionState("requesting");
    setErrorMessage(null);
    setTokenData(null);

    try {
      const tokenResponse = await fetch("/api/live-guided-visits/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          liveEventId: activeEvent.id,
          galleryId,
          password: voicePassword.trim() || undefined,
          privateToken: privateToken || undefined,
          inviteToken: inviteToken || undefined,
          sessionId: identity.sessionId,
          displayName: displayName || identity.visitorName,
        }),
      });

      const result = (await tokenResponse.json().catch(() => null)) as TokenResponse | null;

      if (!tokenResponse.ok || !result?.token || !(result.wsUrl || result.url)) {
        throw new Error(result?.error || "Accesso alla voice room non valido.");
      }

      setTokenData(result);
      setConnectionState("connecting");

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      const handleTrackSubscribed = (track: any, _publication: any, participant: any) => {
        attachAudioTrack(track, participant);
        updateParticipants();
      };

      const handleTrackUnsubscribed = (track: any) => {
        detachAudioTrack(track);
        updateParticipants();
      };

      const handleRoomUpdate = () => {
        updateParticipants();
      };

      const handleDisconnected = () => {
        if (audioContainerRef.current) {
          audioContainerRef.current.innerHTML = "";
        }
        setIsMicrophoneEnabled(false);
        setParticipants([]);
        setConnectionState("idle");
        setTokenData(null);
      };

      room
        .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
        .on(RoomEvent.ParticipantConnected, handleRoomUpdate)
        .on(RoomEvent.ParticipantDisconnected, handleRoomUpdate)
        .on(RoomEvent.TrackMuted, handleRoomUpdate)
        .on(RoomEvent.TrackUnmuted, handleRoomUpdate)
        .on(RoomEvent.ActiveSpeakersChanged, handleRoomUpdate)
        .on(RoomEvent.Disconnected, handleDisconnected);

      await room.connect(result.wsUrl || result.url || "", result.token, {
        autoSubscribe: true,
      });

      await room.startAudio().catch(() => {
        // Il click su “entra” normalmente sblocca l’audio; se non succede,
        // il visitatore potrà riprovare con i controlli browser.
      });

      room.remoteParticipants.forEach((participant: any) => {
        participant.trackPublications.forEach((publication: any) => {
          if (publication.track && trackIsAudio(publication.track)) {
            attachAudioTrack(publication.track, participant);
          }
        });
      });

      if (result.canPublishAudio) {
        await room.localParticipant.setMicrophoneEnabled(
          true,
          getMicrophoneOptions(selectedAudioInputId)
        );
        setIsMicrophoneEnabled(true);
      } else {
        await room.localParticipant.setMicrophoneEnabled(false);
        setIsMicrophoneEnabled(false);
      }

      setConnectionState("connected");
      updateParticipants();
    } catch (error) {
      await disconnectVoiceRoom();
      setConnectionState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Non riesco a entrare nella voice room."
      );
    }
  }

  async function toggleMicrophone() {
    const room = roomRef.current;

    if (!room || !canPublishAudio) {
      return;
    }

    const nextValue = !isMicrophoneEnabled;

    try {
      await room.localParticipant.setMicrophoneEnabled(
        nextValue,
        nextValue ? getMicrophoneOptions(selectedAudioInputId) : undefined
      );
      setIsMicrophoneEnabled(nextValue);
      updateParticipants();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Non riesco a modificare il microfono."
      );
    }
  }

  function toggleRemoteMute(participantIdentity: string) {
    setMutedRemoteIdentities((current) => {
      const next = new Set(current);

      if (next.has(participantIdentity)) {
        next.delete(participantIdentity);
      } else {
        next.add(participantIdentity);
      }

      return next;
    });
  }

  async function moderateParticipant(
    participant: ParticipantView,
    action: ModerationAction
  ) {
    if (!activeEvent || !tokenData || !isModerator || participant.isLocal) {
      return;
    }

    setModerationMessage(null);
    setErrorMessage(null);
    setModerationLoadingIdentity(participant.identity);

    try {
      const response = await fetch("/api/live-guided-visits/moderation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          liveEventId: activeEvent.id,
          galleryId,
          roomName: tokenData.roomName,
          action,
          targetIdentity: participant.identity,
          targetName: participant.name,
          targetAudioTrackSid: participant.audioTrackSid,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; message?: string; error?: string }
        | null;

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Azione di moderazione non riuscita.");
      }

      setModerationMessage(result.message || "Moderazione aggiornata.");

      window.setTimeout(() => {
        updateParticipants();
      }, 500);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Non riesco a completare la moderazione."
      );
    } finally {
      setModerationLoadingIdentity(null);
    }
  }

  function renderStatusNotice() {
    if (!liveStatus && !liveErrorMessage) {
      return (
        <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-4 text-sm text-[var(--museum-stone-muted)]">
          <T
            textKey="gallery.livePanel.voice.loading"
            fallback="Controllo voice room in corso..."
          />
        </div>
      );
    }

    if (liveErrorMessage) {
      return (
        <div className="rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm leading-6 text-red-100/90">
          {liveErrorMessage}
        </div>
      );
    }

    if (liveStatus && !liveStatus.isInstitutionGallery) {
      return (
        <div className="rounded-2xl border border-yellow-900 bg-yellow-950/25 p-4 text-sm leading-6 text-yellow-100/90">
          <T
            textKey="gallery.livePanel.voice.institutionOnly"
            fallback="Voice room disponibile solo per gallerie Institution."
          />
        </div>
      );
    }

    if (liveStatus?.isInstitutionGallery && !eventForDisplay) {
      return (
        <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-4 text-sm leading-6 text-[var(--museum-stone-muted)]">
          <T
            textKey="gallery.livePanel.voice.noLiveVisit"
            fallback="Nessuna Live guided visit attiva o programmata."
          />
        </div>
      );
    }

    return null;
  }

  function renderEventSummary(event: LiveGuidedVisitPreview) {
    return (
      <article className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              event.isJoinWindowOpen
                ? "rounded-full border border-emerald-900 bg-emerald-950/35 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-emerald-200"
                : "rounded-full border border-amber-900 bg-amber-950/25 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-amber-200"
            }
          >
            {event.isJoinWindowOpen ? (
              <T textKey="gallery.livePanel.voice.status.open" fallback="Ingresso aperto" />
            ) : (
              <T textKey="gallery.livePanel.voice.status.scheduled" fallback="Programmata" />
            )}
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

        <div className="mt-3 grid gap-2 text-xs text-[var(--museum-stone-muted)] sm:grid-cols-2">
          <div className="rounded-xl border border-[rgba(243,237,226,0.1)] bg-black/25 p-2">
            <span className="block uppercase tracking-[0.16em]">
              <T textKey="gallery.livePanel.voice.summary.voice" fallback="Voce" />
            </span>
            <span className="mt-1 block text-[var(--museum-ivory-soft)]">
              {getVoiceModeLabel(event.voiceMode)}
            </span>
          </div>

          <div className="rounded-xl border border-[rgba(243,237,226,0.1)] bg-black/25 p-2">
            <span className="block uppercase tracking-[0.16em]">
              <T textKey="gallery.livePanel.voice.summary.capacity" fallback="Capienza" />
            </span>
            <span className="mt-1 block text-[var(--museum-ivory-soft)]">
              {event.maxParticipants || "N/D"}
            </span>
          </div>
        </div>
      </article>
    );
  }

  function renderDeviceError() {
    if (!deviceErrorCode) {
      return null;
    }

    return (
      <p className="rounded-2xl border border-yellow-900 bg-yellow-950/25 px-3 py-2 text-xs leading-5 text-yellow-100/90">
        {deviceErrorCode === "enumerate_unavailable" ? (
          <T
            textKey="gallery.livePanel.voice.devices.errors.enumerateUnavailable"
            fallback="Non riesco a leggere i dispositivi audio del browser. Controlla i permessi del microfono."
          />
        ) : deviceErrorCode === "input_switch_failed" ? (
          <T
            textKey="gallery.livePanel.voice.devices.errors.inputSwitchFailed"
            fallback="Non riesco a cambiare microfono. Controlla che il dispositivo sia collegato e autorizzato."
          />
        ) : deviceErrorCode === "output_not_supported" ? (
          <T
            textKey="gallery.livePanel.voice.devices.errors.outputNotSupported"
            fallback="Questo browser non supporta la scelta dell’uscita audio dalla pagina. Usa le impostazioni audio del sistema."
          />
        ) : (
          <T
            textKey="gallery.livePanel.voice.devices.errors.outputSwitchFailed"
            fallback="Non riesco a cambiare uscita audio. Controlla il dispositivo selezionato."
          />
        )}
      </p>
    );
  }

  function renderDeviceSettings() {
    if (!isConnected || !isDeviceSettingsOpen) {
      return null;
    }

    return (
      <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-3">
        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--museum-bronze-light)]">
              <T textKey="gallery.livePanel.voice.devices.label" fallback="Impostazioni audio" />
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--museum-stone-muted)]">
              <T
                textKey="gallery.livePanel.voice.devices.description"
                fallback="Scegli il microfono per parlare e l’uscita audio per ascoltare la room."
              />
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refreshAudioDevices()}
            className="w-fit rounded-full border border-[rgba(243,237,226,0.16)] px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
          >
            <T textKey="gallery.livePanel.voice.devices.refresh" fallback="Aggiorna" />
          </button>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
              <T textKey="gallery.livePanel.voice.devices.microphone" fallback="Microfono" />
            </span>
            <select
              value={selectedAudioInputId}
              onChange={(event) => void changeAudioInputDevice(event.target.value)}
              className="rounded-2xl border border-[rgba(243,237,226,0.14)] bg-black/45 px-4 py-3 text-sm text-[var(--museum-ivory)] outline-none transition focus:border-[var(--museum-bronze)]"
            >
              {audioInputDevices.length === 0 ? (
                <option value="">
                  Dispositivo non disponibile
                </option>
              ) : (
                audioInputDevices.map((device) => (
                  <option key={`input-${device.deviceId}`} value={device.deviceId}>
                    {device.label}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
              <T textKey="gallery.livePanel.voice.devices.output" fallback="Ascolto" />
            </span>
            <select
              value={selectedAudioOutputId}
              onChange={(event) => void changeAudioOutputDevice(event.target.value)}
              className="rounded-2xl border border-[rgba(243,237,226,0.14)] bg-black/45 px-4 py-3 text-sm text-[var(--museum-ivory)] outline-none transition focus:border-[var(--museum-bronze)]"
            >
              {audioOutputDevices.length === 0 ? (
                <option value="">
                  Dispositivo non disponibile
                </option>
              ) : (
                audioOutputDevices.map((device) => (
                  <option key={`output-${device.deviceId}`} value={device.deviceId}>
                    {device.label}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        {renderDeviceError()}
      </div>
    );
  }

  function renderConnectionControls() {
    if (!activeEvent && eventForDisplay) {
      return (
        <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-3 text-xs leading-5 text-[var(--museum-stone-muted)]">
          <T
            textKey="gallery.livePanel.voice.joinAvailableFrom"
            fallback="L’ingresso sarà disponibile da"
          />{" "}
          {formatEventDateTime(eventForDisplay.joinOpensAt)}.
        </div>
      );
    }

    if (!activeEvent) {
      return null;
    }

    if (!isConnected) {
      return (
        <button
          type="button"
          onClick={connectVoiceRoom}
          disabled={connectionState === "requesting" || connectionState === "connecting" || !identity}
          className="rounded-2xl bg-[var(--museum-bronze)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {connectionState === "requesting" || connectionState === "connecting" ? (
            <T textKey="gallery.livePanel.voice.actions.connecting" fallback="Connessione..." />
          ) : (
            <T textKey="gallery.livePanel.voice.actions.join" fallback="Entra in voce" />
          )}
        </button>
      );
    }

    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={toggleMicrophone}
          disabled={!canPublishAudio}
          className={
            canPublishAudio
              ? "rounded-2xl border border-[rgba(197,151,94,0.45)] bg-[rgba(197,151,94,0.12)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--museum-bronze-light)] transition hover:bg-[rgba(197,151,94,0.2)]"
              : "cursor-not-allowed rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--museum-stone-muted)] opacity-70"
          }
        >
          {!canPublishAudio ? (
            <T textKey="gallery.livePanel.voice.actions.listener" fallback="Solo ascolto" />
          ) : isMicrophoneEnabled ? (
            <T textKey="gallery.livePanel.voice.actions.muteMic" fallback="Muta microfono" />
          ) : (
            <T textKey="gallery.livePanel.voice.actions.unmuteMic" fallback="Attiva microfono" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsDeviceSettingsOpen((current) => !current)}
          className={
            isDeviceSettingsOpen
              ? "rounded-2xl border border-[rgba(197,151,94,0.55)] bg-[rgba(197,151,94,0.18)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--museum-bronze-light)] transition hover:bg-[rgba(197,151,94,0.24)]"
              : "rounded-2xl border border-[rgba(243,237,226,0.14)] bg-black/32 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
          }
        >
          <T textKey="gallery.livePanel.voice.actions.settings" fallback="Impostazioni" />
        </button>

        <button
          type="button"
          onClick={() => void disconnectVoiceRoom()}
          className="rounded-2xl border border-red-900 bg-red-950/30 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-950/50"
        >
          <T textKey="gallery.livePanel.voice.actions.leave" fallback="Lascia stanza" />
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-[rgba(197,151,94,0.28)] bg-[rgba(197,151,94,0.08)] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--museum-bronze-light)]">
          <T textKey="gallery.livePanel.voice.label" fallback="Live guided visits" />
        </p>
        <h3 className="mt-1 font-editorial text-2xl text-[var(--museum-ivory)]">
          <T textKey="gallery.livePanel.voice.title" fallback="Voice room audio" />
        </h3>
        <p className="mt-2 text-xs leading-5 text-[var(--museum-stone)]">
          <T
            textKey="gallery.livePanel.voice.description"
            fallback="Entra nella visita guidata live, ascolta la room e parla solo se il tuo ruolo lo consente."
          />
        </p>
      </div>

      {renderStatusNotice()}

      {eventForDisplay && renderEventSummary(eventForDisplay)}

      {eventForDisplay?.accessMode === "password" && !isConnected && (
        <label className="grid gap-2">
          <span className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
            <T textKey="gallery.livePanel.voice.password.label" fallback="Password evento" />
          </span>
          <input
            type="password"
            value={voicePassword}
            onChange={(event) => onVoicePasswordChange(event.target.value)}
            placeholder="Password"
            className="rounded-2xl border border-[rgba(243,237,226,0.14)] bg-black/45 px-4 py-3 text-sm text-[var(--museum-ivory)] outline-none transition placeholder:text-[var(--museum-stone-muted)] focus:border-[var(--museum-bronze)]"
          />
        </label>
      )}

      {eventForDisplay?.accessMode === "invite_only" && !isConnected && (
        <div className="rounded-2xl border border-[rgba(197,151,94,0.22)] bg-black/32 p-3 text-xs leading-5 text-[var(--museum-stone)]">
          <T
            textKey="gallery.livePanel.voice.inviteOnlyNotice"
            fallback="Questo evento è su invito. Devi accedere con un account invitato o usare un link invito valido."
          />
        </div>
      )}

      {eventForDisplay?.accessMode === "private_link" && !isConnected && (
        <div className="rounded-2xl border border-[rgba(197,151,94,0.22)] bg-black/32 p-3 text-xs leading-5 text-[var(--museum-stone)]">
          <T
            textKey="gallery.livePanel.voice.privateLinkNotice"
            fallback="Questo evento richiede un link privato. Il token nel link viene letto automaticamente."
          />
        </div>
      )}

      {renderConnectionControls()}

      {renderDeviceSettings()}

      {isConnected && tokenData && (
        <div className="rounded-2xl border border-emerald-900 bg-emerald-950/25 p-3 text-xs leading-5 text-emerald-100/90">
          <T textKey="gallery.livePanel.voice.connected" fallback="Connesso alla voice room." />{" "}
          <T textKey="gallery.livePanel.voice.yourRole" fallback="Ruolo:" />{" "}
          {getRoleLabel(tokenData.participantRole)} ·{" "}
          {canPublishAudio ? (
            <T textKey="gallery.livePanel.voice.canSpeak" fallback="puoi parlare" />
          ) : (
            <T textKey="gallery.livePanel.voice.listenOnly" fallback="solo ascolto" />
          )}
        </div>
      )}

      {errorMessage && (
        <p className="rounded-2xl border border-red-900 bg-red-950/30 px-3 py-2 text-xs leading-5 text-red-200">
          {errorMessage}
        </p>
      )}

      {moderationMessage && isModerator && (
        <p className="rounded-2xl border border-sky-900 bg-sky-950/25 px-3 py-2 text-xs leading-5 text-sky-100/90">
          {moderationMessage}
        </p>
      )}

      {isConnected && (
        <div className="rounded-2xl border border-[rgba(243,237,226,0.12)] bg-black/32 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
              <T textKey="gallery.livePanel.voice.participants" fallback="Partecipanti voce" />
            </p>
            <span className="rounded-full bg-[rgba(197,151,94,0.16)] px-2 py-0.5 text-[0.68rem] text-[var(--museum-bronze-light)]">
              {sortedParticipants.length}
            </span>
          </div>

          <div className="grid max-h-64 gap-2 overflow-y-auto">
            {sortedParticipants.map((participant) => {
              const isRemoteMuted = mutedRemoteIdentities.has(participant.identity);

              return (
                <div
                  key={participant.identity}
                  className="grid gap-2 rounded-2xl border border-[rgba(243,237,226,0.12)] bg-[rgba(243,237,226,0.05)] px-3 py-2 text-xs text-[var(--museum-ivory-soft)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {participant.name}{" "}
                      {participant.isLocal ? (
                        <span className="text-[var(--museum-stone-muted)]">
                          · <T textKey="gallery.livePanel.voice.you" fallback="tu" />
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={
                        participant.isSpeaking
                          ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-200"
                          : "rounded-full bg-black/35 px-2 py-0.5 text-[var(--museum-stone-muted)]"
                      }
                    >
                      {participant.isSpeaking ? (
                        <T textKey="gallery.livePanel.voice.speaking" fallback="parla" />
                      ) : (
                        getRoleLabel(participant.role)
                      )}
                    </span>
                  </div>

                  {!participant.isLocal && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRemoteMute(participant.identity)}
                        className="w-fit rounded-full border border-[rgba(243,237,226,0.16)] px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
                      >
                        {isRemoteMuted ? (
                          <T textKey="gallery.livePanel.voice.remoteUnmute" fallback="Riascolta" />
                        ) : (
                          <T textKey="gallery.livePanel.voice.remoteMute" fallback="Muta per me" />
                        )}
                      </button>

                      {isModerator && (
                        <>
                          <button
                            type="button"
                            disabled={
                              moderationLoadingIdentity === participant.identity ||
                              !participant.audioTrackSid
                            }
                            onClick={() =>
                              void moderateParticipant(participant, "mute_for_all")
                            }
                            className="rounded-full border border-yellow-900 bg-yellow-950/25 px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-yellow-100 transition hover:bg-yellow-950/45 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <T
                              textKey="gallery.livePanel.voice.moderation.muteForAll"
                              fallback="Muta per tutti"
                            />
                          </button>

                          <button
                            type="button"
                            disabled={moderationLoadingIdentity === participant.identity}
                            onClick={() =>
                              void moderateParticipant(participant, "block_microphone")
                            }
                            className="rounded-full border border-red-900 bg-red-950/30 px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <T
                              textKey="gallery.livePanel.voice.moderation.blockMic"
                              fallback="Blocca mic"
                            />
                          </button>

                          <button
                            type="button"
                            disabled={moderationLoadingIdentity === participant.identity}
                            onClick={() =>
                              void moderateParticipant(participant, "allow_microphone")
                            }
                            className="rounded-full border border-emerald-900 bg-emerald-950/25 px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-emerald-100 transition hover:bg-emerald-950/45 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <T
                              textKey="gallery.livePanel.voice.moderation.makeSpeaker"
                              fallback="Rendi speaker"
                            />
                          </button>

                          <button
                            type="button"
                            disabled={moderationLoadingIdentity === participant.identity}
                            onClick={() =>
                              void moderateParticipant(participant, "make_listener")
                            }
                            className="rounded-full border border-[rgba(243,237,226,0.16)] bg-black/30 px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <T
                              textKey="gallery.livePanel.voice.moderation.makeListener"
                              fallback="Solo ascolto"
                            />
                          </button>

                          <button
                            type="button"
                            disabled={moderationLoadingIdentity === participant.identity}
                            onClick={() =>
                              void moderateParticipant(participant, "remove_participant")
                            }
                            className="rounded-full border border-red-900 px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-950/35 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <T
                              textKey="gallery.livePanel.voice.moderation.remove"
                              fallback="Rimuovi"
                            />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div ref={audioContainerRef} className="hidden" />
    </div>
  );
}
