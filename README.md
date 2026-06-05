# ArtPortalImmersivo

Piattaforma web immersiva per arte, gallerie virtuali, marketplace e future esperienze VR.

## Architettura

- Frontend: Next.js + TypeScript
- Backend/Auth/Database/Storage: Supabase
- Esperienza 3D: Unity 6000.3.12f1 URP WebGL
- Hosting frontend: Vercel
- Pagamenti futuri: Stripe
- Realtime futuro: Supabase Realtime

## Regola fondamentale

Database = fonte della verità  
Unity = esperienza 3D  
Sito web = portale gestionale  
Storage = immagini e asset  
Backend/API = sicurezza e logica protetta

## Sicurezza

La Supabase service role key NON deve mai essere inserita:

- dentro Unity WebGL;
- nel frontend;
- in repository Git;
- in file pubblici.

Unity WebGL è codice lato client e può essere ispezionato.

## MVP 1

- Login/Register
- Ruoli user/gallerista/admin
- Dashboard gallerista
- Creazione galleria
- Upload opere
- Editor Unity WebGL
- Salvataggio layout
- Pubblicazione galleria
- Link pubblico
- Viewer browser
- Richiesta informazioni/acquisto