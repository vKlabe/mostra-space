"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CreateArtworkFormProps = {
  ownerId: string;
};

export default function CreateArtworkForm({ ownerId }: CreateArtworkFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [year, setYear] = useState("");
  const [technique, setTechnique] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isForSale, setIsForSale] = useState(true);
  const [isPublic, setIsPublic] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCreateArtwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    const cleanTitle = title.trim();
    const cleanImageUrl = imageUrl.trim();

    if (!cleanTitle) {
      setErrorMessage("Inserisci il titolo dell’opera.");
      setLoading(false);
      return;
    }

    if (!cleanImageUrl) {
      setErrorMessage(
        "Inserisci un URL immagine. Nella prossima fase lo sostituiremo con upload reale."
      );
      setLoading(false);
      return;
    }

    const parsedPrice =
      price.trim().length > 0 ? Number(price.replace(",", ".")) : null;

    if (parsedPrice !== null && Number.isNaN(parsedPrice)) {
      setErrorMessage("Il prezzo deve essere un numero valido.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("artworks")
      .insert({
        owner_id: ownerId,
        title: cleanTitle,
        artist_name: artistName.trim() || null,
        year: year.trim() || null,
        technique: technique.trim() || null,
        dimensions: dimensions.trim() || null,
        price: parsedPrice,
        currency: currency.trim() || "EUR",
        description: description.trim() || null,
        image_url: cleanImageUrl,
        thumbnail_url: null,
        is_for_sale: isForSale,
        is_public: isPublic,
      })
      .select("id, title")
      .single();

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setTitle("");
    setArtistName("");
    setYear("");
    setTechnique("");
    setDimensions("");
    setPrice("");
    setCurrency("EUR");
    setDescription("");
    setImageUrl("");
    setIsForSale(true);
    setIsPublic(false);

    setSuccessMessage(`Opera "${data.title}" creata correttamente.`);

    setLoading(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleCreateArtwork}
      className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
    >
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
        Nuova opera
      </p>

      <h2 className="text-2xl font-medium">Aggiungi opera</h2>

      <p className="mt-3 text-sm leading-6 text-neutral-400">
        Per ora inseriamo un URL immagine manuale. Nella prossima fase
        collegheremo Supabase Storage per caricare direttamente i file.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="block text-sm text-neutral-300">
            Titolo opera *
          </label>

          <input
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
            placeholder="Es. Senza titolo"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-300">Artista</label>

          <input
            type="text"
            value={artistName}
            onChange={(event) => setArtistName(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
            placeholder="Es. Mario Rossi"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-neutral-300">Anno</label>

            <input
              type="text"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
              placeholder="Es. 2024"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">Tecnica</label>

            <input
              type="text"
              value={technique}
              onChange={(event) => setTechnique(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
              placeholder="Es. Acrilico su tela"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-300">Dimensioni</label>

          <input
            type="text"
            value={dimensions}
            onChange={(event) => setDimensions(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
            placeholder="Es. 100 × 80 cm"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_120px]">
          <div>
            <label className="block text-sm text-neutral-300">Prezzo</label>

            <input
              type="text"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
              placeholder="Es. 1200"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">Valuta</label>

            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-300">
            URL immagine *
          </label>

          <input
            type="url"
            required
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
            placeholder="https://..."
          />

          <p className="mt-2 text-xs text-neutral-500">
            Temporaneo: nella fase successiva caricheremo immagini direttamente
            su Supabase Storage.
          </p>
        </div>

        <div>
          <label className="block text-sm text-neutral-300">Descrizione</label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-2 min-h-28 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
            placeholder="Breve descrizione dell’opera..."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={isForSale}
              onChange={(event) => setIsForSale(event.target.checked)}
            />
            Opera in vendita
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
            />
            Visibile pubblicamente
          </label>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-100">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-100">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creazione..." : "Aggiungi opera"}
        </button>
      </div>
    </form>
  );
}