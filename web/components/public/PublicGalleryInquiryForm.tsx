"use client";

import { useId, useState } from "react";
import T from "@/components/i18n/T";
import { usePublicUxCopy } from "@/components/public/PublicUxText";

type PublicGalleryInquiryFormProps = {
  galleryId: string;
  galleryTitle: string;
  artworkId?: string | null;
  galleryArtworkId?: string | null;
  artworkTitle?: string | null;
};

export default function PublicGalleryInquiryForm({
  galleryId,
  galleryTitle,
  artworkId = null,
  galleryArtworkId = null,
  artworkTitle = null,
}: PublicGalleryInquiryFormProps) {
  const formId = useId();
  const copy = usePublicUxCopy();
  const messageTemplate = artworkTitle ? copy.inquiryArtwork : copy.inquiryGallery;
  const initialMessage = messageTemplate.replace(/\{(gallery|artwork)\}/g, (_, field) =>
    field === "gallery" ? galleryTitle : artworkTitle || ""
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editedMessage, setEditedMessage] = useState<string | null>(null);
  const message = editedMessage ?? initialMessage;
  const [website, setWebsite] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">(
    ""
  );

  const requestContext = JSON.stringify([galleryId, artworkId, galleryTitle, artworkTitle]);
  const [lastRequestContext, setLastRequestContext] = useState(requestContext);
  if (requestContext !== lastRequestContext) {
    setLastRequestContext(requestContext);
    setEditedMessage(null);
    setFeedback("");
    setFeedbackType("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!privacyAccepted) {
      setFeedbackType("error");
      setFeedback(
        copy.inquiryPrivacyError
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
        setFeedback(data.error || copy.inquirySendError);
        return;
      }

      setFeedbackType("success");
      setFeedback(copy.inquirySuccess);

      setName("");
      setEmail("");
      setWebsite("");
      setPrivacyAccepted(false);
      setMarketingConsent(false);
      setEditedMessage(null);
    } catch {
      setFeedbackType("error");
      setFeedback(copy.inquiryNetworkError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={`${formId}-title`}
      aria-busy={isLoading}
      className="museum-card relative z-20 min-w-0 overflow-hidden rounded-[2rem] p-4 sm:p-6"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            <T
              textKey="gallery.inquiry.label"
              fallback="Richiesta informazioni"
            />
          </p>

          <h2 id={`${formId}-title`} className="font-editorial text-3xl font-medium text-[var(--museum-ivory)]">
            {artworkTitle ? (
              <T
                textKey="gallery.inquiry.artworkTitle"
                fallback="Parla con la galleria di quest’opera"
              />
            ) : (
              <T
                textKey="gallery.inquiry.galleryTitle"
                fallback="Contatta la galleria"
              />
            )}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
            {artworkTitle ? (
              <>
                <T
                  textKey="gallery.inquiry.artworkDescriptionPrefix"
                  fallback="Lascia i tuoi dati per ricevere informazioni su"
                />{" "}
                &quot;{artworkTitle}&quot;.
              </>
            ) : (
              <T
                textKey="gallery.inquiry.galleryDescription"
                fallback="Invia una richiesta diretta per informazioni su opere, disponibilità, prezzi o visite."
              />
            )}
          </p>
        </div>

        <span className="inline-flex w-fit rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
          <T
            textKey="gallery.inquiry.responseBadge"
            fallback="Risposta dal gallerista"
          />
        </span>
      </div>

      {artworkTitle && (
        <div className="mt-6 rounded-2xl border border-blue-900 bg-blue-950/30 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-blue-300">
            <T
              textKey="gallery.inquiry.selectedArtwork"
              fallback="Opera selezionata"
            />
          </p>

          <p className="mt-2 text-base font-medium text-neutral-100">
            {artworkTitle}
          </p>

          {galleryArtworkId && (
            <p className="mt-2 break-all text-xs leading-5 text-neutral-500">
              <T
                textKey="gallery.inquiry.installationId"
                fallback="ID allestimento:"
              />{" "}
              {galleryArtworkId}
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
          <label htmlFor={`${formId}-name`} className="mb-2 block text-sm text-neutral-300">
            <T textKey="gallery.inquiry.form.name" fallback="Nome" />
          </label>

          <input
            id={`${formId}-name`}
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-[var(--museum-border)] bg-neutral-950 px-4 py-3 text-base text-neutral-100 transition placeholder:text-neutral-400 focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={copy.inquiryNamePlaceholder}
            required
          />
        </div>

        <div>
          <label htmlFor={`${formId}-email`} className="mb-2 block text-sm text-neutral-300">
            <T textKey="gallery.inquiry.form.email" fallback="Email" />
          </label>

          <input
            id={`${formId}-email`}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-[var(--museum-border)] bg-neutral-950 px-4 py-3 text-base text-neutral-100 transition placeholder:text-neutral-400 focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="email@example.com"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={`${formId}-message`} className="mb-2 block text-sm text-neutral-300">
            <T textKey="gallery.inquiry.form.message" fallback="Messaggio" />
          </label>

          <textarea
            id={`${formId}-message`}
            value={message}
            onChange={(event) => setEditedMessage(event.target.value)}
            disabled={isLoading}
            className="min-h-36 w-full rounded-2xl border border-[var(--museum-border)] bg-neutral-950 px-4 py-3 text-base leading-6 text-neutral-100 transition placeholder:text-neutral-400 focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={copy.inquiryMessagePlaceholder}
          />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm leading-6 text-neutral-300 transition hover:border-neutral-700">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(event) => setPrivacyAccepted(event.target.checked)}
            disabled={isLoading}
            className="mt-1"
            required
          />

          <span>
            <T
              textKey="gallery.inquiry.privacy.prefix"
              fallback="Dichiaro di aver letto l"
            />
            {copy.inquiryPrivacyJoiner}
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-neutral-100 underline underline-offset-4 hover:text-white"
            >
              <T
                textKey="gallery.inquiry.privacy.link"
                fallback="informativa privacy"
              />
            </a>{" "}
            <T
              textKey="gallery.inquiry.privacy.suffix"
              fallback="e autorizzo il trattamento dei dati inseriti per essere ricontattato in merito alla mia richiesta."
            />
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm leading-6 text-neutral-400 transition hover:border-neutral-700">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(event) => setMarketingConsent(event.target.checked)}
            disabled={isLoading}
            className="mt-1"
          />

          <span>
            <T
              textKey="gallery.inquiry.marketingConsent"
              fallback="Acconsento facoltativamente a ricevere comunicazioni su mostre, opere e aggiornamenti della galleria. Potrò revocare il consenso in qualsiasi momento."
            />
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isLoading || !privacyAccepted}
          className="museum-button-primary min-h-11 px-6 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <T
              textKey="gallery.inquiry.actions.sending"
              fallback="Invio richiesta..."
            />
          ) : (
            <T
              textKey="gallery.inquiry.actions.send"
              fallback="Invia richiesta"
            />
          )}
        </button>

        <p className="text-xs leading-5 text-neutral-500">
          <T
            textKey="gallery.inquiry.noOnlinePayment"
            fallback="Nessun pagamento online: la richiesta verrà inviata alla galleria."
          />
        </p>
      </div>

      {feedback && (
        <div
          role={feedbackType === "success" ? "status" : "alert"}
          className={
            feedbackType === "success"
              ? "mt-5 rounded-2xl border border-green-900 bg-green-950/30 p-4 text-sm leading-6 text-green-200"
              : "mt-5 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm leading-6 text-red-200"
          }
        >
          {feedback}
        </div>
      )}
    </form>
  );
}
