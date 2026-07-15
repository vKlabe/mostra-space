"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import T from "@/components/i18n/T";

type GalleryStatus = "draft" | "published" | "archived";

type ValidationIssue = {
  code: string;
  label: string;
  message: string;
  severity: "error" | "warning";
};

type ValidationResult = {
  canPublish: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: {
    totalArtworks: number;
    positionedArtworks: number;
    unpositionedArtworks: number;
    artworksWithoutDimensions: number;
    artworksWithoutImage: number;
  };
};

type GalleryPublishStatusButtonProps = {
  galleryId: string;
  gallerySlug?: string | null;
  currentStatus: GalleryStatus;
};

function getStatusLabel(status: GalleryStatus) {
  if (status === "published") {
    return "Galleria pubblicata";
  }

  if (status === "archived") {
    return "Galleria archiviata";
  }

  return "Galleria in bozza";
}

function getStatusDescription(status: GalleryStatus) {
  if (status === "published") {
    return "La galleria è visibile pubblicamente nella pagina /gallerie e nel suo link pubblico.";
  }

  if (status === "archived") {
    return "La galleria è archiviata: non è visibile pubblicamente, ma puoi ancora ripristinarla in bozza.";
  }

  return "La galleria è privata. Puoi lavorarci nell editor Unity prima di pubblicarla.";
}

function getStatusBadgeClass(status: GalleryStatus) {
  if (status === "published") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "archived") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-300";
}

function getMessageClass(type: "success" | "error" | "neutral") {
  if (type === "success") {
    return "text-sm text-green-300";
  }

  if (type === "error") {
    return "text-sm text-red-300";
  }

  return "text-sm text-neutral-300";
}

