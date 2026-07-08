"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UserRole = "user" | "gallerist" | "admin";
type UserPlan = "free" | "pro" | "business" | "institution";

type AdminUserControlsProps = {
  userId: string;
  currentRole: UserRole;
  currentPlan: UserPlan;
  isCurrentAdminUser: boolean;
};

const roleOptions: Array<{
  value: UserRole;
  label: string;
}> = [
  {
    value: "user",
    label: "User",
  },
  {
    value: "gallerist",
    label: "Gallerist",
  },
  {
    value: "admin",
    label: "Admin",
  },
];

const planOptions: Array<{
  value: UserPlan;
  label: string;
}> = [
  {
    value: "free",
    label: "Free",
  },
  {
    value: "pro",
    label: "Pro",
  },
  {
    value: "business",
    label: "Business",
  },
  {
    value: "institution",
    label: "Institution",
  },
];

export default function AdminUserControls({
  userId,
  currentRole,
  currentPlan,
  isCurrentAdminUser,
}: AdminUserControlsProps) {
  const router = useRouter();

  const [role, setRole] = useState<UserRole>(currentRole);
  const [plan, setPlan] = useState<UserPlan>(currentPlan);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteBox, setShowDeleteBox] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [message, setMessage] = useState("");

  const hasChanges = role !== currentRole || plan !== currentPlan;
  const canDelete = !isCurrentAdminUser && deleteConfirmation === "ELIMINA";

  async function handleSave() {
    if (!hasChanges) {
      setMessage("Nessuna modifica da salvare.");
      return;
    }

    if (isCurrentAdminUser && role !== "admin") {
      setMessage(
        "Non puoi togliere il ruolo admin al tuo stesso account da questa schermata."
      );
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          plan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore aggiornamento utente.");
        return;
      }

      setMessage("Utente aggiornato correttamente.");
      router.refresh();
    } catch {
      setMessage("Errore di rete durante aggiornamento utente.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (isCurrentAdminUser) {
      setMessage(
        "Non puoi cancellare il tuo stesso account dalla control room admin."
      );
      return;
    }

    if (deleteConfirmation !== "ELIMINA") {
      setMessage("Scrivi ELIMINA per confermare la cancellazione account.");
      return;
    }

    const confirmed = window.confirm(
      "Confermi la cancellazione definitiva dell'account? Verranno eliminate gallerie, opere, eventi, notifiche e dati collegati."
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(data?.error || "Errore eliminazione account.");
        return;
      }

      setMessage("Account eliminato definitivamente.");
      router.refresh();
    } catch {
      setMessage("Errore di rete durante eliminazione account.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Ruolo
          </label>

          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            disabled={isLoading || isCurrentAdminUser}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {isCurrentAdminUser && (
            <p className="mt-2 text-xs leading-5 text-neutral-600">
              Il tuo ruolo admin non puo essere modificato da qui.
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Piano
          </label>

          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value as UserPlan)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {planOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Salvataggio..." : "Salva modifiche"}
        </button>

        <button
          type="button"
          onClick={() => setShowDeleteBox((current) => !current)}
          disabled={isLoading || isDeleting || isCurrentAdminUser}
          className="rounded-full border border-red-900 bg-red-950/25 px-5 py-2 text-sm font-medium text-red-200 transition hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Delete account
        </button>

        {message && <p className="text-sm text-neutral-400">{message}</p>}
      </div>

      {isCurrentAdminUser && (
        <p className="mt-3 text-xs leading-5 text-neutral-600">
          Per sicurezza non puoi cancellare il tuo stesso account da questa
          schermata admin.
        </p>
      )}

      {showDeleteBox && !isCurrentAdminUser && (
        <div className="mt-5 rounded-2xl border border-red-950 bg-red-950/20 p-4">
          <p className="text-sm font-medium text-red-100">
            Cancellazione definitiva account
          </p>

          <p className="mt-2 text-xs leading-5 text-red-200/80">
            Verranno eliminate gallerie, opere, eventi, notifiche, preferiti,
            richieste, presenza, chat e file immagine collegati all'account.
            Scrivi ELIMINA per confermare.
          </p>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder="Scrivi ELIMINA"
              className="rounded-2xl border border-red-950 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-red-500"
            />

            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeleting || !canDelete}
              className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isDeleting ? "Eliminazione..." : "Conferma delete account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
