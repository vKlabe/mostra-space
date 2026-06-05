-- ============================================================
-- ArtPortalImmersivo
-- Migration 001 — Initial Schema
-- ============================================================

-- Estensione utile per generare UUID.
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'gallerist', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_plan') then
    create type public.subscription_plan as enum ('free', 'pro', 'business', 'institution');
  end if;

  if not exists (select 1 from pg_type where typname = 'gallery_status') then
    create type public.gallery_status as enum ('draft', 'published', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'favorite_target_type') then
    create type public.favorite_target_type as enum ('gallery', 'artwork');
  end if;

  if not exists (select 1 from pg_type where typname = 'inquiry_status') then
    create type public.inquiry_status as enum ('new', 'read', 'answered', 'closed');
  end if;
end $$;

-- ============================================================
-- 2. UPDATED_AT TRIGGER FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 3. PROFILES
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  email text,
  full_name text,
  display_name text,
  avatar_url text,

  role public.app_role not null default 'user',
  plan public.subscription_plan not null default 'free',

  bio text,
  website_url text,
  instagram_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- ============================================================
-- 4. HANDLE NEW AUTH USER
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    display_name,
    role,
    plan
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    'user',
    'free'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ============================================================
-- 5. GALLERY TEMPLATES
-- ============================================================

create table if not exists public.gallery_templates (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  slug text not null unique,
  description text,

  unity_scene_key text not null default 'basic_room',
  preview_image_url text,

  is_free boolean not null default true,
  is_active boolean not null default true,

  max_artworks integer not null default 20,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_gallery_templates_updated_at on public.gallery_templates;

create trigger set_gallery_templates_updated_at
before update on public.gallery_templates
for each row
execute function public.set_updated_at();

-- ============================================================
-- 6. GALLERIES
-- ============================================================

create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid references public.gallery_templates(id) on delete set null,

  title text not null,
  slug text not null unique,
  description text,

  status public.gallery_status not null default 'draft',

  cover_image_url text,

  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_galleries_updated_at on public.galleries;

create trigger set_galleries_updated_at
before update on public.galleries
for each row
execute function public.set_updated_at();

create index if not exists galleries_owner_id_idx
on public.galleries(owner_id);

create index if not exists galleries_status_idx
on public.galleries(status);

create index if not exists galleries_slug_idx
on public.galleries(slug);

-- ============================================================
-- 7. ARTWORKS
-- ============================================================

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null references public.profiles(id) on delete cascade,

  title text not null,
  artist_name text,
  year text,
  technique text,
  dimensions text,
  price numeric(12, 2),
  currency text not null default 'EUR',
  description text,

  image_url text not null,
  thumbnail_url text,

  is_for_sale boolean not null default true,
  is_public boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_artworks_updated_at on public.artworks;

create trigger set_artworks_updated_at
before update on public.artworks
for each row
execute function public.set_updated_at();

create index if not exists artworks_owner_id_idx
on public.artworks(owner_id);

create index if not exists artworks_is_public_idx
on public.artworks(is_public);

-- ============================================================
-- 8. GALLERY ARTWORKS
-- Qui salviamo posizione, rotazione e scala nel mondo Unity.
-- ============================================================

create table if not exists public.gallery_artworks (
  id uuid primary key default gen_random_uuid(),

  gallery_id uuid not null references public.galleries(id) on delete cascade,
  artwork_id uuid not null references public.artworks(id) on delete cascade,

  -- Posizione Unity
  position_x numeric(10, 4) not null default 0,
  position_y numeric(10, 4) not null default 1.5,
  position_z numeric(10, 4) not null default 0,

  -- Rotazione Unity in gradi
  rotation_x numeric(10, 4) not null default 0,
  rotation_y numeric(10, 4) not null default 0,
  rotation_z numeric(10, 4) not null default 0,

  -- Scala Unity
  scale_x numeric(10, 4) not null default 1,
  scale_y numeric(10, 4) not null default 1,
  scale_z numeric(10, 4) not null default 1,

  -- Dati utili per editor
  wall_key text,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(gallery_id, artwork_id)
);

drop trigger if exists set_gallery_artworks_updated_at on public.gallery_artworks;

create trigger set_gallery_artworks_updated_at
before update on public.gallery_artworks
for each row
execute function public.set_updated_at();

create index if not exists gallery_artworks_gallery_id_idx
on public.gallery_artworks(gallery_id);

create index if not exists gallery_artworks_artwork_id_idx
on public.gallery_artworks(artwork_id);

-- ============================================================
-- 9. FAVORITES
-- ============================================================

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.profiles(id) on delete cascade,

  target_type public.favorite_target_type not null,
  gallery_id uuid references public.galleries(id) on delete cascade,
  artwork_id uuid references public.artworks(id) on delete cascade,

  created_at timestamptz not null default now(),

  constraint favorites_target_check check (
    (
      target_type = 'gallery'
      and gallery_id is not null
      and artwork_id is null
    )
    or
    (
      target_type = 'artwork'
      and artwork_id is not null
      and gallery_id is null
    )
  )
);

create index if not exists favorites_user_id_idx
on public.favorites(user_id);

create unique index if not exists favorites_unique_gallery_idx
on public.favorites(user_id, gallery_id)
where gallery_id is not null;

create unique index if not exists favorites_unique_artwork_idx
on public.favorites(user_id, artwork_id)
where artwork_id is not null;

-- ============================================================
-- 10. PURCHASE INQUIRIES
-- Richieste informazioni/acquisto.
-- ============================================================

create table if not exists public.purchase_inquiries (
  id uuid primary key default gen_random_uuid(),

  gallery_id uuid references public.galleries(id) on delete set null,
  artwork_id uuid references public.artworks(id) on delete set null,

  requester_id uuid references public.profiles(id) on delete set null,

  requester_name text,
  requester_email text not null,
  requester_message text not null,

  status public.inquiry_status not null default 'new',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_purchase_inquiries_updated_at on public.purchase_inquiries;

create trigger set_purchase_inquiries_updated_at
before update on public.purchase_inquiries
for each row
execute function public.set_updated_at();

create index if not exists purchase_inquiries_gallery_id_idx
on public.purchase_inquiries(gallery_id);

create index if not exists purchase_inquiries_artwork_id_idx
on public.purchase_inquiries(artwork_id);

create index if not exists purchase_inquiries_requester_id_idx
on public.purchase_inquiries(requester_id);

-- ============================================================
-- 11. SEED BASE TEMPLATE
-- Template stanza iniziale gratuita.
-- ============================================================

insert into public.gallery_templates (
  name,
  slug,
  description,
  unity_scene_key,
  is_free,
  is_active,
  max_artworks
)
values (
  'Stanza Base',
  'stanza-base',
  'Template gratuito iniziale: stanza semplice con pareti bianche, pavimento neutro e illuminazione leggera.',
  'basic_room',
  true,
  true,
  20
)
on conflict (slug) do nothing;

-- ============================================================
-- 12. ENABLE ROW LEVEL SECURITY
-- Le policy vere le creiamo nella FASE 4.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.gallery_templates enable row level security;
alter table public.galleries enable row level security;
alter table public.artworks enable row level security;
alter table public.gallery_artworks enable row level security;
alter table public.favorites enable row level security;
alter table public.purchase_inquiries enable row level security;