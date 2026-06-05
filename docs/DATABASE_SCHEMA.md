# Database Schema — ArtPortalImmersivo

## Principio generale

Il database è la fonte della verità.

Unity WebGL non possiede i dati: li legge, li modifica e li invia al backend.

## Tabelle principali

### profiles

Profilo esteso dell'utente Supabase Auth.

Campi principali:

- id
- email
- full_name
- display_name
- avatar_url
- role
- plan
- bio
- website_url
- instagram_url

Ruoli:

- user
- gallerist
- admin

Piani:

- free
- pro
- business
- institution

---

### gallery_templates

Template di stanze virtuali disponibili.

Campi principali:

- name
- slug
- description
- unity_scene_key
- preview_image_url
- is_free
- is_active
- max_artworks

---

### galleries

Gallerie create da galleristi/artisti/enti.

Campi principali:

- owner_id
- template_id
- title
- slug
- description
- status
- cover_image_url
- published_at

Status:

- draft
- published
- archived

---

### artworks

Opere caricate dagli utenti.

Campi principali:

- owner_id
- title
- artist_name
- year
- technique
- dimensions
- price
- currency
- description
- image_url
- thumbnail_url
- is_for_sale
- is_public

---

### gallery_artworks

Tabella ponte tra gallerie e opere.

Contiene anche i dati di allestimento Unity:

- gallery_id
- artwork_id
- position_x
- position_y
- position_z
- rotation_x
- rotation_y
- rotation_z
- scale_x
- scale_y
- scale_z
- wall_key
- sort_order

---

### favorites

Preferiti degli utenti.

Può puntare a:

- una galleria
- una opera

---

### purchase_inquiries

Richieste informazioni/acquisto.

Campi principali:

- gallery_id
- artwork_id
- requester_id
- requester_name
- requester_email
- requester_message
- status

Status:

- new
- read
- answered
- closed