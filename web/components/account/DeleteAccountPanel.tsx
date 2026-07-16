"use client";

import { useState } from "react";
import T from "@/components/i18n/T";

type DeleteAccountPanelProps = {
  email: string;
};

export default function DeleteAccountPanel({ email }: DeleteAccountPanelProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const canDelete = currentPassword.length > 0 && confirmation === "CANCELLA";

  async function handleDeleteAccount() {
    setMessage(null);

    if (!canDelete) {
      setMessage({
        type: "error",
        text: "Inserisci la password e scrivi CANCELLA per confermare.",
      });
      return;
    }

    const confirmed = window.confirm(
      "Confermi la cancellazione definitiva del tuo account? Verranno eliminate gallerie, opere, eventi, notifiche e dati collegati."
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          confirmation,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage({
          type: "error",
          text: data?.error || "Errore cancellazione account.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Account eliminato definitivamente. Reindirizzamento...",
      });

      window.location.href = "/";
    } catch {
      setMessage({
        type: "error",
        text: "Errore di rete durante cancellazione account.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-red-950 bg-red-950/15 p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-red-300">
        <T
          textKey="account.deleteAccount.header.label"
          fallback="Zona pericolosa"
        />
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
        <div>
          <h2 className="text-2xl font-semibold text-red-100">
            <T
              textKey="account.deleteAccount.header.title"
              fallback="Cancella account"
            />
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-red-100/75">
            <T
              textKey="account.deleteAccount.header.description"
              fallback="Questa operazione è definitiva. Cancellerà il tuo account, le gallerie, le opere, gli eventi, le notifiche, i preferiti, le richieste, la presenza, la chat e i file immagine collegati. Per confermare devi inserire la password attuale e scrivere CANCELLA."
            />
          </p>

          {email && (
            <p className="mt-3 text-xs text-red-100/55">
              <T
                textKey="account.deleteAccount.account.label"
                fallback="Account:"
              />{" "}
              <span className="text-red-100">{email}</span>
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-red-950 bg-neutral-950 p-4">
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-red-300/80">
              <T
                textKey="account.deleteAccount.fields.currentPassword"
                fallback="Password attuale"
              />
            </span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              className="rounded-2xl border border-red-950 bg-black px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-red-500"
            />
          </label>

          <label className="mt-4 grid gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-red-300/80">
              <T
                textKey="account.deleteAccount.fields.textConfirmation"
                fallback="Conferma testuale"
              />
            </span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Scrivi CANCELLA"
              className="rounded-2xl border border-red-950 bg-black px-4 py-3 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-700 focus:border-red-500"
            />
          </label>

          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={isDeleting || !canDelete}
            className="mt-5 w-full rounded-full bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDeleting ? (
              <T
                textKey="account.deleteAccount.actions.deleting"
                fallback="Eliminazione account..."
              />
            ) : (
              <T
                textKey="account.deleteAccount.actions.deletePermanently"
                fallback="Cancella definitivamente"
              />
            )}
          </button>

          {message && (
            <p
              className={
                message.type === "success"
                  ? "mt-3 text-sm text-emerald-300"
                  : "mt-3 text-sm text-red-300"
              }
            >
              {message.text}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}