"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Errore di rete durante l’upgrade.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
      <section className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-neutral-500">
          Upgrade account
        </p>

        <h1 className="text-4xl font-semibold">
          Passa ad account Gallerista / Artista
        </h1>

        <p className="mt-4 text-neutral-300">
          Mantieni lo stesso account e attiva gli strumenti creator: creazione
          gallerie, upload opere, editor 3D, pubblicazione e gestione richieste.
        </p>

        <form
          onSubmit={handleUpgrade}
          className="mt-10 space-y-5 rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
        >
          <div>
            <label className="block text-sm text-neutral-300">
              Nome galleria / artista / studio
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-neutral-950 px-4 py-3 text-neutral-50"
              placeholder="Galleria Rossi"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Telefono
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-neutral-950 px-4 py-3 text-neutral-50"
              placeholder="+39 ..."
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Sito o profilo social
            </label>
            <input
              type="text"
              required
              value={professionalUrl}
              onChange={(event) => setProfessionalUrl(event.target.value)}
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-neutral-950 px-4 py-3 text-neutral-50"
              placeholder="https://... oppure @profilo"
            />
          </div>

          <label className="flex gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              disabled={loading}
            />
            <span>
              Confermo di voler attivare un account Gallerista / Artista e
              accetto termini, responsabilità sui contenuti caricati e trattamento
              dei dati necessari alla gestione dell’account.
            </span>
          </label>

          {errorMessage && (
            <div className="rounded-2xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-100">
              {errorMessage}
            </div>
          )}

          {message && (
            <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-100">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950"
          >
            {loading ? "Upgrade in corso..." : "Attiva strumenti creator"}
          </button>

          <p className="text-center text-sm text-neutral-400">
            Vuoi restare Visitor?{" "}
            <a href="/dashboard" className="text-neutral-100 underline">
              Torna alla dashboard
            </a>
          </p>
        </form>
      </section>
    </main>
  );
}