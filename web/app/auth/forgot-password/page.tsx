import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-12 text-neutral-100">
      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/70 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
          Mostra.space
        </p>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Recupera password
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-400">
          Inserisci l’email del tuo account. Ti invieremo un link sicuro per
          impostare una nuova password.
        </p>

        <ForgotPasswordForm />

        <div className="mt-6 text-center text-sm text-neutral-500">
          Ricordi la password?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-neutral-200 underline-offset-4 hover:underline"
          >
            Torna al login
          </Link>
        </div>
      </div>
    </main>
  );
}