-- ============================================================
-- ArtPortalImmersivo
-- Policies 004 — Public artworks inside published galleries
-- ============================================================

create or replace function public.is_artwork_in_published_gallery(
  target_artwork_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gallery_artworks ga
    join public.galleries g on g.id = ga.gallery_id
    where ga.artwork_id = target_artwork_id
      and g.status = 'published'
  );
$$;

drop policy if exists "artworks_select_public_or_owner_or_admin" on public.artworks;

create policy "artworks_select_public_or_owner_or_admin"
on public.artworks
for select
to anon, authenticated
using (
  is_public = true
  or owner_id = auth.uid()
  or public.is_admin()
  or public.is_artwork_in_published_gallery(id)
);

grant execute on function public.is_artwork_in_published_gallery(uuid) to anon, authenticated;