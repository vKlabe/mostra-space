-- ============================================================
-- ArtPortalImmersivo
-- Policies 002 — Profile admin maintenance fix
-- ============================================================

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  /*
    Se auth.uid() è null, molto probabilmente siamo in un contesto server/admin,
    per esempio Supabase SQL Editor, service role o manutenzione backend.

    Le richieste normali da browser/frontend sono comunque protette da RLS.
  */
  if auth.uid() is null then
    return new;
  end if;

  /*
    L'admin può modificare role e plan.
  */
  if public.is_admin() then
    return new;
  end if;

  /*
    Un utente normale può aggiornare solo il proprio profilo.
  */
  if new.id <> auth.uid() then
    raise exception 'You can only update your own profile';
  end if;

  /*
    Un utente normale NON può cambiarsi ruolo.
  */
  if new.role is distinct from old.role then
    raise exception 'You cannot change your own role';
  end if;

  /*
    Un utente normale NON può cambiarsi piano.
  */
  if new.plan is distinct from old.plan then
    raise exception 'You cannot change your own plan';
  end if;

  return new;
end;
$$;