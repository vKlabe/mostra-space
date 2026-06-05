# Architettura ArtPortalImmersivo

## Obiettivo

Creare una piattaforma web immersiva per arte e gallerie virtuali, accessibile da browser PC e smartphone, con futura estensione VR.

## Componenti principali

### 1. Frontend Web

Responsabilità:

- homepage
- login/register
- dashboard gallerista
- profili utenti
- upload opere
- pagine pubbliche gallerie
- embed Unity WebGL
- richieste acquisto
- pagamenti futuri

Tecnologia:

- Next.js
- TypeScript
- Tailwind CSS

### 2. Backend Supabase

Responsabilità:

- Auth
- Database PostgreSQL
- Storage immagini
- Realtime futuro
- Row Level Security

### 3. Unity WebGL

Responsabilità:

- visualizzazione 3D
- editor galleria
- caricamento opere da URL
- posizionamento opere
- salvataggio layout tramite backend/API

### 4. Storage

Responsabilità:

- immagini opere
- thumbnail
- asset futuri

### 5. Pagamenti

Responsabilità futura:

- abbonamenti
- piani gallerista
- limiti account
- eventuali commissioni marketplace

Tecnologia prevista:

- Stripe

## Principio guida

Unity non possiede i dati.

Unity riceve dati dal backend, li visualizza, permette modifiche e invia aggiornamenti.

Il database rimane la fonte della verità.