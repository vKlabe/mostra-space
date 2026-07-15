"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import T from "@/components/i18n/T";

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
    <main className="museum-page px-5 py-12">
      <section className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center justify-between gap-5">
          <Link
            href="/"
            className="museum-logo text-3xl leading-none text-[var(--museum-ivory)]"
          >
            mostra
            <span className="text-[var(--museum-bronze-light)]">.</span>
            <span className="text-[var(--museum-ivory-soft)]">space</span>
          </Link>

          <Link
            href="/auth/login"
            className="museum-button-secondary px-5 py-2.5"
          >
            <T textKey="auth.register.actions.login" fallback="Accedi" />
          </Link>
        </div>

        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-10">
            <p className="museum-label">
              <T
                textKey="auth.register.hero.label"
                fallback="Registrazione"
              />
            </p>

            <h1 className="museum-title mt-5 text-6xl text-[var(--museum-ivory)] md:text-7xl">
              <T
                textKey="auth.register.hero.title"
                fallback="Crea il tuo spazio."
              />
            </h1>

            <p className="museum-subtitle mt-6 max-w-xl text-sm text-[var(--museum-stone)] md:text-base">
              <T
                textKey="auth.register.hero.subtitle"
                fallback="Scegli come vuoi entrare nel portale: come visitatore della community oppure come artista, gallerista o realtà culturale che vuole creare esposizioni virtuali."
              />
            </p>

            <div className="museum-card mt-8 rounded-[1.75rem] p-5">
              <p className="museum-label">
                <T
                  textKey="auth.register.modes.label"
                  fallback="Due modalità"
                />
              </p>

              <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--museum-stone)]">
                <p>
                  <span className="text-[var(--museum-ivory-soft)]">
                    <T
                      textKey="auth.register.modes.visitorName"
                      fallback="Visitor:"
                    />
                  </span>{" "}
                  <T
                    textKey="auth.register.modes.visitorDescription"
                    fallback="salva preferiti, invia richieste e segui gallerie."
                  />
                </p>

                <p>
                  <span className="text-[var(--museum-ivory-soft)]">
                    <T
                      textKey="auth.register.modes.creatorName"
                      fallback="Creator:"
                    />
                  </span>{" "}
                  <T
                    textKey="auth.register.modes.creatorDescription"
                    fallback="carica opere, scegli template, usa l’editor e pubblica spazi."
                  />
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setAccountType("visitor")}
                disabled={formDisabled}
                className={
                  accountType === "visitor"
                    ? "rounded-[1.5rem] border border-[var(--museum-bronze-light)] bg-[rgba(168,121,69,0.16)] p-6 text-left shadow-[var(--museum-shadow-bronze)] transition disabled:cursor-not-allowed disabled:opacity-50"
                    : "rounded-[1.5rem] border border-[var(--museum-border)] bg-[rgba(23,21,17,0.74)] p-6 text-left transition hover:border-[var(--museum-bronze)] disabled:cursor-not-allowed disabled:opacity-50"
                }
              >
                <p className="museum-label">
                  <T
                    textKey="auth.register.accountTypes.visitor.label"
                    fallback="Visitor"
                  />
                </p>

                <h2 className="mt-3 font-editorial text-3xl text-[var(--museum-ivory)]">
                  <T
                    textKey="auth.register.accountTypes.visitor.title"
                    fallback="Voglio esplorare l’arte"
                  />
                </h2>

                <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
                  <T
                    textKey="auth.register.accountTypes.visitor.description"
                    fallback="Crea un account per salvare preferiti, inviare richieste e usare i primi strumenti community."
                  />
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAccountType("gallerist")}
                disabled={formDisabled}
                className={
                  accountType === "gallerist"
                    ? "rounded-[1.5rem] border border-[var(--museum-bronze-light)] bg-[rgba(168,121,69,0.16)] p-6 text-left shadow-[var(--museum-shadow-bronze)] transition disabled:cursor-not-allowed disabled:opacity-50"
                    : "rounded-[1.5rem] border border-[var(--museum-border)] bg-[rgba(23,21,17,0.74)] p-6 text-left transition hover:border-[var(--museum-bronze)] disabled:cursor-not-allowed disabled:opacity-50"
                }
              >
                <p className="museum-label">
                  <T
                    textKey="auth.register.accountTypes.creator.label"
                    fallback="Gallerista / Artista"
                  />
                </p>

                <h2 className="mt-3 font-editorial text-3xl text-[var(--museum-ivory)]">
                  <T
                    textKey="auth.register.accountTypes.creator.title"
                    fallback="Voglio creare esposizioni"
                  />
                </h2>

                <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
                  <T
                    textKey="auth.register.accountTypes.creator.description"
                    fallback="Crea un account per caricare opere, scegliere template, aprire l’editor 3D e pubblicare gallerie virtuali."
                  />
                </p>
              </button>
            </div>

            <form
              onSubmit={handleRegister}
              className="museum-card mt-6 rounded-[1.75rem] p-6"
            >
              <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                <div>
                  <p className="museum-label">
                    <T
                      textKey="auth.register.form.label"
                      fallback="Dati account"
                    />
                  </p>

                  <h2 className="mt-2 font-editorial text-4xl text-[var(--museum-ivory)]">
                    {accountTitle}
                  </h2>
                </div>

                <p className="museum-pill rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em]">
                  {isGallerist ? (
                    <T
                      textKey="auth.register.form.creatorAccount"
                      fallback="Account creator"
                    />
                  ) : (
                    <T
                      textKey="auth.register.form.communityAccount"
                      fallback="Account community"
                    />
                  )}
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-[var(--museum-ivory-soft)]">
                    <T
                      textKey="auth.register.form.firstName"
                      fallback="Nome"
                    />
                  </label>

                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    disabled={formDisabled}
                    className="museum-input mt-2 w-full rounded-2xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Mario"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--museum-ivory-soft)]">
                    <T
                      textKey="auth.register.form.lastName"
                      fallback="Cognome"
                    />
                  </label>

                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    disabled={formDisabled}
                    className="museum-input mt-2 w-full rounded-2xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Rossi"
                  />
                </div>

                {isGallerist && (
                  <>
                    <div>
                      <label className="block text-sm text-[var(--museum-ivory-soft)]">
                        <T
                          textKey="auth.register.form.businessName"
                          fallback="Nome galleria / artista / studio"
                        />
                      </label>

                      <input
                        type="text"
                        value={businessName}
                        onChange={(event) =>
                          setBusinessName(event.target.value)
                        }
                        disabled={formDisabled}
                        className="museum-input mt-2 w-full rounded-2xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Galleria Rossi"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-[var(--museum-ivory-soft)]">
                        <T
                          textKey="auth.register.form.phone"
                          fallback="Telefono"
                        />
                      </label>

                      <input
                        type="tel"
                        required={isGallerist}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        disabled={formDisabled}
                        className="museum-input mt-2 w-full rounded-2xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="+39 ..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm text-[var(--museum-ivory-soft)]">
                        <T
                          textKey="auth.register.form.professionalUrl"
                          fallback="Sito o profilo social"
                        />
                      </label>

                      <input
                        type="text"
                        required={isGallerist}
                        value={professionalUrl}
                        onChange={(event) =>
                          setProfessionalUrl(event.target.value)
                        }
                        disabled={formDisabled}
                        className="museum-input mt-2 w-full rounded-2xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="https://... oppure @profilo"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm text-[var(--museum-ivory-soft)]">
                    <T textKey="auth.register.form.email" fallback="Email" />
                  </label>

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={formDisabled}
                    className="museum-input mt-2 w-full rounded-2xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--museum-ivory-soft)]">
                    <T
                      textKey="auth.register.form.password"
                      fallback="Password"
                    />
                  </label>

                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={formDisabled}
                    className="museum-input mt-2 w-full rounded-2xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Minimo 6 caratteri"
                  />
                </div>
              </div>

              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-4 text-sm leading-6 text-[var(--museum-stone)]">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  disabled={formDisabled}
                  className="mt-1 accent-[var(--museum-bronze)]"
                />

                <span>
                  <T
                    textKey="auth.register.form.termsAcceptance"
                    fallback="Accetto termini, privacy e trattamento dei dati per la creazione dell’account e l’utilizzo del portale."
                  />
                </span>
              </label>

              {errorMessage && (
                <div className="mt-5 rounded-2xl border border-[rgba(182,91,78,0.45)] bg-[rgba(182,91,78,0.08)] p-4 text-sm text-[var(--museum-danger)]">
                  {errorMessage}
                </div>
              )}

              {message && (
                <div className="mt-5 rounded-2xl border border-[rgba(127,175,123,0.45)] bg-[rgba(127,175,123,0.08)] p-4 text-sm text-[var(--museum-success)]">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={formDisabled}
                className="museum-button-primary mt-6 w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkingSession ? (
                  <T
                    textKey="auth.register.actions.checkingSession"
                    fallback="Controllo sessione..."
                  />
                ) : loading ? (
                  <T
                    textKey="auth.register.actions.registering"
                    fallback="Registrazione..."
                  />
                ) : isGallerist ? (
                  <T
                    textKey="auth.register.actions.createCreatorAccount"
                    fallback="Crea account creator"
                  />
                ) : (
                  <T
                    textKey="auth.register.actions.createVisitorAccount"
                    fallback="Crea account visitor"
                  />
                )}
              </button>

              <p className="mt-5 text-center text-sm text-[var(--museum-stone)]">
                <T
                  textKey="auth.register.login.hasAccount"
                  fallback="Hai già un account?"
                />{" "}
                <Link
                  href="/auth/login"
                  className="text-[var(--museum-bronze-light)] underline-offset-4 hover:underline"
                >
                  <T
                    textKey="auth.register.login.action"
                    fallback="Accedi"
                  />
                </Link>
              </p>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-[var(--museum-stone-muted)]">
              <T
                textKey="auth.register.legal.acceptance"
                fallback="Creando un account accetti i"
              />{" "}
              <Link
                href="/legal/termini"
                className="text-[var(--museum-stone)] underline-offset-4 hover:text-[var(--museum-bronze-light)] hover:underline"
              >
                <T
                  textKey="auth.register.legal.terms"
                  fallback="Termini e condizioni"
                />
              </Link>{" "}
              <T
                textKey="auth.register.legal.privacyConfirmation"
                fallback="e confermi di aver letto la"
              />{" "}
              <Link
                href="/legal/privacy"
                className="text-[var(--museum-stone)] underline-offset-4 hover:text-[var(--museum-bronze-light)] hover:underline"
              >
                <T
                  textKey="auth.register.legal.privacyPolicy"
                  fallback="Privacy Policy"
                />
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}