"use client";

import { useEffect, useMemo, useState } from "react";

type SlotKey = "main" | "featured_1" | "featured_2" | "featured_3";

type GalleryOption = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  published_at: string | null;
};

type PublicGallerySlot = {
  slot_key: SlotKey;
  gallery_id: string | null;
  updated_at?: string | null;
};

type ApiPayload = {
  slots: PublicGallerySlot[];
  galleries: GalleryOption[];
};

const emptySlots: Record<SlotKey, string> = {
  main: "",
  featured_1: "",
  featured_2: "",
  featured_3: "",
};

function toSlotState(slots: PublicGallerySlot[]) {
  const next = { ...emptySlots };

  slots.forEach((slot) => {
    if (slot.slot_key in next) {
      next[slot.slot_key] = slot.gallery_id || "";
    }
  });

  return next;
}

export default function PublicGalleryShowcaseForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [galleries, setGalleries] = useState<GalleryOption[]>([]);
  const [slots, setSlots] = useState<Record<SlotKey, string>>(emptySlots);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedIds = useMemo(() => {
    return Object.values(slots).filter(Boolean);
  }, [slots]);

  async function loadShowcase() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/public-gallery-slots", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as Partial<ApiPayload> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Errore caricamento vetrina.");
      }

      setGalleries(payload.galleries || []);
      setSlots(toSlotState(payload.slots || []));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Errore caricamento vetrina."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShowcase();
  }, []);

  function updateSlot(slotKey: SlotKey, galleryId: string) {
    setSlots((current) => ({
      ...current,
      [slotKey]: galleryId,
    }));

    setSuccessMessage(null);
  }

  async function saveShowcase() {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/admin/public-gallery-slots", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mainGalleryId: slots.main || null,
          featuredGalleryIds: [
            slots.featured_1 || null,
            slots.featured_2 || null,
            slots.featured_3 || null,
          ],
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Errore salvataggio vetrina.");
      }

      setSuccessMessage("Vetrina pubblica aggiornata.");
      await loadShowcase();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Errore salvataggio vetrina."
      );
    } finally {
      setSaving(false);
    }
  }

  function renderSelect(slotKey: SlotKey, label: string, help: string) {
    return (
      <label className="block">
        <span className="text-sm font-medium text-[var(--museum-ivory-soft)]">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-[var(--museum-stone-muted)]">
          {help}
        </span>

        <select
          value={slots[slotKey]}
          onChange={(event) => updateSlot(slotKey, event.target.value)}
          disabled={loading || saving}
          className="mt-3 w-full rounded-2xl border border-[var(--museum-border)] bg-[var(--museum-black)] px-4 py-3 text-sm text-[var(--museum-ivory)] outline-none transition focus:border-[var(--museum-bronze)] disabled:opacity-60"
        >
          <option value="">Nessuna galleria selezionata</option>

          {galleries.map((gallery) => (
            <option key={`${slotKey}-${gallery.id}`} value={gallery.id}>
              {gallery.title} · /gallerie/{gallery.slug}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <section className="museum-card rounded-[2rem] p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="museum-label">Vetrina pubblica</p>

          <h2 className="mt-3 font-editorial text-4xl font-medium text-[var(--museum-ivory)]">
            Gallerie in evidenza
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--museum-stone)]">
            Scegli la galleria principale e le tre gallerie in evidenza della
            pagina pubblica /gallerie. Sono selezionabili solo gallerie
            pubblicate.
          </p>
        </div>

        <button
          type="button"
          onClick={loadShowcase}
          disabled={loading || saving}
          className="museum-button-secondary px-5 py-2.5"
        >
          Ricarica
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {renderSelect(
          "main",
          "Galleria principale",
          "La card grande mostrata subito dopo l’hero della pagina pubblica."
        )}

        {renderSelect(
          "featured_1",
          "In evidenza 1",
          "Prima card della sezione gallerie in evidenza."
        )}

        {renderSelect(
          "featured_2",
          "In evidenza 2",
          "Seconda card della sezione gallerie in evidenza."
        )}

        {renderSelect(
          "featured_3",
          "In evidenza 3",
          "Terza card della sezione gallerie in evidenza."
        )}
      </div>

      {selectedIds.length > new Set(selectedIds).size && (
        <p className="mt-5 rounded-2xl border border-[rgba(197,151,94,0.42)] bg-[rgba(168,121,69,0.08)] px-4 py-3 text-sm leading-6 text-[var(--museum-bronze-light)]">
          Nota: hai selezionato la stessa galleria in più posizioni. È
          consentito, ma di solito conviene variare la vetrina.
        </p>
      )}

      {error && (
        <p className="mt-5 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {successMessage}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveShowcase}
          disabled={loading || saving}
          className="museum-button-primary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Salvataggio..." : "Salva vetrina"}
        </button>

        <a
          href="/gallerie"
          target="_blank"
          rel="noreferrer"
          className="museum-button-secondary px-6 py-3"
        >
          Apri pagina pubblica
        </a>
      </div>
    </section>
  );
}
