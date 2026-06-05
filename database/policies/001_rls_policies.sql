-- ============================================================
-- ArtPortalImmersivo
-- Policies 001 — Row Level Security
-- ============================================================

-- ============================================================
-- 1. HELPER FUNCTIONS
-- Funzioni helper usate dalle policy.
-- SECURITY DEFINER evita problemi di ricorsione RLS quando
-- controlliamo ruoli e proprietà.
-- ============================================================

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role = 'admin'
      from public.profiles
      where id = auth.uid()
      limit 1
    ),
    false
  );
$$;

create or replace function public.is_gallerist_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role in ('gallerist', 'admin')
      from public.profiles
      where id = auth.uid()
      limit 1
    ),
    false
  );
$$;

create or replace function public.is_gallery_owner(target_gallery_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select owner_id = auth.uid()
      from public.galleries
      where id = target_gallery_id
      limit 1
    ),
    false
  );
$$;

create or replace function public.is_artwork_owner(target_artwork_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select owner_id = auth.uid()
      from public.artworks
      where id = target_artwork_id
      limit 1
    ),
    false
  );
$$;

create or replace function public.is_gallery_published(target_gallery_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select status = 'published'
      from public.galleries
      where id = target_gallery_id
      limit 1
    ),
    false
  );
$$;

-- ============================================================
-- 2. PROTEZIONE PROFILI
-- Impedisce a un utente normale di cambiarsi role/plan da solo.
-- ============================================================

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.id <> auth.uid() then
    raise exception 'You can only update your own profile';
  end if;

  if new.role is distinct from old.role then
    raise exception 'You cannot change your own role';
  end if;

  if new.plan is distinct from old.plan then
    raise exception 'You cannot change your own plan';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_escalation_trigger on public.profiles;

create trigger prevent_profile_privilege_escalation_trigger
before update on public.profiles
for each row
execute function public.prevent_profile_privilege_escalation();

-- ============================================================
-- 3. ENABLE RLS
-- Se erano già attive, non succede nulla di grave.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.gallery_templates enable row level security;
alter table public.galleries enable row level security;
alter table public.artworks enable row level security;
alter table public.gallery_artworks enable row level security;
alter table public.favorites enable row level security;
alter table public.purchase_inquiries enable row level security;

-- ============================================================
-- 4. DROP OLD POLICIES
-- Così puoi rieseguire questo script senza duplicare policy.
-- ============================================================

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;

drop policy if exists "gallery_templates_select_active_or_admin" on public.gallery_templates;
drop policy if exists "gallery_templates_admin_insert" on public.gallery_templates;
drop policy if exists "gallery_templates_admin_update" on public.gallery_templates;
drop policy if exists "gallery_templates_admin_delete" on public.gallery_templates;

drop policy if exists "galleries_select_published_or_owner_or_admin" on public.galleries;
drop policy if exists "galleries_insert_owner_gallerist_or_admin" on public.galleries;
drop policy if exists "galleries_update_owner_or_admin" on public.galleries;
drop policy if exists "galleries_delete_owner_or_admin" on public.galleries;

drop policy if exists "artworks_select_public_or_owner_or_admin" on public.artworks;
drop policy if exists "artworks_insert_owner_gallerist_or_admin" on public.artworks;
drop policy if exists "artworks_update_owner_or_admin" on public.artworks;
drop policy if exists "artworks_delete_owner_or_admin" on public.artworks;

drop policy if exists "gallery_artworks_select_public_gallery_or_owner_or_admin" on public.gallery_artworks;
drop policy if exists "gallery_artworks_insert_gallery_owner_or_admin" on public.gallery_artworks;
drop policy if exists "gallery_artworks_update_gallery_owner_or_admin" on public.gallery_artworks;
drop policy if exists "gallery_artworks_delete_gallery_owner_or_admin" on public.gallery_artworks;

drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;

drop policy if exists "purchase_inquiries_insert_anyone" on public.purchase_inquiries;
drop policy if exists "purchase_inquiries_select_owner_or_requester_or_admin" on public.purchase_inquiries;
drop policy if exists "purchase_inquiries_update_owner_or_admin" on public.purchase_inquiries;
drop policy if exists "purchase_inquiries_delete_admin" on public.purchase_inquiries;

-- ============================================================
-- 5. PROFILES POLICIES
-- ============================================================

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
);

create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
)
with check (
  id = auth.uid()
  or public.is_admin()
);

-- ============================================================
-- 6. GALLERY TEMPLATES POLICIES
-- ============================================================

create policy "gallery_templates_select_active_or_admin"
on public.gallery_templates
for select
to anon, authenticated
using (
  is_active = true
  or public.is_admin()
);

create policy "gallery_templates_admin_insert"
on public.gallery_templates
for insert
to authenticated
with check (
  public.is_admin()
);

create policy "gallery_templates_admin_update"
on public.gallery_templates
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

