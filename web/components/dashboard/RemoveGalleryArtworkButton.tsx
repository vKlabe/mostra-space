"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import T from "@/components/i18n/T";
import { createClient } from "@/lib/supabase/client";

type RemoveGalleryArtworkButtonProps = {
  galleryArtworkId: string;
};

export default function RemoveGalleryArtworkButton({
  galleryArtworkId,
}: RemoveGalleryArtworkButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    const confirmed = window.confirm(
      "Vuoi rimuovere questa opera dalla galleria? L’opera resterà nel tuo archivio."
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase
      .from("gallery_artworks")
      .delete()
      .eq("id", galleryArtworkId);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={loading}
      className="rounded-full border border-red-900/70 px-4 py-2 text-sm text-red-200 transition hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <T
          textKey="dashboard.removeGalleryArtwork.actions.removing"
          fallback="Rimozione..."
        />
      ) : (
        <T
          textKey="dashboard.removeGalleryArtwork.actions.remove"
          fallback="Rimuovi"
        />
      )}
    </button>
  );
}