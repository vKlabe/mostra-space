# Sicurezza

## Regola principale

Mai inserire la Supabase service role key nel frontend o in Unity WebGL.

## Chiavi Supabase

### Anon key

Può essere usata nel frontend se le tabelle sono protette con RLS.

### Service role key

È una chiave amministrativa.

Deve essere usata solo in ambienti server-side:

- API routes protette
- Supabase Edge Functions
- processi backend
- webhook Stripe

Non deve mai essere visibile nel browser.

## Unity WebGL

Unity WebGL gira lato client.

Tutto ciò che viene inserito nella build può essere potenzialmente ispezionato.

Quindi Unity deve usare:

- dati pubblici;
- token utente;
- API protette;
- regole RLS;
- mai chiavi amministrative.

## Row Level Security

Tutte le tabelle pubbliche devono avere RLS abilitata.

Ogni utente deve poter leggere/modificare solo i dati consentiti dal proprio ruolo.

## Gestione ruoli

I ruoli principali della piattaforma sono:

- user
- gallerist
- admin

Un nuovo account nasce sempre come:

role = user  
plan = free

Solo un admin o un contesto server sicuro deve poter modificare role e plan.

La dashboard gallerista è accessibile solo a:

- gallerist
- admin

La modifica manuale dei ruoli in sviluppo può essere fatta da Supabase SQL Editor:

```sql
update public.profiles
set role = 'gallerist'
where email = 'email@example.com';