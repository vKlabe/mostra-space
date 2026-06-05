"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
      <section className="mx-auto max-w-xl">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-neutral-500">
          Accesso
        </p>

        <h1 className="text-4xl font-semibold">Login</h1>

        <p className="mt-4 text-neutral-300">
          Accedi al portale per gestire account, gallerie, opere e in futuro
          marketplace, richieste e allestimenti Unity.
        </p>

        <form
          onSubmit={handleLogin}
          className="mt-10 space-y-5 rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
        >
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-50 outline-none transition focus:border-neutral-400"
              placeholder="La tua password"
            />
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-100">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Accesso..." : "Accedi"}
          </button>

          <p className="text-center text-sm text-neutral-400">
            Non hai un account?{" "}
            <a href="/auth/register" className="text-neutral-100 underline">
              Registrati
            </a>
          </p>
        </form>
      </section>
    </main>
  );
}