begin;

alter table public.artworks
  add column if not exists card_url text,
  add column if not exists image_pipeline_version integer not null default 0,
  add column if not exists image_variants_generated_at timestamptz,
  add column if not exists image_processing_error text;

comment on column public.artworks.card_url is
  'Public URL of the WebP card variant (maximum long side: 960 px).';

comment on column public.artworks.image_pipeline_version is
  '0 = legacy/unprocessed; positive values identify the generated image variant pipeline version.';

comment on column public.artworks.image_variants_generated_at is
  'Timestamp of the last successful generation of all expected web variants.';

comment on column public.artworks.image_processing_error is
  'Most recent image variant processing error. NULL after successful processing.';

commit;

-- Verification query (read-only):
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'artworks'
  and column_name in (
    'card_url',
    'image_pipeline_version',
    'image_variants_generated_at',
    'image_processing_error'
  )
order by column_name;
