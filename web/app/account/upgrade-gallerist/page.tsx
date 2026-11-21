"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import T from "@/components/i18n/T";
import { getSafePostAuthPath } from "@/lib/auth/safeNavigation";

export default function UpgradeGalleristPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [professionalUrl, setProfessionalUrl] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleUpgrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const cleanBusinessName = businessName.trim();
    const cleanPhone = phone.trim();
    const cleanProfessionalUrl = professionalUrl.trim();

    if (!cleanBusinessName) {
      setErrorMessage("Inserisci il nome della galleria, dell’artista o dello studio.");
      setLoading(false);
      return;
    }

    if (!cleanPhone) {
      setErrorMessage("Inserisci un numero di telefono.");
      setLoading(false);
      return;
    }

    if (!cleanProfessionalUrl) {
      setErrorMessage("Inserisci un sito o un profilo social.");
      setLoading(false);
      return;
    }

    if (!termsAccepted) {
      setErrorMessage("Devi accettare termini e responsabilità per l’upgrade.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/account/upgrade-gallerist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName: cleanBusinessName,
          phone: cleanPhone,
          professionalUrl: cleanProfessionalUrl,
          termsAccepted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Errore durante l’upgrade account.");
        setLoading(false);
        return;
      }

      setMessage("Upgrade completato. Ti sto portando alla dashboard gallerista...");

      router.replace(getSafePostAuthPath(new URL(window.location.href).searchParams.get("next")));
      router.refresh();
    } catch {
      setErrorMessage("Errore di rete durante l’upgrade.");
      setLoading(false);
    }
  }

  return (
    <main className="museum-page min-h-screen px-4 py-8 text-[var(--museum-ivory)] sm:px-6 sm:py-12">
      <section className="mx-auto max-w-3xl">
        <h1 className="museum-title max-w-xl text-[clamp(2.5rem,7vw,4.25rem)]">
          <T textKey="ux.auth.upgradeTitle" fallback="Passa ad account Gallerista / Artista" />
        </h1>

        <p className="mt-4 max-w-xl leading-7 text-[var(--museum-stone)]">
          <T textKey="ux.auth.upgradeIntro" fallback="Con lo stesso account puoi creare gallerie, caricare opere, usare l’editor 3D e gestire le richieste." />
        </p>

        <form
          onSubmit={handleUpgrade}
          className="museum-card mt-6 space-y-5 rounded-[1.5rem] p-5 sm:p-7"
        >
          <div>
            <label htmlFor="upgrade-businessName" className="block text-sm text-[var(--museum-ivory-soft)]">
              <T textKey="auth.register.form.businessName" fallback="Nome galleria / artista / studio" />
            </label>
            <input
              id="upgrade-businessName"
              name="businessName"
              autoComplete="organization"
              type="text"
              required
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              disabled={loading}
              className="museum-input mt-2 w-full rounded-2xl px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="upgrade-phone" className="block text-sm text-[var(--museum-ivory-soft)]">
              <T textKey="auth.register.form.phone" fallback="Telefono" />
            </label>
            <input
              id="upgrade-phone"
              name="phone"
              autoComplete="tel"
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={loading}
              className="museum-input mt-2 w-full rounded-2xl px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="upgrade-professionalUrl" className="block text-sm text-[var(--museum-ivory-soft)]">
              <T textKey="auth.register.form.professionalUrl" fallback="Sito o profilo social" />
            </label>
            <input
              id="upgrade-professionalUrl"
              name="professionalUrl"
              type="text"
              required
              value={professionalUrl}
              onChange={(event) => setProfessionalUrl(event.target.value)}
              disabled={loading}
              className="museum-input mt-2 w-full rounded-2xl px-4 py-3"
            />
          </div>

          <label className="flex gap-3 rounded-2xl border border-[var(--museum-border)] bg-[var(--museum-charcoal)] p-4 text-sm leading-6 text-[var(--museum-stone)]">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              disabled={loading}
            />
            <span>
              <T textKey="ux.auth.upgradeTerms" fallback="Confermo di voler attivare un account Gallerista / Artista e accetto termini, responsabilità sui contenuti caricati e trattamento dei dati necessari alla gestione dell’account." />
            </span>
          </label>

          {errorMessage && (
            <div role="alert" className="rounded-2xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-100">
              {errorMessage}
            </div>
          )}

          {message && (
            <div role="status" className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-100">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="museum-button-primary w-full px-6 py-3 text-sm disabled:opacity-50"
          >
            {loading ? <T textKey="ux.auth.upgrading" fallback="Attivazione in corso…" /> : <T textKey="ux.auth.upgradeAction" fallback="Attiva gli strumenti creator" />}
          </button>

          <Link href="/dashboard" className="museum-link block text-center text-sm underline underline-offset-4">
            <T textKey="ux.state.dashboard" fallback="Torna alla dashboard" />
          </Link>
        </form>
      </section>
    </main>
  );
}
