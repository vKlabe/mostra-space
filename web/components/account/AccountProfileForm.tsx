"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useRef, useState, useTransition } from "react";
import T from "@/components/i18n/T";

type EditableProfile = {
  email: string;
  full_name: string | null;
  display_name: string | null;
  website_url: string | null;
  instagram_url: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type AccountProfileFormProps = {
  profile: EditableProfile;
};

type AvatarMessageCode =
  | "processing"
  | "uploading"
  | "uploadSuccess"
  | "removeSuccess"
  | "invalidType"
  | "sourceTooLarge"
  | "invalidImage"
  | "uploadError"
  | "removeError";

type AvatarMessage = {
  type: "info" | "success" | "error";
  code: AvatarMessageCode;
};

const MAX_AVATAR_EDGE = 512;
const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_SOURCE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getAvatarInitial(profile: EditableProfile) {
  const name = profile.display_name || profile.full_name || profile.email || "M";
  return name.trim().slice(0, 1).toUpperCase() || "M";
}

function AvatarMessageContent({ code }: { code: AvatarMessageCode }) {
  switch (code) {
    case "processing":
      return (
        <T
          textKey="account.profile.avatar.messages.processing"
          fallback="Preparazione immagine..."
        />
      );
    case "uploading":
      return (
        <T
          textKey="account.profile.avatar.messages.uploading"
          fallback="Caricamento immagine profilo..."
        />
      );
    case "uploadSuccess":
      return (
        <T
          textKey="account.profile.avatar.messages.uploadSuccess"
          fallback="Immagine profilo aggiornata correttamente."
        />
      );
    case "removeSuccess":
      return (
        <T
          textKey="account.profile.avatar.messages.removeSuccess"
          fallback="Immagine profilo rimossa. Verrà mostrata l’iniziale del nome."
        />
      );
    case "invalidType":
      return (
        <T
          textKey="account.profile.avatar.messages.invalidType"
          fallback="Formato non supportato. Usa JPG, PNG o WEBP."
        />
      );
    case "sourceTooLarge":
      return (
        <T
          textKey="account.profile.avatar.messages.sourceTooLarge"
          fallback="Il file originale è troppo pesante. Usa un’immagine fino a 10 MB."
        />
      );
    case "invalidImage":
      return (
        <T
          textKey="account.profile.avatar.messages.invalidImage"
          fallback="Non riesco a leggere questa immagine. Prova con un altro file."
        />
      );
    case "removeError":
      return (
        <T
          textKey="account.profile.avatar.messages.removeError"
          fallback="Non riesco a rimuovere l’immagine profilo. Riprova."
        />
      );
    default:
      return (
        <T
          textKey="account.profile.avatar.messages.uploadError"
          fallback="Non riesco ad aggiornare l’immagine profilo. Riprova."
        />
      );
  }
}

async function createOptimizedAvatar(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("INVALID_IMAGE"));
      nextImage.src = objectUrl;
    });

    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;

    if (!sourceWidth || !sourceHeight) {
      throw new Error("INVALID_IMAGE");
    }

    const scale = Math.min(
      1,
      MAX_AVATAR_EDGE / Math.max(sourceWidth, sourceHeight)
    );
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      throw new Error("INVALID_IMAGE");
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const webpBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.88);
    });

    if (webpBlob) {
      return webpBlob;
    }

    const jpegBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });

    if (!jpegBlob) {
      throw new Error("INVALID_IMAGE");
    }

    return jpegBlob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}


type FormState = {
  fullName: string;
  displayName: string;
  websiteUrl: string;
  instagramUrl: string;
  bio: string;
  currentPassword: string;
};

function toInitialState(profile: EditableProfile): FormState {
  return {
    fullName: profile.full_name || "",
    displayName: profile.display_name || "",
    websiteUrl: profile.website_url || "",
    instagramUrl: profile.instagram_url || "",
    bio: profile.bio || "",
    currentPassword: "",
  };
}