create policy "gallery_templates_admin_delete"
on public.gallery_templates
for delete
to authenticated
using (
  public.is_admin()
);

-- ============================================================
-- 7. GALLERIES POLICIES
-- ============================================================

create policy "galleries_select_published_or_owner_or_admin"
on public.galleries
for select
to anon, authenticated
using (
  status = 'published'
  or owner_id = auth.uid()
  or public.is_admin()
);

create policy "galleries_insert_owner_gallerist_or_admin"
on public.galleries
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.is_gallerist_or_admin()
);

create policy "galleries_update_owner_or_admin"
on public.galleries
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.is_admin()
)
with check (
  owner_id = auth.uid()
  or public.is_admin()
);

create policy "galleries_delete_owner_or_admin"
on public.galleries
for delete
to authenticated
using (
  owner_id = auth.uid()
  or public.is_admin()
);

-- ============================================================
-- 8. ARTWORKS POLICIES
-- ============================================================

create policy "artworks_select_public_or_owner_or_admin"
on public.artworks
for select
to anon, authenticated
using (
  is_public = true
  or owner_id = auth.uid()
  or public.is_admin()
);

create policy "artworks_insert_owner_gallerist_or_admin"
on public.artworks
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.is_gallerist_or_admin()
);

create policy "artworks_update_owner_or_admin"
on public.artworks
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.is_admin()
)
with check (
  owner_id = auth.uid()
  or public.is_admin()
);

create policy "artworks_delete_owner_or_admin"
on public.artworks
for delete
to authenticated
using (
  owner_id = auth.uid()
  or public.is_admin()
);

-- ============================================================
-- 9. GALLERY ARTWORKS POLICIES
-- Dati di posizionamento Unity.
-- ============================================================

create policy "gallery_artworks_select_public_gallery_or_owner_or_admin"
on public.gallery_artworks
for select
to anon, authenticated
using (
  public.is_gallery_published(gallery_id)
  or public.is_gallery_owner(gallery_id)
  or public.is_admin()
);

create policy "gallery_artworks_insert_gallery_owner_or_admin"
on public.gallery_artworks
for insert
to authenticated
with check (
  public.is_gallery_owner(gallery_id)
  or public.is_admin()
);

create policy "gallery_artworks_update_gallery_owner_or_admin"
on public.gallery_artworks
for update
to authenticated
using (
  public.is_gallery_owner(gallery_id)
  or public.is_admin()
)
with check (
  public.is_gallery_owner(gallery_id)
  or public.is_admin()
);

create policy "gallery_artworks_delete_gallery_owner_or_admin"
on public.gallery_artworks
for delete
to authenticated
using (
  public.is_gallery_owner(gallery_id)
  or public.is_admin()
);

-- ============================================================
-- 10. FAVORITES POLICIES
-- ============================================================

create policy "favorites_select_own"
on public.favorites
for select
to authenticated
using (
  user_id = auth.uid()
);

create policy "favorites_insert_own"
on public.favorites
for insert
to authenticated
with check (
  user_id = auth.uid()
);

create policy "favorites_delete_own"
on public.favorites
for delete
to authenticated
using (
  user_id = auth.uid()
);

-- ============================================================
-- 11. PURCHASE INQUIRIES POLICIES
-- ============================================================

create policy "purchase_inquiries_insert_anyone"
on public.purchase_inquiries
for insert
to anon, authenticated
with check (
  requester_email is not null
  and length(trim(requester_email)) > 3
  and requester_message is not null
  and length(trim(requester_message)) > 0
);

create policy "purchase_inquiries_select_owner_or_requester_or_admin"
on public.purchase_inquiries
for select
to authenticated
using (
  requester_id = auth.uid()
  or public.is_admin()
  or (
    gallery_id is not null
    and public.is_gallery_owner(gallery_id)
  )
  or (
    artwork_id is not null
    and public.is_artwork_owner(artwork_id)
  )
);

create policy "purchase_inquiries_update_owner_or_admin"
on public.purchase_inquiries
for update
to authenticated
using (
  public.is_admin()
  or (
    gallery_id is not null
    and public.is_gallery_owner(gallery_id)
  )
  or (
    artwork_id is not null
    and public.is_artwork_owner(artwork_id)
  )
)
with check (
  public.is_admin()
  or (
    gallery_id is not null
    and public.is_gallery_owner(gallery_id)
  )
  or (
    artwork_id is not null
    and public.is_artwork_owner(artwork_id)
  )
);

create policy "purchase_inquiries_delete_admin"
on public.purchase_inquiries
for delete
to authenticated
using (
  public.is_admin()
);

-- ============================================================
-- 12. GRANTS
-- Permessi base per usare funzioni helper da policy/client.
-- ============================================================

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_gallerist_or_admin() to authenticated;
grant execute on function public.is_gallery_owner(uuid) to authenticated;
grant execute on function public.is_artwork_owner(uuid) to authenticated;
grant execute on function public.is_gallery_published(uuid) to anon, authenticated;