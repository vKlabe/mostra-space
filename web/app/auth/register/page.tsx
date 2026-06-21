"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AccountType = "visitor" | "gallerist";

const TERMS_VERSION = "terms-2026-06-v1";

export default function RegisterPage() {
  const router = useRouter();

  const [accountType, setAccountType] = useState<AccountType>("visitor");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [professionalUrl, setProfessionalUrl] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isGallerist = accountType === "gallerist";

  const accountTitle = useMemo(() => {
    if (isGallerist) {
      return "Crea e gestisci esposizioni";
    }

    return "Esplora l’arte";
  }, [isGallerist]);

  useEffect(() => {
    let cancelled = false;

    async function checkExistingSession() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (user) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setCheckingSession(false);
    }

    void checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function clean(value: string) {
    return value.trim();
  }

  function validateForm() {
    const cleanFirstName = clean(firstName);
    const cleanLastName = clean(lastName);
    const cleanEmail = clean(email).toLowerCase();
    const cleanPassword = password.trim();
    const cleanPhone = clean(phone);
    const cleanProfessionalUrl = clean(professionalUrl);

    if (!cleanFirstName) {
      return "Inserisci il nome.";
    }

    if (!cleanLastName) {
      return "Inserisci il cognome.";
    }

    if (!cleanEmail) {
      return "Inserisci l’email.";
    }

    if (cleanPassword.length < 6) {
      return "La password deve avere almeno 6 caratteri.";
    }

    if (isGallerist && !cleanPhone) {
      return "Per creare esposizioni devi inserire un numero di telefono.";
    }

    if (isGallerist && !cleanProfessionalUrl) {
      return "Per creare esposizioni devi inserire un sito o un profilo social.";
    }

    if (!termsAccepted) {
      return "Devi accettare termini e privacy per creare l’account.";
    }

    return "";
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      setLoading(false);
      return;
    }

    const cleanFirstName = clean(firstName);
    const cleanLastName = clean(lastName);
    const cleanFullName = `${cleanFirstName} ${cleanLastName}`.trim();
    const cleanBusinessName = clean(businessName);
    const cleanEmail = clean(email).toLowerCase();
    const cleanPhone = clean(phone);
    const cleanProfessionalUrl = clean(professionalUrl);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            account_type: accountType,
            first_name: cleanFirstName,
            last_name: cleanLastName,
            full_name: cleanFullName,
            display_name: cleanBusinessName || cleanFullName,
            business_name: isGallerist ? cleanBusinessName : "",
            phone: isGallerist ? cleanPhone : "",
            professional_url: isGallerist ? cleanProfessionalUrl : "",
            terms_accepted: "true",
            terms_version: TERMS_VERSION,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
  await fetch("/api/auth/sync-profile", {
    method: "POST",
  });

  setMessage("Registrazione completata. Ti sto portando alla dashboard...");
  router.replace("/dashboard");
  router.refresh();
  return;
}

      setMessage(
        "Registrazione completata. Controlla la tua email per confermare l’account, poi accedi al portale."
      );
      setLoading(false);
    } catch {
      setErrorMessage(
        "Errore di rete durante la registrazione. Riprova tra qualche secondo."
      );
      setLoading(false);
    }
  }

  const formDisabled = loading || checkingSession;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
      <section className="mx-auto max-w-5xl">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-neutral-500">
          Accesso
        </p>

        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold">Crea account</h1>

          <p className="mt-4 text-neutral-300">
            Scegli come vuoi entrare nel portale: come visitatore della community
            oppure come artista, gallerista o realtà culturale che vuole creare
            esposizioni virtuali.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setAccountType("visitor")}
            disabled={formDisabled}
            className={`rounded-3xl border p-6 text-left transition ${
              accountType === "visitor"
                ? "border-white bg-white text-neutral-950"
                : "border-neutral-800 bg-neutral-900 text-neutral-100 hover:border-neutral-500"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <p className="text-sm uppercase tracking-[0.25em] opacity-70">
              Visitor
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Voglio esplorare l’arte
            </h2>
            <p className="mt-3 text-sm leading-6 opacity-80">
              Crea un account per salvare preferiti, inviare richieste e usare i
              primi strumenti community.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setAccountType("gallerist")}
            disabled={formDisabled}
            className={`rounded-3xl border p-6 text-left transition ${
              accountType === "gallerist"
                ? "border-white bg-white text-neutral-950"
                : "border-neutral-800 bg-neutral-900 text-neutral-100 hover:border-neutral-500"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <p className="text-sm uppercase tracking-[0.25em] opacity-70">
              Gallerista / Artista
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Voglio creare e gestire esposizioni
            </h2>
            <p className="mt-3 text-sm leading-6 opacity-80">
              Crea un account per caricare opere, scegliere template, aprire
              l’editor 3D e pubblicare gallerie virtuali.
            </p>
          </button>
        </div>

        <form
          onSubmit={handleRegister}
          className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
        >
          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Registrazione
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{accountTitle}</h2>
            </div>

            <p className="rounded-full border border-neutral-700 px-4 py-2 text-xs uppercase tracking-[0.18em] text-neutral-300">
              {isGallerist ? "Account creator" : "Account community"}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm text-neutral-300">Nome</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={formDisabled}
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Mario"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-300">Cognome</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={formDisabled}
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Rossi"
              />
            </div>

            {isGallerist && (
              <>
                <div>
                  <label className="block text-sm text-neutral-300">
                    Nome galleria / artista / studio
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    disabled={formDisabled}
                    className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Galleria Rossi"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-300">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    required={isGallerist}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    disabled={formDisabled}
                    className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="+39 ..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-neutral-300">
                    Sito o profilo social
                  </label>
                  <input
                    type="text"
                    required={isGallerist}
                    value={professionalUrl}
                    onChange={(event) => setProfessionalUrl(event.target.value)}
                    disabled={formDisabled}
                    className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="https://... oppure @profilo"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm text-neutral-300">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={formDisabled}
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-300">Password</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={formDisabled}
                className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Minimo 6 caratteri"
              />
            </div>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm leading-6 text-neutral-300">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              disabled={formDisabled}
              className="mt-1"
            />
            <span>
              Accetto termini, privacy e trattamento dei dati per la creazione
              dell’account e l’utilizzo del portale.
            </span>
          </label>

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-100">
              {errorMessage}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-100">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={formDisabled}
            className="mt-6 w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkingSession
              ? "Controllo sessione..."
              : loading
                ? "Registrazione..."
                : isGallerist
                  ? "Crea account creator"
                  : "Crea account visitor"}
          </button>

          <p className="mt-5 text-center text-sm text-neutral-400">
            Hai già un account?{" "}
            <a href="/auth/login" className="text-neutral-100 underline">
              Accedi
            </a>
          </p>
        </form>
      </section>
    </main>
  );
}