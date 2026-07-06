"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ArtworkInventoryItem = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
  technique: string | null;
  price: number | string | null;
  currency: string | null;
  image_url: string;
  thumbnail_url: string | null;
  is_for_sale: boolean;
  created_at: string;
  updated_at: string | null;
};

type ArtworkInventoryTableProps = {
  artworks: ArtworkInventoryItem[];
};

type RowDraft = {
  title: string;
  artist_name: string;
  year: string;
  technique: string;
  price: string;
  currency: string;
  is_for_sale: boolean;
};

function toDraft(artwork: ArtworkInventoryItem): RowDraft {
  return {
    title: artwork.title || "",
    artist_name: artwork.artist_name || "",
    year: artwork.year || "",
    technique: artwork.technique || "",
    price:
      artwork.price === null || artwork.price === undefined
        ? ""
        : String(artwork.price),
    currency: artwork.currency || "EUR",
    is_for_sale: Boolean(artwork.is_for_sale),
  };
}

function getRowKey(artworkId: string, field: keyof RowDraft) {
  return `${artworkId}:${field}`;
}

export default function ArtworkInventoryTable({
  artworks,
}: ArtworkInventoryTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialDrafts = useMemo(() => {
    const entries = artworks.map((artwork) => [artwork.id, toDraft(artwork)]);

    return Object.fromEntries(entries) as Record<string, RowDraft>;
  }, [artworks]);

  const [drafts, setDrafts] = useState<Record<string, RowDraft>>(initialDrafts);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function updateDraft(
    artworkId: string,
    field: keyof RowDraft,
    value: string | boolean
  ) {
    setDrafts((current) => ({
      ...current,
      [artworkId]: {
        ...current[artworkId],
        [field]: value,
      },
    }));
  }

  async function saveArtwork(artworkId: string) {
    const draft = drafts[artworkId];

    if (!draft) {
      return;
    }

    if (!draft.title.trim()) {
      setMessage({
        type: "error",
        text: "Il titolo non può essere vuoto.",
      });

      return;
    }

    setSavingId(artworkId);
    setMessage(null);

    try {
      const response = await fetch(`/api/dashboard/artworks/${artworkId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: draft.title,
          artist_name: draft.artist_name,
          year: draft.year,
          technique: draft.technique,
          price: draft.price,
          currency: draft.currency,
          is_for_sale: draft.is_for_sale,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "Errore durante il salvataggio dell'opera."
        );
      }

      setMessage({
        type: "success",
        text: "Opera aggiornata correttamente.",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Errore durante il salvataggio dell'opera.",
      });
    } finally {
      setSavingId(null);
    }
  }

  async function deleteArtwork(artwork: ArtworkInventoryItem) {
    const confirmed = window.confirm(
      `Eliminare definitivamente "${artwork.title}"? L'opera verrà rimossa anche dalle gallerie in cui è stata inserita.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(artwork.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/dashboard/artworks/${artwork.id}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "Errore durante l'eliminazione dell'opera."
        );
      }

      setDrafts((current) => {
        const next = { ...current };
        delete next[artwork.id];
        return next;
      });

      setMessage({
        type: "success",
        text: "Opera eliminata correttamente.",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Errore durante l'eliminazione dell'opera.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (artworks.length === 0) {
    return (
      <div className="rounded-[2rem] border border-[var(--museum-border-soft)] bg-[var(--museum-panel)] p-8">
        <p className="museum-label">Inventario vuoto</p>
        <h2 className="mt-4 font-serif text-3xl text-[var(--museum-ivory)]">
          Non ci sono ancora opere.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--museum-stone-muted)]">
          Carica la prima opera dall'archivio opere, poi torna qui per
          modificarne rapidamente i dati principali.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-[2rem] border border-[var(--museum-border-soft)] bg-[var(--museum-panel)] p-4 shadow-2xl shadow-black/20 md:p-6">
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="museum-label">Inventario rapido</p>
          <h2 className="mt-3 font-serif text-3xl text-[var(--museum-ivory)]">
            Modifica opere
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--museum-stone-muted)]">
            Aggiorna i dati essenziali delle opere senza entrare ogni volta
            nella scheda completa.
          </p>
        </div>

        <div className="text-sm text-[var(--museum-stone-muted)]">
          Totale opere:{" "}
          <span className="text-[var(--museum-ivory-soft)]">
            {artworks.length}
          </span>
        </div>
      </div>

      {message && (
        <div
          className={
            message.type === "success"
              ? "mb-5 rounded-2xl border border-emerald-900 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-200"
              : "mb-5 rounded-2xl border border-red-900 bg-red-950/35 px-4 py-3 text-sm text-red-200"
          }
        >
          {message.text}
        </div>
      )}

      <div className="rounded-[1.5rem] border border-[var(--museum-border-soft)]">
        <div className="border-b border-[var(--museum-border-soft)] bg-black/25 px-4 py-3 text-xs text-[var(--museum-stone-muted)]">
          Ogni riga ha il suo scorrimento orizzontale: così puoi lavorare su
          una singola opera senza perdere il riferimento visivo.
        </div>

        <div className="overflow-x-auto border-b border-[var(--museum-border-soft)] bg-black/30">
          <div className="grid min-w-[1180px] grid-cols-[72px_220px_180px_100px_250px_150px_110px_120px_170px] items-center gap-4 px-4 py-4 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--museum-bronze)]">
            <div className="font-semibold">Opera</div>
            <div className="font-semibold">Titolo</div>
            <div className="font-semibold">Artista</div>
            <div className="font-semibold">Anno</div>
            <div className="font-semibold">Tecnica</div>
            <div className="font-semibold">Prezzo</div>
            <div className="font-semibold">Valuta</div>
            <div className="font-semibold">Vendita</div>
            <div className="font-semibold">Azioni</div>
          </div>
        </div>

        <div>
          {artworks.map((artwork) => {
            const draft = drafts[artwork.id] || toDraft(artwork);
            const imageUrl = artwork.thumbnail_url || artwork.image_url;
            const isBusy =
              savingId === artwork.id ||
              deletingId === artwork.id ||
              isPending;

            return (
              <div
                key={artwork.id}
                className="border-t border-[var(--museum-border-soft)] first:border-t-0"
              >
                <div className="overflow-x-auto [scrollbar-gutter:stable]">
                  <div className="grid min-w-[1180px] grid-cols-[72px_220px_180px_100px_250px_150px_110px_120px_170px] items-start gap-4 px-4 py-5">
                    <div>
                      <div className="h-16 w-16 overflow-hidden rounded-2xl border border-[var(--museum-border-soft)] bg-black">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={artwork.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[0.65rem] uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                            No img
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <input
                        aria-label="Titolo opera"
                        className="w-full rounded-2xl border border-[var(--museum-border-soft)] bg-black/55 px-3 py-2 text-sm text-[var(--museum-ivory)] outline-none transition focus:border-[var(--museum-bronze)]"
                        value={draft.title}
                        onChange={(event) =>
                          updateDraft(artwork.id, "title", event.target.value)
                        }
                      />
                    </div>

                    <div>
                      <input
                        aria-label="Artista"
                        className="w-full rounded-2xl border border-[var(--museum-border-soft)] bg-black/55 px-3 py-2 text-sm text-[var(--museum-ivory)] outline-none transition focus:border-[var(--museum-bronze)]"
                        value={draft.artist_name}
                        onChange={(event) =>
                          updateDraft(
                            artwork.id,
                            "artist_name",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div>
                      <input
                        aria-label="Anno"
                        className="w-full rounded-2xl border border-[var(--museum-border-soft)] bg-black/55 px-3 py-2 text-sm text-[var(--museum-ivory)] outline-none transition focus:border-[var(--museum-bronze)]"
                        value={draft.year}
                        onChange={(event) =>
                          updateDraft(artwork.id, "year", event.target.value)
                        }
                      />
                    </div>

                    <div>
                      <input
                        aria-label="Tecnica"
                        className="w-full rounded-2xl border border-[var(--museum-border-soft)] bg-black/55 px-3 py-2 text-sm text-[var(--museum-ivory)] outline-none transition focus:border-[var(--museum-bronze)]"
                        value={draft.technique}
                        onChange={(event) =>
                          updateDraft(
                            artwork.id,
                            "technique",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div>
                      <input
                        aria-label="Prezzo"
                        inputMode="decimal"
                        className="w-full rounded-2xl border border-[var(--museum-border-soft)] bg-black/55 px-3 py-2 text-sm text-[var(--museum-ivory)] outline-none transition focus:border-[var(--museum-bronze)]"
                        value={draft.price}
                        onChange={(event) =>
                          updateDraft(artwork.id, "price", event.target.value)
                        }
                      />
                    </div>

                    <div>
                      <input
                        aria-label="Valuta"
                        className="w-full rounded-2xl border border-[var(--museum-border-soft)] bg-black/55 px-3 py-2 text-sm uppercase text-[var(--museum-ivory)] outline-none transition focus:border-[var(--museum-bronze)]"
                        maxLength={3}
                        value={draft.currency}
                        onChange={(event) =>
                          updateDraft(
                            artwork.id,
                            "currency",
                            event.target.value.toUpperCase()
                          )
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={getRowKey(artwork.id, "is_for_sale")}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[var(--museum-border-soft)] bg-black/35 px-3 py-2 text-sm text-[var(--museum-ivory-soft)]"
                      >
                        <input
                          id={getRowKey(artwork.id, "is_for_sale")}
                          type="checkbox"
                          checked={draft.is_for_sale}
                          onChange={(event) =>
                            updateDraft(
                              artwork.id,
                              "is_for_sale",
                              event.target.checked
                            )
                          }
                        />
                        Sì
                      </label>
                    </div>

                    <div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => saveArtwork(artwork.id)}
                          className="rounded-full bg-[var(--museum-bronze)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingId === artwork.id ? "Salvo..." : "Salva"}
                        </button>

                        <a
                          href={`/dashboard/opere/${artwork.id}`}
                          className="rounded-full border border-[var(--museum-border-soft)] px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--museum-ivory-soft)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
                        >
                          Dettaglio
                        </a>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => deleteArtwork(artwork)}
                          className="rounded-full border border-red-900 bg-red-950/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-200 transition hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === artwork.id ? "Elimino..." : "Elimina"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>      </div>
    </section>
  );
}
