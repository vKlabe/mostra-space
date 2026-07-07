"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

type EditableProfile = {
  email: string;
  full_name: string | null;
  display_name: string | null;
  website_url: string | null;
  instagram_url: string | null;
  bio: string | null;
};

type AccountProfileFormProps = {
  profile: EditableProfile;
};

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
            Dati account
          </h2>

          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Modifica i dati visibili del tuo profilo. Per confermare devi
            inserire la password attuale.
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
            Modifica dati
          </button>
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
            <dt className="text-neutral-500">Email</dt>
            <dd className="mt-1 break-all text-neutral-200">
              {profile.email || "Non disponibile"}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">Nome completo</dt>
            <dd className="mt-1 text-neutral-200">
              {profile.full_name || "Non inserito"}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">Nome visualizzato</dt>
            <dd className="mt-1 text-neutral-200">
              {profile.display_name || "Non inserito"}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">Sito</dt>
            <dd className="mt-1 break-all text-neutral-200">
              {profile.website_url || "Non inserito"}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">Instagram / social</dt>
            <dd className="mt-1 break-all text-neutral-200">
              {profile.instagram_url || "Non inserito"}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">Bio</dt>
            <dd className="mt-1 whitespace-pre-line text-neutral-200">
              {profile.bio || "Non inserita"}
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
              Email
            </label>

            <input
              id="account-email"
              value={profile.email || ""}
              disabled
              className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-500"
            />

            <p className="mt-2 text-xs leading-5 text-neutral-600">
              Il cambio email verrà gestito nella sezione sicurezza account.
            </p>
          </div>

          <div>
            <label
              htmlFor="account-full-name"
              className="text-sm font-medium text-neutral-300"
            >
              Nome completo
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
              Nome visualizzato
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
              Sito
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
              Instagram / social
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
              Bio
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
              {formState.bio.length}/800 caratteri
            </p>
          </div>

          <div className="rounded-2xl border border-amber-900/70 bg-amber-950/20 p-4">
            <label
              htmlFor="account-current-password"
              className="text-sm font-medium text-amber-100"
            >
              Password attuale
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
              Le modifiche vengono salvate solo se la password è corretta.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Salvataggio..." : "Salva modifiche"}
            </button>

            <button
              type="button"
              onClick={cancelEdit}
              disabled={isPending}
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annulla
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
