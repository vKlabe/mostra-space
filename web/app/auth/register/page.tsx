"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          display_name: displayName,
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      setMessage("Registrazione completata. Ti sto portando al tuo account...");
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setMessage(
      "Registrazione completata. Se la conferma email è attiva, controlla la tua casella email."
    );

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
      <section className="mx-auto max-w-xl">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-neutral-500">
          Accesso
        </p>

        <h1 className="text-4xl font-semibold">Crea account</h1>

        <p className="mt-4 text-neutral-300">
          Registrati per iniziare a usare il portale. Per ora ogni nuovo utente
          nasce come visitatore base. Nella prossima fase abiliteremo il ruolo
          gallerista.
        </p>

        <form
          onSubmit={handleRegister}
          className="mt-10 space-y-5 rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
        >
          <div>
            <label className="block text-sm text-neutral-300">
              Nome completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
              placeholder="Mario Rossi"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Nome pubblico / display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
              placeholder="Galleria Rossi"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
              placeholder="Minimo 6 caratteri"
            />
          </div>

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
            className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Registrazione..." : "Registrati"}
          </button>

          <p className="text-center text-sm text-neutral-400">
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