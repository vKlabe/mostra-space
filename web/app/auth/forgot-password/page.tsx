import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";
import T from "@/components/i18n/T";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="museum-page flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-xl rounded-[2rem] border border-[var(--museum-border)] bg-[rgba(23,21,17,0.84)] p-8 shadow-[var(--museum-shadow-soft)] md:p-10">
        <Link
          href="/"
          className="museum-logo text-3xl leading-none text-[var(--museum-ivory)]"
        >
          mostra<span className="text-[var(--museum-bronze-light)]">.</span>
          <span className="text-[var(--museum-ivory-soft)]">space</span>
        </Link>

        <p className="museum-label mt-8">
          <T
            textKey="auth.forgotPasswordPage.label"
            fallback="Recupero accesso"
          />
        </p>

        <h1 className="museum-title mt-5 text-5xl text-[var(--museum-ivory)] md:text-6xl">
          <T
            textKey="auth.forgotPasswordPage.title"
            fallback="Recupera password."
          />
        </h1>

        <p className="museum-subtitle mt-5 text-sm text-[var(--museum-stone)]">
          <T
            textKey="auth.forgotPasswordPage.subtitle"
            fallback="Inserisci l’email del tuo account. Ti invieremo un link sicuro per impostare una nuova password."
          />
        </p>

        <ForgotPasswordForm />

        <div className="mt-7 text-center text-sm text-[var(--museum-stone)]">
          <T
            textKey="auth.forgotPasswordPage.rememberPassword"
            fallback="Ricordi la password?"
          />{" "}
          <Link
            href="/auth/login"
            className="text-[var(--museum-bronze-light)] underline-offset-4 hover:underline"
          >
            <T
              textKey="auth.forgotPasswordPage.backToLogin"
              fallback="Torna al login"
            />
          </Link>
        </div>
      </section>
    </main>
  );
}