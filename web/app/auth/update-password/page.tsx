import UpdatePasswordForm from "./UpdatePasswordForm";

export const dynamic = "force-dynamic";

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-12 text-neutral-100">
      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/70 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
          Mostra.space
        </p>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Imposta nuova password
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-400">
          Scegli una nuova password per accedere al tuo account.
        </p>

        <UpdatePasswordForm />
      </div>
    </main>
  );
}