export default function GalleryPublishStatusButton({
  galleryId,
  gallerySlug = null,
  currentStatus,
}: GalleryPublishStatusButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "neutral"
  >("neutral");
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const publicPageHref = gallerySlug ? `/gallerie/${gallerySlug}` : null;
  const visitorFrameHref = `/unity-frame?galleryId=${galleryId}&mode=visitor`;

  async function updateStatus(nextStatus: GalleryStatus) {
    setIsLoading(true);
    setMessage("");
    setMessageType("neutral");
    setValidation(null);

    try {
      const response = await fetch(
        `/api/dashboard/galleries/${galleryId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Errore aggiornamento status.");

        if (data.validation) {
          setValidation(data.validation);
        }

        return;
      }

      if (data.validation) {
        setValidation(data.validation);
      }

      if (nextStatus === "published") {
        setMessageType("success");
        setMessage("Galleria pubblicata correttamente.");
      }

      if (nextStatus === "draft") {
        setMessageType("neutral");
        setMessage("Galleria riportata in bozza.");
      }

      if (nextStatus === "archived") {
        setMessageType("neutral");
        setMessage("Galleria archiviata correttamente.");
      }

      router.refresh();
    } catch {
      setMessageType("error");
      setMessage("Errore di rete durante aggiornamento status.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            <T
              textKey="dashboard.galleryPublishStatus.header.label"
              fallback="Pubblicazione"
            />
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-medium">
              {getStatusLabel(currentStatus)}
            </h2>

            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getStatusBadgeClass(
                currentStatus
              )}`}
            >
              {currentStatus}
            </span>
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
            {getStatusDescription(currentStatus)}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {currentStatus === "draft" && (
          <>
            <button
              type="button"
              onClick={() => updateStatus("published")}
              disabled={isLoading}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <T
                  textKey="dashboard.galleryPublishStatus.actions.checkingPublication"
                  fallback="Controllo pubblicazione..."
                />
              ) : (
                <T
                  textKey="dashboard.galleryPublishStatus.actions.publish"
                  fallback="Pubblica galleria"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => updateStatus("archived")}
              disabled={isLoading}
              className="rounded-full border border-yellow-800 px-5 py-2 text-sm text-yellow-200 transition hover:border-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <T
                textKey="dashboard.galleryPublishStatus.actions.archive"
                fallback="Archivia galleria"
              />
            </button>
          </>
        )}

        {currentStatus === "published" && (
          <>
            <button
              type="button"
              onClick={() => updateStatus("draft")}
              disabled={isLoading}
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <T
                  textKey="dashboard.galleryPublishStatus.actions.updating"
                  fallback="Aggiornamento..."
                />
              ) : (
                <T
                  textKey="dashboard.galleryPublishStatus.actions.backToDraft"
                  fallback="Torna in bozza"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => updateStatus("archived")}
              disabled={isLoading}
              className="rounded-full border border-yellow-800 px-5 py-2 text-sm text-yellow-200 transition hover:border-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <T
                textKey="dashboard.galleryPublishStatus.actions.archive"
                fallback="Archivia galleria"
              />
            </button>
          </>
        )}

        {currentStatus === "archived" && (
          <button
            type="button"
            onClick={() => updateStatus("draft")}
            disabled={isLoading}
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <T
                textKey="dashboard.galleryPublishStatus.actions.restoring"
                fallback="Ripristino..."
              />
            ) : (
              <T
                textKey="dashboard.galleryPublishStatus.actions.restoreToDraft"
                fallback="Ripristina in bozza"
              />
            )}
          </button>
        )}

        <a
          href={visitorFrameHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-blue-800 px-5 py-2 text-sm text-blue-200 transition hover:border-blue-500"
        >
          <T
            textKey="dashboard.galleryPublishStatus.actions.previewViewer"
            fallback="Anteprima viewer 3D"
          />
        </a>

        {publicPageHref && currentStatus === "published" && (
          <a
            href={publicPageHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-green-800 px-5 py-2 text-sm text-green-200 transition hover:border-green-500"
          >
            <T
              textKey="dashboard.galleryPublishStatus.actions.previewPublicPage"
              fallback="Anteprima pagina pubblica"
            />
          </a>
        )}

        {publicPageHref && currentStatus !== "published" && (
          <span className="rounded-full border border-neutral-800 px-5 py-2 text-sm text-neutral-500">
            <T
              textKey="dashboard.galleryPublishStatus.publicPage.availableAfterPublication"
              fallback="Pagina pubblica disponibile dopo la pubblicazione"
            />
          </span>
        )}
      </div>

      {currentStatus !== "published" && (
        <p className="mt-4 text-xs leading-5 text-neutral-500">
          <T
            textKey="dashboard.galleryPublishStatus.preview.description"
            fallback="L’anteprima viewer 3D apre direttamente Unity in modalità visitatore. La pagina pubblica completa sarà visibile quando la galleria sarà pubblicata."
          />
        </p>
      )}

      {message && (
        <p className={`mt-4 ${getMessageClass(messageType)}`}>{message}</p>
      )}

      {validation && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              <T
                textKey="dashboard.galleryPublishStatus.validation.label"
                fallback="Controllo pubblicazione"
              />
            </p>

            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-neutral-500">
                  <T
                    textKey="dashboard.galleryPublishStatus.validation.totalArtworks"
                    fallback="Opere associate"
                  />
                </p>
                <p className="mt-1 text-lg text-neutral-100">
                  {validation.summary.totalArtworks}
                </p>
              </div>

              <div>
                <p className="text-neutral-500">
                  <T
                    textKey="dashboard.galleryPublishStatus.validation.positionedArtworks"
                    fallback="Opere posizionate"
                  />
                </p>
                <p className="mt-1 text-lg text-neutral-100">
                  {validation.summary.positionedArtworks}
                </p>
              </div>

              <div>
                <p className="text-neutral-500">
                  <T
                    textKey="dashboard.galleryPublishStatus.validation.unpositionedArtworks"
                    fallback="Non posizionate"
                  />
                </p>
                <p className="mt-1 text-lg text-neutral-100">
                  {validation.summary.unpositionedArtworks}
                </p>
              </div>
            </div>
          </div>

          {validation.errors.length > 0 && (
            <div className="rounded-2xl border border-red-900 bg-red-950/30 p-4">
              <p className="text-sm font-medium text-red-200">
                <T
                  textKey="dashboard.galleryPublishStatus.validation.cannotPublish"
                  fallback="Non puoi pubblicare ancora"
                />
              </p>

              <ul className="mt-3 space-y-2">
                {validation.errors.map((issue) => (
                  <li key={issue.code} className="text-sm text-red-100">
                    <span className="font-medium">{issue.label}:</span>{" "}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-4">
              <p className="text-sm font-medium text-yellow-200">
                <T
                  textKey="dashboard.galleryPublishStatus.validation.nonBlockingWarnings"
                  fallback="Attenzioni non bloccanti"
                />
              </p>

              <ul className="mt-3 space-y-2">
                {validation.warnings.map((issue) => (
                  <li key={issue.code} className="text-sm text-yellow-100">
                    <span className="font-medium">{issue.label}:</span>{" "}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}