-- ============================================================
-- ArtPortalImmersivo
-- Storage 001 — Artworks Bucket
-- ============================================================

-- 1. Crea bucket pubblico per immagini opere.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'artworks',
  'artworks',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- 2. Pulisci policy precedenti
-- ============================================================

drop policy if exists "artworks_storage_public_read" on storage.objects;
drop policy if exists "artworks_storage_insert_own_folder" on storage.objects;
drop policy if exists "artworks_storage_update_own_folder" on storage.objects;
drop policy if exists "artworks_storage_delete_own_folder" on storage.objects;

-- ============================================================
-- 3. Lettura pubblica immagini opere
-- ============================================================

create policy "artworks_storage_public_read"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'artworks'
);

-- ============================================================
-- 4. Upload solo nella propria cartella utente
--
-- Il path sarà:
-- artworks / user_id / nome-file
--
-- Esempio:
-- artworks/7f3...uuid.../opera-123.webp
-- ============================================================

create policy "artworks_storage_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 5. Update solo nella propria cartella
-- ============================================================

create policy "artworks_storage_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 6. Delete solo nella propria cartella
-- ============================================================

create policy "artworks_storage_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1] = auth.uid()::text
);