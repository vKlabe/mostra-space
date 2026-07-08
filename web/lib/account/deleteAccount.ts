import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteAccountStep = {
  table: string;
  action: string;
  count?: number;
  skipped?: boolean;
};

type AdminClient = ReturnType<typeof createAdminClient>;

type GalleryRow = {
  id: string;
};

type ArtworkRow = {
  id: string;
  storage_path: string | null;
};

type EventRow = {
  id: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: string | null;
};

type DeleteUserAccountOptions = {
  admin: AdminClient;
  userId: string;
  deleteAuthUser?: boolean;
};

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function isMissingSchemaError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  const message = error.message || "";

  return (
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes("Could not find") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

async function deleteEq({
  admin,
  table,
  column,
  value,
  steps,
  optional = true,
}: {
  admin: AdminClient;
  table: string;
  column: string;
  value: string;
  steps: DeleteAccountStep[];
  optional?: boolean;
}) {
  const { count, error } = await admin
    .from(table)
    .delete({ count: "exact" })
    .eq(column, value);

  if (error) {
    if (optional && isMissingSchemaError(error)) {
      steps.push({ table, action: `skip missing ${column}`, skipped: true });
      return;
    }

    throw new Error(`Errore cancellazione ${table}.${column}: ${error.message}`);
  }

  steps.push({ table, action: `delete where ${column}`, count: count || 0 });
}

async function deleteIn({
  admin,
  table,
  column,
  values,
  steps,
  optional = true,
}: {
  admin: AdminClient;
  table: string;
  column: string;
  values: string[];
  steps: DeleteAccountStep[];
  optional?: boolean;
}) {
  const safeValues = unique(values);

  if (safeValues.length === 0) {
    return;
  }

  const { count, error } = await admin
    .from(table)
    .delete({ count: "exact" })
    .in(column, safeValues);

  if (error) {
    if (optional && isMissingSchemaError(error)) {
      steps.push({ table, action: `skip missing ${column}`, skipped: true });
      return;
    }

    throw new Error(`Errore cancellazione ${table}.${column}: ${error.message}`);
  }

  steps.push({ table, action: `delete where ${column} in`, count: count || 0 });
}

async function getOwnedGalleryIds(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("galleries")
    .select("id")
    .eq("owner_id", userId);

  if (error) {
    throw new Error(`Errore lettura gallerie utente: ${error.message}`);
  }

  return ((data || []) as GalleryRow[]).map((row) => row.id);
}

async function getOwnedArtworks(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("artworks")
    .select("id, storage_path")
    .eq("owner_id", userId);

  if (error) {
    throw new Error(`Errore lettura opere utente: ${error.message}`);
  }

  return (data || []) as ArtworkRow[];
}

async function getEventIds({
  admin,
  userId,
  galleryIds,
}: {
  admin: AdminClient;
  userId: string;
  galleryIds: string[];
}) {
  const eventIds: string[] = [];

  const { data: ownerEvents, error: ownerEventsError } = await admin
    .from("gallery_events")
    .select("id")
    .eq("owner_id", userId);

  if (ownerEventsError && !isMissingSchemaError(ownerEventsError)) {
    throw new Error(`Errore lettura eventi utente: ${ownerEventsError.message}`);
  }

  eventIds.push(...((ownerEvents || []) as EventRow[]).map((row) => row.id));

  if (galleryIds.length > 0) {
    const { data: galleryEvents, error: galleryEventsError } = await admin
      .from("gallery_events")
      .select("id")
      .in("gallery_id", galleryIds);

    if (galleryEventsError && !isMissingSchemaError(galleryEventsError)) {
      throw new Error(
        `Errore lettura eventi galleria: ${galleryEventsError.message}`
      );
    }

    eventIds.push(...((galleryEvents || []) as EventRow[]).map((row) => row.id));
  }

  return unique(eventIds);
}

async function removeArtworkFiles({
  admin,
  artworks,
  steps,
}: {
  admin: AdminClient;
  artworks: ArtworkRow[];
  steps: DeleteAccountStep[];
}) {
  const storagePaths = unique(artworks.map((artwork) => artwork.storage_path));

  if (storagePaths.length === 0) {
    return;
  }

  const { error } = await admin.storage.from("artworks").remove(storagePaths);

  if (error) {
    throw new Error(`Errore cancellazione file opere: ${error.message}`);
  }

  steps.push({
    table: "storage.artworks",
    action: "remove files",
    count: storagePaths.length,
  });
}

async function clearPublicGallerySlots({
  admin,
  galleryIds,
  steps,
}: {
  admin: AdminClient;
  galleryIds: string[];
  steps: DeleteAccountStep[];
}) {
  if (galleryIds.length === 0) {
    return;
  }

  const { count, error } = await admin
    .from("public_gallery_slots")
    .update({ gallery_id: null, updated_at: new Date().toISOString() }, { count: "exact" })
    .in("gallery_id", galleryIds);

  if (error) {
    if (isMissingSchemaError(error)) {
      steps.push({
        table: "public_gallery_slots",
        action: "skip missing gallery_id",
        skipped: true,
      });
      return;
    }

    throw new Error(`Errore pulizia vetrina pubblica: ${error.message}`);
  }

  steps.push({
    table: "public_gallery_slots",
    action: "set gallery_id null",
    count: count || 0,
  });
}

export async function deleteUserAccount({
  admin,
  userId,
  deleteAuthUser = true,
}: DeleteUserAccountOptions) {
  const steps: DeleteAccountStep[] = [];

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, display_name, full_name, role")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    throw new Error(`Errore lettura profilo: ${profileError.message}`);
  }

  const galleryIds = await getOwnedGalleryIds(admin, userId);
  const artworks = await getOwnedArtworks(admin, userId);
  const artworkIds = artworks.map((artwork) => artwork.id);
  const eventIds = await getEventIds({ admin, userId, galleryIds });

  await removeArtworkFiles({ admin, artworks, steps });
  await clearPublicGallerySlots({ admin, galleryIds, steps });

  await deleteEq({ admin, table: "account_notifications", column: "user_id", value: userId, steps });
  await deleteEq({ admin, table: "account_notifications", column: "actor_profile_id", value: userId, steps });
  await deleteIn({ admin, table: "account_notifications", column: "event_id", values: eventIds, steps });
  await deleteIn({ admin, table: "account_notifications", column: "gallery_id", values: galleryIds, steps });

  await deleteEq({ admin, table: "account_follows", column: "follower_id", value: userId, steps });
  await deleteEq({ admin, table: "account_follows", column: "following_id", value: userId, steps });

  await deleteEq({ admin, table: "favorite_galleries", column: "user_id", value: userId, steps });
  await deleteIn({ admin, table: "favorite_galleries", column: "gallery_id", values: galleryIds, steps });

  await deleteEq({ admin, table: "favorite_artworks", column: "user_id", value: userId, steps });
  await deleteIn({ admin, table: "favorite_artworks", column: "artwork_id", values: artworkIds, steps });

  await deleteEq({ admin, table: "favorites", column: "user_id", value: userId, steps });
  await deleteIn({ admin, table: "favorites", column: "gallery_id", values: galleryIds, steps });
  await deleteIn({ admin, table: "favorites", column: "artwork_id", values: artworkIds, steps });

  for (const table of [
    "gallery_chat_messages",
    "gallery_presence",
    "gallery_inquiries",
    "purchase_inquiries",
    "recent_gallery_visits",
    "email_logs",
  ]) {
    for (const column of [
      "user_id",
      "profile_id",
      "owner_id",
      "sender_id",
      "visitor_id",
      "requester_id",
      "buyer_id",
      "customer_id",
    ]) {
      await deleteEq({ admin, table, column, value: userId, steps });
    }

    await deleteIn({ admin, table, column: "gallery_id", values: galleryIds, steps });
    await deleteIn({ admin, table, column: "artwork_id", values: artworkIds, steps });
  }

  await deleteIn({ admin, table: "gallery_artworks", column: "gallery_id", values: galleryIds, steps, optional: false });
  await deleteIn({ admin, table: "gallery_artworks", column: "artwork_id", values: artworkIds, steps, optional: false });

  await deleteIn({ admin, table: "gallery_events", column: "id", values: eventIds, steps });
  await deleteEq({ admin, table: "gallery_events", column: "owner_id", value: userId, steps });
  await deleteIn({ admin, table: "gallery_events", column: "gallery_id", values: galleryIds, steps });

  await deleteEq({ admin, table: "galleries", column: "owner_id", value: userId, steps, optional: false });
  await deleteEq({ admin, table: "artworks", column: "owner_id", value: userId, steps, optional: false });
  await deleteEq({ admin, table: "profiles", column: "id", value: userId, steps, optional: false });

  if (deleteAuthUser) {
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      throw new Error(
        `Dati pubblici eliminati, ma errore eliminazione Auth: ${authDeleteError.message}`
      );
    }

    steps.push({ table: "auth.users", action: "delete user", count: 1 });
  }

  return {
    deletedUserId: userId,
    deletedProfile: profile,
    galleryIds,
    artworkIds,
    eventIds,
    steps,
  };
}
