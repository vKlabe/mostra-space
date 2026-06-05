insert into public.gallery_templates (
  name,
  slug,
  description,
  unity_scene_key,
  is_free,
  is_active,
  max_artworks
)
values
(
  'Stanza Base',
  'stanza-base',
  'Template gratuito iniziale: stanza semplice con pareti bianche, pavimento neutro e illuminazione leggera.',
  'basic_room',
  true,
  true,
  20
),
(
  'White Cube',
  'white-cube',
  'Galleria bianca minimale, pensata per mostre contemporanee pulite e istituzionali.',
  'white_cube',
  true,
  true,
  30
),
(
  'Sala Fondazione',
  'sala-fondazione',
  'Spazio espositivo più elegante, pensato per fondazioni, musei e progetti curatoriali.',
  'foundation_room',
  false,
  true,
  50
)
on conflict (slug) do nothing;