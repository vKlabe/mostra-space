-- ============================================================
-- ArtPortalImmersivo
-- Policies 003 — Gallery artworks ownership hardening
-- ============================================================

create or replace function public.can_manage_gallery_artwork(
  target_gallery_id uuid,
  target_artwork_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_admin()
    or (
      public.is_gallery_owner(target_gallery_id)
      and public.is_artwork_owner(target_artwork_id)
    ),
    false
  );
$$;

drop policy if exists "gallery_artworks_insert_gallery_owner_or_admin" on public.gallery_artworks;
drop policy if exists "gallery_artworks_update_gallery_owner_or_admin" on public.gallery_artworks;
drop policy if exists "gallery_artworks_delete_gallery_owner_or_admin" on public.gallery_artworks;

create policy "gallery_artworks_insert_gallery_owner_and_artwork_owner_or_admin"
on public.gallery_artworks
for insert
to authenticated
with check (
  public.can_manage_gallery_artwork(gallery_id, artwork_id)
);

create policy "gallery_artworks_update_gallery_owner_and_artwork_owner_or_admin"
on public.gallery_artworks
for update
to authenticated
using (
  public.can_manage_gallery_artwork(gallery_id, artwork_id)
)
with check (
  public.can_manage_gallery_artwork(gallery_id, artwork_id)
);

create policy "gallery_artworks_delete_gallery_owner_and_artwork_owner_or_admin"
on public.gallery_artworks
for delete
to authenticated
using (
  public.can_manage_gallery_artwork(gallery_id, artwork_id)
);

grant execute on function public.can_manage_gallery_artwork(uuid, uuid) to authenticated;