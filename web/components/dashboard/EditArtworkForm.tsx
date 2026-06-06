"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EditArtworkFormProps = {
  artwork: {
    id: string;
    title: string;
    artist_name: string | null;
    year: string | null;
    technique: string | null;
    dimensions: string | null;
    width_cm: number | null;
    height_cm: number | null;
    depth_cm: number | null;
    description: string | null;
    image_url: string;
    price: string | null;
    currency: string | null;
    is_for_sale: boolean;
    is_public: boolean;
  };
};

function stringifyNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export default function EditArtworkForm({ artwork }: EditArtworkFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(artwork.title);
  const [artistName, setArtistName] = useState(artwork.artist_name || "");
  const [year, setYear] = useState(artwork.year || "");
  const [technique, setTechnique] = useState(artwork.technique || "");
  const [dimensions, setDimensions] = useState(artwork.dimensions || "");
  const [widthCm, setWidthCm] = useState(stringifyNumber(artwork.width_cm));
  const [heightCm, setHeightCm] = useState(stringifyNumber(artwork.height_cm));
  const [depthCm, setDepthCm] = useState(stringifyNumber(artwork.depth_cm));
  const [description, setDescription] = useState(artwork.description || "");
  const [price, setPrice] = useState(artwork.price || "");
  const [currency, setCurrency] = useState(artwork.currency || "EUR");
  const [isForSale, setIsForSale] = useState(artwork.is_for_sale);
  const [isPublic, setIsPublic] = useState(artwork.is_public);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/dashboard/artworks/${artwork.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          artistName,
          year,
          technique,
          dimensions,
          widthCm,
          heightCm,
          depthCm,
          description,
          price,
          currency,
          isForSale,
          isPublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore aggiornamento opera.");
        return;
      }

      setMessage("Opera aggiornata correttamente.");
      router.refresh();
    } catch {
      setMessage("Errore di rete durante aggiornamento opera.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
    >
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
          <img
            src={artwork.image_url}
            alt={artwork.title}
            className="h-64 w-full object-cover lg:h-full"
          />
        </div>

        <div>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Opera
              </p>

              <h2 className="text-2xl font-medium">Modifica dati opera</h2>

              <p className="mt-3 text-sm leading-6 text-neutral-400">
                Questi dati vengono letti da Unity e mostrati nella scheda
                informativa dell opera.
              </p>
            </div>

            <span
              className={
                isPublic
                  ? "rounded-full border border-green-900 bg-green-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-green-300"
                  : "rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-400"
              }
            >
              {isPublic ? "pubblica" : "privata"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-neutral-300">
                Titolo
              </label>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-300">
                Artista
              </label>

              <input
                value={artistName}
                onChange={(event) => setArtistName(event.target.value)}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-300">
                Anno
              </label>

              <input
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-300">
                Tecnica
              </label>

              <input
                value={technique}
                onChange={(event) => setTechnique(event.target.value)}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-300">
                Dimensioni testuali
              </label>

              <input
                value={dimensions}
                onChange={(event) => setDimensions(event.target.value)}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                placeholder="100 x 80 cm"
              />
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 md:col-span-2">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-neutral-500">
                Dimensioni reali per editor 3D
              </p>

              <p className="mb-4 text-sm leading-6 text-neutral-400">
                Questi valori determinano la proporzione iniziale dell opera
                dentro Unity. Se larghezza o altezza mancano, l editor userà 50
                x 50 cm.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm text-neutral-300">
                    Larghezza cm
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={widthCm}
                    onChange={(event) => setWidthCm(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                    placeholder="70"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-neutral-300">
                    Altezza cm
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={heightCm}
                    onChange={(event) => setHeightCm(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-neutral-300">
                    Profondità cm
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={depthCm}
                    onChange={(event) => setDepthCm(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                    placeholder="2"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-300">
                Prezzo
              </label>

              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                placeholder="2500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-300">
                Valuta
              </label>

              <input
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                placeholder="EUR"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-neutral-300">
                Descrizione
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-32 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={isForSale}
                onChange={(event) => setIsForSale(event.target.checked)}
              />
              Opera in vendita
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
              />
              Opera pubblica
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Salvataggio..." : "Salva opera"}
            </button>

            {message && (
              <p className="text-sm text-neutral-300">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}