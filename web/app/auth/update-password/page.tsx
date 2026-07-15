import Link from "next/link";
import UpdatePasswordForm from "./UpdatePasswordForm";
import T from "@/components/i18n/T";

export const dynamic = "force-dynamic";

export default function UpdatePasswordPage() {
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
            textKey="auth.updatePasswordPage.label"
            fallback="Sicurezza account"
          />
        </p>

        <h1 className="museum-title mt-5 text-5xl text-[var(--museum-ivory)] md:text-6xl">
          <T
            textKey="auth.updatePasswordPage.title"
            fallback="Nuova password."
          />
        </h1>

        <p className="museum-subtitle mt-5 text-sm text-[var(--museum-stone)]">
          <T
            textKey="auth.updatePasswordPage.subtitle"
            fallback="Scegli una nuova password per accedere al tuo account mostra.space."
          />
        </p>

        <UpdatePasswordForm />
      </section>
    </main>
  );
}