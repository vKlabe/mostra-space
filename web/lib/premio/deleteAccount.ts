import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PREMIO_BUCKET } from "./config";
// Run before profiles cascade deletion, while immutable archive references still exist.
export async function deletePremioAccountArchives(admin: ReturnType<typeof createAdminClient>, artistId: string) {
  const entries = await admin.from("premio_entries").select("id").eq("artist_id", artistId);
  if (entries.error) {
    if (["42P01", "PGRST205"].includes(entries.error.code)) return;
    throw new Error("Errore lettura archivio Premio Mostra.Space.");
  }
  for (const entry of entries.data || []) {
    for (let offset = 0; ; offset += 100) {
      const snapshots = await admin.from("premio_snapshots").select("assets").eq("entry_id", entry.id).order("version").range(offset, offset + 99);
      if (snapshots.error) throw new Error("Errore lettura archivio Premio Mostra.Space.");
      const paths = (snapshots.data || []).flatMap(s => (s.assets as string[]).filter(p => p.startsWith(`${entry.id}/`)));
      for (let i = 0; i < paths.length; i += 100) {
        const deleted = await admin.storage.from(PREMIO_BUCKET).remove(paths.slice(i, i + 100));
        if (deleted.error) throw new Error("Rimozione archivio Premio Mostra.Space non riuscita. Riprova.");
      }
      if ((snapshots.data || []).length < 100) break;
    }
  }
}