export default function AccountProfileForm({
  profile,
}: AccountProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<FormState>(() =>
    toInitialState(profile)
  );
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [isAvatarBusy, setIsAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<AvatarMessage | null>(null);

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ALLOWED_SOURCE_TYPES.has(file.type)) {
      setAvatarMessage({ type: "error", code: "invalidType" });
      return;
    }

    if (file.size > MAX_SOURCE_FILE_BYTES) {
      setAvatarMessage({ type: "error", code: "sourceTooLarge" });
      return;
    }

    setIsAvatarBusy(true);
    setAvatarMessage({ type: "info", code: "processing" });

    try {
      const optimizedAvatar = await createOptimizedAvatar(file);
      const extension = optimizedAvatar.type === "image/jpeg" ? "jpg" : "webp";
      const formData = new FormData();
      formData.append("file", optimizedAvatar, `avatar.${extension}`);

      setAvatarMessage({ type: "info", code: "uploading" });

      const response = await fetch("/api/account/avatar", {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.avatarUrl) {
        throw new Error(result?.errorCode || "UPLOAD_ERROR");
      }

      setAvatarUrl(result.avatarUrl);
      setAvatarMessage({ type: "success", code: "uploadSuccess" });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setAvatarMessage({
        type: "error",
        code:
          error instanceof Error && error.message === "INVALID_IMAGE"
            ? "invalidImage"
            : "uploadError",
      });
    } finally {
      setIsAvatarBusy(false);
    }
  }

  async function handleAvatarRemove() {
    setIsAvatarBusy(true);
    setAvatarMessage(null);

    try {
      const response = await fetch("/api/account/avatar", { method: "DELETE" });

      if (!response.ok) {
        throw new Error("REMOVE_ERROR");
      }

      setAvatarUrl(null);
      setAvatarMessage({ type: "success", code: "removeSuccess" });

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setAvatarMessage({ type: "error", code: "removeError" });
    } finally {
      setIsAvatarBusy(false);
    }
  }

  function updateField(field: keyof FormState, value: string) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function cancelEdit() {
    setFormState(toInitialState(profile));
    setMessage(null);
    setIsEditing(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formState.currentPassword.trim()) {
      setMessage({
        type: "error",
        text: "Inserisci la password attuale per confermare le modifiche.",
      });

      return;
    }

    setMessage(null);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formState.fullName,
          displayName: formState.displayName,
          websiteUrl: formState.websiteUrl,
          instagramUrl: formState.instagramUrl,
          bio: formState.bio,
          currentPassword: formState.currentPassword,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "Errore durante l'aggiornamento del profilo."
        );
      }

      setFormState((current) => ({
        ...current,
        currentPassword: "",
      }));

      setMessage({
        type: "success",
        text: "Dati account aggiornati correttamente.",
      });

      setIsEditing(false);

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Errore durante l'aggiornamento del profilo.",
      });
    }
  }

  return (
    <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-2xl font-medium text-neutral-100">
            <T
              textKey="account.profile.header.title"
              fallback="Dati account"
            />
          </h2>

          <p className="mt-2 text-sm leading-6 text-neutral-400">
            <T
              textKey="account.profile.header.description"
              fallback="Modifica i dati visibili del tuo profilo. Per confermare devi inserire la password attuale."
            />
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setIsEditing(true);
            }}
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="account.profile.actions.edit"
              fallback="Modifica dati"
            />
          </button>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-neutral-800 bg-black">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile.display_name || profile.full_name || "mostra.space"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-serif text-3xl text-amber-500">
                  {getAvatarInitial(profile)}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="font-medium text-neutral-100">
                <T
                  textKey="account.profile.avatar.title"
                  fallback="Immagine profilo"
                />
              </p>
              <p className="mt-1 max-w-md text-xs leading-5 text-neutral-500">
                <T
                  textKey="account.profile.avatar.description"
                  fallback="Carica JPG, PNG o WEBP. mostra.space ottimizza automaticamente l’immagine fino a un massimo di 512 × 512 px."
                />
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isAvatarBusy}
              className="rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {avatarUrl ? (
                <T
                  textKey="account.profile.avatar.actions.change"
                  fallback="Cambia immagine"
                />
              ) : (
                <T
                  textKey="account.profile.avatar.actions.upload"
                  fallback="Carica immagine"
                />
              )}
            </button>

            {avatarUrl && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                disabled={isAvatarBusy}
                className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <T
                  textKey="account.profile.avatar.actions.remove"
                  fallback="Rimuovi"
                />
              </button>
            )}
          </div>
        </div>

        {avatarMessage && (
          <div
            className={
              avatarMessage.type === "success"
                ? "mt-4 rounded-xl border border-emerald-900 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200"
                : avatarMessage.type === "error"
                  ? "mt-4 rounded-xl border border-red-900 bg-red-950/30 px-3 py-2 text-xs text-red-200"
                  : "mt-4 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300"
            }
          >
            <AvatarMessageContent code={avatarMessage.code} />
          </div>
        )}
      </div>

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

      {!isEditing && (
        <dl className="mt-6 space-y-4 text-sm">
          <div>
            <dt className="text-neutral-500">
              <T textKey="account.profile.fields.email" fallback="Email" />
            </dt>
            <dd className="mt-1 break-all text-neutral-200">
              {profile.email ? (
                profile.email
              ) : (
                <T
                  textKey="account.profile.values.notAvailable"
                  fallback="Non disponibile"
                />
              )}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">
              <T
                textKey="account.profile.fields.fullName"
                fallback="Nome completo"
              />
            </dt>
            <dd className="mt-1 text-neutral-200">
              {profile.full_name ? (
                profile.full_name
              ) : (
                <T
                  textKey="account.profile.values.notEntered"
                  fallback="Non inserito"
                />
              )}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">
              <T
                textKey="account.profile.fields.displayName"
                fallback="Nome visualizzato"
              />
            </dt>
            <dd className="mt-1 text-neutral-200">
              {profile.display_name ? (
                profile.display_name
              ) : (
                <T
                  textKey="account.profile.values.notEntered"
                  fallback="Non inserito"
                />
              )}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">
              <T textKey="account.profile.fields.website" fallback="Sito" />
            </dt>
            <dd className="mt-1 break-all text-neutral-200">
              {profile.website_url ? (
                profile.website_url
              ) : (
                <T
                  textKey="account.profile.values.notEntered"
                  fallback="Non inserito"
                />
              )}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">
              <T
                textKey="account.profile.fields.instagram"
                fallback="Instagram / social"
              />
            </dt>
            <dd className="mt-1 break-all text-neutral-200">
              {profile.instagram_url ? (
                profile.instagram_url
              ) : (
                <T
                  textKey="account.profile.values.notEntered"
                  fallback="Non inserito"
                />
              )}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">
              <T textKey="account.profile.fields.bio" fallback="Bio" />
            </dt>
            <dd className="mt-1 whitespace-pre-line text-neutral-200">
              {profile.bio ? (
                profile.bio
              ) : (
                <T
                  textKey="account.profile.values.bioNotEntered"
                  fallback="Non inserita"
                />
              )}
            </dd>
          </div>
        </dl>
      )}

      {isEditing && (
        <form onSubmit={saveProfile} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="account-email"
              className="text-sm font-medium text-neutral-300"
            >
              <T textKey="account.profile.fields.email" fallback="Email" />
            </label>

            <input
              id="account-email"
              value={profile.email || ""}
              disabled
              className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-500"
            />

            <p className="mt-2 text-xs leading-5 text-neutral-600">
              <T
                textKey="account.profile.email.changeNotice"
                fallback="Il cambio email verrà gestito nella sezione sicurezza account."
              />
            </p>
          </div>

          <div>
            <label
              htmlFor="account-full-name"
              className="text-sm font-medium text-neutral-300"
            >
              <T
                textKey="account.profile.fields.fullName"
                fallback="Nome completo"
              />
            </label>

            <input
              id="account-full-name"
              value={formState.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              maxLength={120}
              className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
              placeholder="Nome e cognome"
            />
          </div>

          <div>
            <label
              htmlFor="account-display-name"
              className="text-sm font-medium text-neutral-300"
            >
              <T
                textKey="account.profile.fields.displayName"
                fallback="Nome visualizzato"
              />
            </label>

            <input
              id="account-display-name"
              value={formState.displayName}
              onChange={(event) =>
                updateField("displayName", event.target.value)
              }
              maxLength={80}
              className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
              placeholder="Nome che gli altri vedranno in piattaforma"
            />
          </div>

          <div>
            <label
              htmlFor="account-website"
              className="text-sm font-medium text-neutral-300"
            >
              <T textKey="account.profile.fields.website" fallback="Sito" />
            </label>

            <input
              id="account-website"
              value={formState.websiteUrl}
              onChange={(event) =>
                updateField("websiteUrl", event.target.value)
              }
              maxLength={200}
              className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
              placeholder="https://..."
            />
          </div>

          <div>
            <label
              htmlFor="account-instagram"
              className="text-sm font-medium text-neutral-300"
            >
              <T
                textKey="account.profile.fields.instagram"
                fallback="Instagram / social"
              />
            </label>

            <input
              id="account-instagram"
              value={formState.instagramUrl}
              onChange={(event) =>
                updateField("instagramUrl", event.target.value)
              }
              maxLength={200}
              className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
              placeholder="@profilo oppure URL"
            />
          </div>

          <div>
            <label
              htmlFor="account-bio"
              className="text-sm font-medium text-neutral-300"
            >
              <T textKey="account.profile.fields.bio" fallback="Bio" />
            </label>

            <textarea
              id="account-bio"
              value={formState.bio}
              onChange={(event) => updateField("bio", event.target.value)}
              maxLength={800}
              rows={5}
              className="mt-2 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm leading-6 text-neutral-100 outline-none transition focus:border-neutral-500"
              placeholder="Una breve descrizione del tuo profilo, progetto o spazio."
            />

            <p className="mt-2 text-xs text-neutral-600">
              {formState.bio.length}/800{" "}
              <T
                textKey="account.profile.bio.characters"
                fallback="caratteri"
              />
            </p>
          </div>

          <div className="rounded-2xl border border-amber-900/70 bg-amber-950/20 p-4">
            <label
              htmlFor="account-current-password"
              className="text-sm font-medium text-amber-100"
            >
              <T
                textKey="account.profile.security.currentPassword"
                fallback="Password attuale"
              />
            </label>

            <input
              id="account-current-password"
              type="password"
              autoComplete="current-password"
              value={formState.currentPassword}
              onChange={(event) =>
                updateField("currentPassword", event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-amber-900/70 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-500"
              placeholder="Inserisci la password per confermare"
            />

            <p className="mt-2 text-xs leading-5 text-amber-200/70">
              <T
                textKey="account.profile.security.passwordNotice"
                fallback="Le modifiche vengono salvate solo se la password è corretta."
              />
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <T
                  textKey="account.profile.actions.saving"
                  fallback="Salvataggio..."
                />
              ) : (
                <T
                  textKey="account.profile.actions.save"
                  fallback="Salva modifiche"
                />
              )}
            </button>

            <button
              type="button"
              onClick={cancelEdit}
              disabled={isPending}
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <T
                textKey="account.profile.actions.cancel"
                fallback="Annulla"
              />
            </button>
          </div>
        </form>
      )}
    </article>
  );
}