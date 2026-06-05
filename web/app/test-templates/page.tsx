"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GalleryTemplate = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unity_scene_key: string;
  is_free: boolean;
  is_active: boolean;
  max_artworks: number;
};

export default function TestTemplatesPage() {
  const [templates, setTemplates] = useState<GalleryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadTemplates() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("gallery_templates")
        .select(
          "id, name, slug, description, unity_scene_key, is_free, is_active, max_artworks"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setTemplates(data || []);
      setLoading(false);
    }

    loadTemplates();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
      <section className="mx-auto max-w-5xl">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-neutral-500">
          Test tecnico
        </p>

        <h1 className="text-4xl font-semibold">Test template gallerie</h1>

        <p className="mt-4 max-w-2xl text-neutral-300">
          Questa pagina legge da Supabase i template attivi. È il primo test
          reale delle policy RLS.
        </p>

        {loading && (
          <div className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            Caricamento template...
          </div>
        )}

        {errorMessage && (
          <div className="mt-10 rounded-3xl border border-red-800 bg-red-950/30 p-6">
            <p className="text-lg font-medium">Errore</p>
            <p className="mt-2 text-neutral-300">{errorMessage}</p>
          </div>
        )}

        {!loading && !errorMessage && (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {templates.map((template) => (
              <article
                key={template.id}
                className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
              >
                <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                  {template.is_free ? "Free" : "Premium"}
                </p>

                <h2 className="text-2xl font-medium">{template.name}</h2>

                <p className="mt-3 text-neutral-400">
                  {template.description || "Nessuna descrizione."}
                </p>

                <dl className="mt-6 space-y-2 text-sm text-neutral-400">
                  <div>
                    <dt className="inline text-neutral-500">Slug: </dt>
                    <dd className="inline">{template.slug}</dd>
                  </div>

                  <div>
                    <dt className="inline text-neutral-500">
                      Unity scene key:{" "}
                    </dt>
                    <dd className="inline">{template.unity_scene_key}</dd>
                  </div>

                  <div>
                    <dt className="inline text-neutral-500">Max opere: </dt>
                    <dd className="inline">{template.max_artworks}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}