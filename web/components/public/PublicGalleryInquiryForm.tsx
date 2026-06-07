"use client";

import { useEffect, useMemo, useState } from "react";

type PublicGalleryInquiryFormProps = {
  galleryId: string;
  galleryTitle: string;
  artworkId?: string | null;
  galleryArtworkId?: string | null;
  artworkTitle?: string | null;
};

function buildInitialMessage(galleryTitle: string, artworkTitle?: string | null) {
  if (artworkTitle) {
    return `Vorrei ricevere informazioni sull'opera "${artworkTitle}" esposta nella galleria "${galleryTitle}".`;
  }

  return `Vorrei ricevere informazioni sulla galleria "${galleryTitle}".`;
}

export default function PublicGalleryInquiryForm({
  galleryId,
  galleryTitle,
  artworkId = null,
  galleryArtworkId = null,
  artworkTitle = null,
}: PublicGalleryInquiryFormProps) {
  const initialMessage = useMemo(
    () => buildInitialMessage(galleryTitle, artworkTitle),
    [galleryTitle, artworkTitle]
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [website, setWebsite] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">(
    ""
  );

  useEffect(() => {
    setMessage(initialMessage);
    setFeedback("");
    setFeedbackType("");
  }, [initialMessage]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!privacyAccepted) {
      setFeedbackType("error");
      setFeedback(
        "Devi dichiarare di aver letto l'informativa privacy per inviare la richiesta."
      );
      return;
    }

    setIsLoading(true);
    setFeedback("");
    setFeedbackType("");

    try {
      const response = await fetch("/api/public/gallery-inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          galleryId,
          artworkId,
          galleryArtworkId,
          name,
          email,
          message,
          website,
          privacyAccepted,
          marketingConsent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedbackType("error");
        setFeedback(data.error || "Errore invio richiesta.");
        return;
      }

      setFeedbackType("success");
      setFeedback(
        "Richiesta inviata correttamente. Il gallerista potrà ricontattarti."
      );

      setName("");
      setEmail("");
      setWebsite("");
      setPrivacyAccepted(false);
      setMarketingConsent(false);
      setMessage(initialMessage);
    } catch {
      setFeedbackType("error");
      setFeedback("Errore di rete durante invio richiesta.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative z-20 rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
    >
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
        Richieste
      </p>

      <h2 className="text-2xl font-medium">
        {artworkTitle
          ? "Richiedi informazioni sull'opera"
          : "Richiedi informazioni"}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
        {artworkTitle
          ? `Lascia i tuoi dati per essere ricontattato riguardo "${artworkTitle}".`
          : "Lascia i tuoi dati per essere ricontattato dal gallerista."}
      </p>

      {artworkTitle && (
        <div className="mt-5 rounded-2xl border border-blue-900 bg-blue-950/30 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-blue-300">
            Opera selezionata
          </p>

          <p className="mt-2 text-sm text-neutral-100">{artworkTitle}</p>

          {galleryArtworkId && (
            <p className="mt-1 break-all text-xs text-neutral-500">
              ID allestimento: {galleryArtworkId}
            </p>
          )}
        </div>
      )}

      <div className="hidden" aria-hidden="true">
        <label>
          Sito web
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-neutral-300">Nome</label>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Nome e cognome"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-neutral-300">Email</label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="email@example.com"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm text-neutral-300">
            Messaggio
          </label>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={isLoading}
            className="min-h-32 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Scrivi la tua richiesta"
          />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm leading-6 text-neutral-300">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(event) => setPrivacyAccepted(event.target.checked)}
            disabled={isLoading}
            className="mt-1"
            required
          />

          <span>
            Dichiaro di aver letto l{"'"}
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-neutral-100 underline underline-offset-4 hover:text-white"
            >
              informativa privacy
            </a>{" "}
            e autorizzo il trattamento dei dati inseriti per essere
            ricontattato in merito alla mia richiesta.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm leading-6 text-neutral-400">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(event) => setMarketingConsent(event.target.checked)}
            disabled={isLoading}
            className="mt-1"
          />

          <span>
            Acconsento facoltativamente a ricevere comunicazioni su mostre,
            opere e aggiornamenti della galleria. Potrò revocare il consenso in
            qualsiasi momento.
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isLoading || !privacyAccepted}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Invio..." : "Invia richiesta"}
        </button>

        {feedback && (
          <p
            className={
              feedbackType === "success"
                ? "text-sm text-green-300"
                : "text-sm text-red-300"
            }
          >
            {feedback}
          </p>
        )}
      </div>
    </form>
  );
}