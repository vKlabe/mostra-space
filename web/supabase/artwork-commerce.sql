-- Additive commerce schema. Apply ONCE after the documented preflight.
-- Supabase CLI is unavailable in the recovery environment; this reviewed SQL is
-- kept outside migrations/ to avoid suggesting that the historical files were replayed.
-- All writes go through the server with service_role; browser roles have no access.
begin;

do $$ begin
  if to_regclass('public.commerce_settings') is not null then
    raise exception 'COMMERCE_ALREADY_INSTALLED';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='artworks' and column_name='price' and data_type='numeric') then
    raise exception 'COMMERCE_SCHEMA_MISMATCH';
  end if;
end $$;

create table public.commerce_settings (
  id boolean primary key default true check (id),
  payments_enabled boolean not null default false,
  revision integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.commerce_settings(id,payments_enabled) values(true,false);

create table public.commerce_sellers (
  seller_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text not null unique check (stripe_account_id like 'acct_%'),
  livemode boolean not null,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  disconnected boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.commerce_oauth_states (
  state_hash text primary key,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table public.commerce_listings (
  artwork_id uuid primary key references public.artworks(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  shipping_cents integer not null check (shipping_cents between 0 and 99999999),
  shipping_countries text[] not null check (cardinality(shipping_countries) between 1 and 100),
  terms_url text not null check (terms_url ~ '^https://'),
  updated_at timestamptz not null default now()
);
-- No cascading FKs from the ledger to artworks/profiles: deleting an account or
-- catalog item must not erase financial history. IDs and snapshots are retained.
create table public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null,
  buyer_id uuid not null,
  seller_id uuid not null,
  seller_name text not null,
  artwork_title text not null,
  stripe_account_id text not null,
  livemode boolean not null,
  currency text not null check (currency='eur'),
  artwork_cents integer not null check (artwork_cents > 0),
  shipping_cents integer not null check (shipping_cents >= 0),
  total_cents integer not null check (total_cents between 1 and 99999999),
  fee_cents integer not null check (fee_cents >= 0 and fee_cents < total_cents),
  fee_bps integer not null check (fee_bps between 0 and 9999),
  fee_base text not null check (fee_base in ('artwork','total')),
  refund_application_fee boolean not null,
  terms_url text not null,
  terms_accepted_at timestamptz not null default now(),
  shipping_country text not null,
  buyer_email text not null,
  shipping_details jsonb,
  state text not null default 'reserved' check (state in ('reserved','checkout_open','processing','paid','partially_refunded','refunded','expired','canceled')),
  inventory_held boolean not null default true,
  settings_revision integer not null,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  checkout_expires_at timestamptz not null default (now()+interval '1 hour'),
  last_reconciled_at timestamptz,
  refunded_cents integer not null default 0 check (refunded_cents >= 0 and refunded_cents <= total_cents),
  fulfillment_status text not null default 'unfulfilled' check (fulfillment_status in ('unfulfilled','shipped','delivered')),
  tracking_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents=artwork_cents+shipping_cents),
  unique(stripe_account_id,stripe_payment_intent_id)
);
create unique index commerce_one_held_order_per_artwork on public.commerce_orders(artwork_id) where inventory_held;
create index commerce_orders_buyer on public.commerce_orders(buyer_id,created_at desc);
create index commerce_orders_seller on public.commerce_orders(seller_id,created_at desc);
create index commerce_orders_pending on public.commerce_orders(state,created_at) where state in ('reserved','checkout_open','processing');
create index commerce_orders_reconcile on public.commerce_orders(last_reconciled_at nulls first,created_at) where state in ('reserved','checkout_open','processing');
create index commerce_listings_seller on public.commerce_listings(seller_id);
create index commerce_oauth_states_seller on public.commerce_oauth_states(seller_id);
create table public.commerce_refunds (
  id uuid primary key,
  order_id uuid not null references public.commerce_orders(id),
  requested_by uuid,
  amount_cents integer not null check (amount_cents>0),
  stripe_refund_id text unique,
  state text not null default 'requested' check (state in ('requested','pending','requires_action','succeeded','failed','canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index commerce_refunds_order on public.commerce_refunds(order_id);
create table public.commerce_events (
  stripe_account_id text not null,
  stripe_event_id text not null,
  event_type text not null,
  order_id uuid,
  processed_at timestamptz not null default now(),
  primary key(stripe_account_id,stripe_event_id)
);
create table public.commerce_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  order_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Function is SECURITY INVOKER and executable only by service_role.
-- Actor IDs always come from server-side auth.getUser(), never request JSON.
create function public.commerce_command(p_action text,p_actor uuid,p_data jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  s public.commerce_settings%rowtype;
  a public.artworks%rowtype;
  l public.commerce_listings%rowtype;
  seller public.commerce_sellers%rowtype;
  o public.commerce_orders%rowtype;
  r public.commerce_refunds%rowtype;
  actor_role text;
  v_order uuid;
  v_amount integer;
  v_fee integer;
  v_total integer;
  v_count integer;
  v_state text;
begin
  select role::text into actor_role from public.profiles where id=p_actor;

  if p_action='set_payments' then
    if actor_role is distinct from 'admin' then raise exception 'FORBIDDEN'; end if;
    select * into s from public.commerce_settings where id for update;
    update public.commerce_settings set payments_enabled=(p_data->>'enabled')::boolean,
      revision=revision+1,updated_at=now(),updated_by=p_actor where id returning * into s;
    insert into public.commerce_audit(actor_id,action,details) values(p_actor,'set_payments',jsonb_build_object('enabled',s.payments_enabled,'revision',s.revision));
    return to_jsonb(s);
  end if;

  if p_action='save_listing' then
    select * into s from public.commerce_settings where id for share;
    if not coalesce(s.payments_enabled,false) then raise exception 'PAYMENTS_OFF'; end if;
    select * into a from public.artworks where id=(p_data->>'artwork_id')::uuid for update;
    if a.id is null or a.owner_id<>p_actor or actor_role not in ('gallerist','admin') then raise exception 'FORBIDDEN'; end if;
    if exists(select 1 from public.commerce_orders where artwork_id=a.id and inventory_held) then raise exception 'ARTWORK_UNAVAILABLE'; end if;
    insert into public.commerce_listings(artwork_id,seller_id,enabled,shipping_cents,shipping_countries,terms_url)
    values(a.id,p_actor,(p_data->>'enabled')::boolean,(p_data->>'shipping_cents')::integer,
      array(select jsonb_array_elements_text(p_data->'shipping_countries')),p_data->>'terms_url')
    on conflict(artwork_id) do update set seller_id=excluded.seller_id,enabled=excluded.enabled,
      shipping_cents=excluded.shipping_cents,shipping_countries=excluded.shipping_countries,
      terms_url=excluded.terms_url,updated_at=now() returning * into l;
    return to_jsonb(l);
  end if;

  if p_action='reserve' then
    select * into s from public.commerce_settings where id for share;
    if not coalesce(s.payments_enabled,false) then raise exception 'PAYMENTS_OFF'; end if;
    if actor_role is null or coalesce(p_data->>'buyer_email','')='' then raise exception 'UNAUTHORIZED'; end if;
    select * into a from public.artworks where id=(p_data->>'artwork_id')::uuid for update;
    if a.id is null or not a.is_for_sale or not (a.is_public or public.is_artwork_in_published_gallery(a.id)) then raise exception 'ARTWORK_UNAVAILABLE'; end if;
    if a.owner_id=p_actor then raise exception 'OWN_ARTWORK'; end if;
    -- A retry by the same buyer reuses the same order, session parameters and idempotency key.
    select * into o from public.commerce_orders where artwork_id=a.id and inventory_held;
    if o.id is not null then
      if o.buyer_id=p_actor and o.state in ('reserved','checkout_open') and o.settings_revision=s.revision then return to_jsonb(o); end if;
      raise exception 'ARTWORK_UNAVAILABLE';
    end if;
    select * into l from public.commerce_listings where artwork_id=a.id;
    select * into seller from public.commerce_sellers where seller_id=a.owner_id;
    if l.artwork_id is null or not l.enabled or l.seller_id<>a.owner_id or seller.seller_id is null or seller.disconnected or not seller.charges_enabled or not seller.payouts_enabled or not seller.details_submitted or seller.livemode<>(p_data->>'livemode')::boolean then raise exception 'SELLER_NOT_READY'; end if;
    if lower(a.currency)<>'eur' or a.price is null or a.price<=0 or a.price*100<>trunc(a.price*100) or a.price*100>99999999 then raise exception 'INVALID_PRICE'; end if;
    if not coalesce((p_data->>'terms_accepted')::boolean,false) or not (p_data->>'shipping_country'=any(l.shipping_countries)) then raise exception 'INVALID_TERMS'; end if;
    if (p_data->>'quote_price')::numeric is distinct from a.price or (p_data->>'quote_shipping')::integer is distinct from l.shipping_cents or p_data->>'quote_terms' is distinct from l.terms_url or (p_data->>'quote_version')::timestamptz is distinct from l.updated_at then raise exception 'QUOTE_CHANGED'; end if;
    v_amount=(a.price*100)::integer;
    v_total=v_amount+l.shipping_cents;
    if p_data->>'fee_base' not in ('artwork','total') then raise exception 'NOT_CONFIGURED'; end if;
    v_fee=floor((case when p_data->>'fee_base'='total' then v_total else v_amount end)::numeric*(p_data->>'fee_bps')::integer/10000)::integer;
    insert into public.commerce_orders(artwork_id,buyer_id,seller_id,seller_name,artwork_title,stripe_account_id,livemode,currency,artwork_cents,shipping_cents,total_cents,fee_cents,fee_bps,fee_base,refund_application_fee,terms_url,shipping_country,buyer_email,settings_revision)
    values(a.id,p_actor,a.owner_id,coalesce((select coalesce(display_name,full_name) from public.profiles where id=a.owner_id),'Seller'),a.title,seller.stripe_account_id,seller.livemode,'eur',v_amount,l.shipping_cents,v_total,v_fee,(p_data->>'fee_bps')::integer,p_data->>'fee_base',(p_data->>'refund_application_fee')::boolean,l.terms_url,p_data->>'shipping_country',p_data->>'buyer_email',s.revision)
    returning * into o;
    return to_jsonb(o);
  end if;

  v_order=(p_data->>'order_id')::uuid;
  -- Consistent lock order with OFF/reservation operations.
  if p_action='attach_session' then select * into s from public.commerce_settings where id for share; end if;
  select * into o from public.commerce_orders where id=v_order for update;
  if o.id is null then raise exception 'ORDER_NOT_FOUND'; end if;

  if p_action='attach_session' then
    if o.buyer_id<>p_actor then raise exception 'FORBIDDEN'; end if;
    if o.stripe_session_id is not null and o.stripe_session_id<>p_data->>'session_id' then raise exception 'SESSION_MISMATCH'; end if;
    update public.commerce_orders set stripe_session_id=p_data->>'session_id',
      state=case when state='reserved' then 'checkout_open' else state end,updated_at=now() where id=o.id returning * into o;
    return jsonb_build_object('order',to_jsonb(o),'allowed',coalesce(s.payments_enabled,false) and s.revision=o.settings_revision and o.state='checkout_open');
  end if;

  if p_action='refund_request' then
    if o.seller_id<>p_actor and actor_role is distinct from 'admin' then raise exception 'FORBIDDEN'; end if;
    select * into r from public.commerce_refunds where id=(p_data->>'request_id')::uuid;
    if r.id is not null then
      if r.order_id<>o.id or r.amount_cents<>(p_data->>'amount_cents')::integer then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
      return to_jsonb(r);
    end if;
    if o.state not in ('paid','partially_refunded') or o.stripe_payment_intent_id is null then raise exception 'NOT_REFUNDABLE'; end if;
    v_amount=(p_data->>'amount_cents')::integer;
    select coalesce(sum(amount_cents),0) into v_total from public.commerce_refunds where order_id=o.id and state not in ('failed','canceled');
    if v_amount<=0 or v_total+v_amount>o.total_cents then raise exception 'REFUND_TOO_LARGE'; end if;
    insert into public.commerce_refunds(id,order_id,requested_by,amount_cents) values((p_data->>'request_id')::uuid,o.id,p_actor,v_amount) returning * into r;
    insert into public.commerce_audit(actor_id,action,order_id,details) values(p_actor,'refund_requested',o.id,jsonb_build_object('request_id',r.id,'amount_cents',v_amount));
    return to_jsonb(r);
  end if;

  if p_action='fulfill' then
    if o.seller_id<>p_actor and actor_role is distinct from 'admin' then raise exception 'FORBIDDEN'; end if;
    if o.state not in ('paid','partially_refunded') then raise exception 'ORDER_NOT_PAID'; end if;
    update public.commerce_orders set fulfillment_status=p_data->>'status',tracking_reference=left(p_data->>'tracking',300),updated_at=now() where id=o.id returning * into o;
    insert into public.commerce_audit(actor_id,action,order_id) values(p_actor,'fulfillment_updated',o.id);
    return to_jsonb(o);
  end if;

  -- Remaining actions are authoritative Stripe synchronization. Never gated by OFF.
  if p_actor is not null then raise exception 'FORBIDDEN'; end if;
  if p_data->>'account_id' is distinct from o.stripe_account_id or (p_data->>'livemode')::boolean is distinct from o.livemode then raise exception 'ACCOUNT_MISMATCH'; end if;
  if p_data ? 'event_id' then
    insert into public.commerce_events(stripe_account_id,stripe_event_id,event_type,order_id)
      values(o.stripe_account_id,p_data->>'event_id',p_data->>'event_type',o.id) on conflict do nothing;
    get diagnostics v_count=row_count;
    if v_count=0 then return to_jsonb(o); end if;
  end if;

  if p_action in ('paid','processing','expired') then
    if coalesce(o.stripe_session_id,p_data->>'session_id') is distinct from p_data->>'session_id'
      or (p_data->>'total_cents')::integer is distinct from o.total_cents
      or p_data->>'currency' is distinct from o.currency then raise exception 'PAYMENT_MISMATCH'; end if;
    if p_action in ('paid','processing') and o.stripe_payment_intent_id is not null and o.stripe_payment_intent_id is distinct from p_data->>'payment_intent_id' then raise exception 'PAYMENT_MISMATCH'; end if;
    if p_action='paid' then
      if coalesce(p_data->>'payment_intent_id','')='' then raise exception 'PAYMENT_MISMATCH'; end if;
      if o.stripe_payment_intent_id is not null and o.stripe_payment_intent_id<>p_data->>'payment_intent_id' then raise exception 'PAYMENT_MISMATCH'; end if;
      update public.commerce_orders set stripe_session_id=p_data->>'session_id',stripe_payment_intent_id=p_data->>'payment_intent_id',
        state=case when state in ('partially_refunded','refunded') then state else 'paid' end,inventory_held=true,
        shipping_details=coalesce(p_data->'shipping_details',shipping_details),updated_at=now() where id=o.id returning * into o;
      update public.artworks set is_for_sale=false where id=o.artwork_id;
    elsif p_action='processing' and o.state in ('reserved','checkout_open') then
      update public.commerce_orders set stripe_session_id=p_data->>'session_id',stripe_payment_intent_id=p_data->>'payment_intent_id',state='processing',updated_at=now() where id=o.id returning * into o;
    elsif p_action='expired' and o.state in ('reserved','checkout_open') then
      update public.commerce_orders set stripe_session_id=p_data->>'session_id',state='expired',inventory_held=false,updated_at=now() where id=o.id returning * into o;
    end if;
    return to_jsonb(o);
  end if;

  if p_action='payment_canceled' then
    if p_data->>'payment_intent_id' is distinct from o.stripe_payment_intent_id
      or (p_data->>'total_cents')::integer is distinct from o.total_cents
      or p_data->>'currency' is distinct from o.currency then raise exception 'PAYMENT_MISMATCH'; end if;
    if o.state='processing' then
      update public.commerce_orders set state='canceled',inventory_held=false,updated_at=now() where id=o.id returning * into o;
    end if;
    return to_jsonb(o);
  end if;

  if p_action='refund_sync' then
    if p_data->>'payment_intent_id' is distinct from o.stripe_payment_intent_id then raise exception 'PAYMENT_MISMATCH'; end if;
    select * into r from public.commerce_refunds where stripe_refund_id=p_data->>'refund_id' or id=nullif(p_data->>'request_id','')::uuid for update;
    v_state=p_data->>'state';
    if v_state not in ('pending','requires_action','succeeded','failed','canceled') then raise exception 'INVALID_REFUND_STATE'; end if;
    if r.id is not null then
      if r.order_id<>o.id or r.amount_cents<>(p_data->>'amount_cents')::integer or (r.stripe_refund_id is not null and r.stripe_refund_id<>p_data->>'refund_id') then raise exception 'REFUND_MISMATCH'; end if;
      -- Terminal results are never downgraded by a late pending event.
      if r.state in ('succeeded','failed','canceled') then v_state=r.state; end if;
      update public.commerce_refunds set stripe_refund_id=p_data->>'refund_id',state=v_state,updated_at=now() where id=r.id;
    else
      insert into public.commerce_refunds(id,order_id,amount_cents,stripe_refund_id,state)
        values(gen_random_uuid(),o.id,(p_data->>'amount_cents')::integer,p_data->>'refund_id',v_state);
    end if;
    select coalesce(sum(amount_cents),0) into v_total from public.commerce_refunds where order_id=o.id and state='succeeded';
    if v_total>o.total_cents then raise exception 'REFUND_TOO_LARGE'; end if;
    update public.commerce_orders set refunded_cents=v_total,
      state=case when v_total=total_cents then 'refunded' when v_total>0 then 'partially_refunded' else state end,
      updated_at=now() where id=o.id returning * into o;
    -- Never relist a unique physical artwork automatically after refund.
    return to_jsonb(o);
  end if;
  raise exception 'UNKNOWN_ACTION';
end $$;

do $$ declare t text; begin
  foreach t in array array['commerce_settings','commerce_sellers','commerce_oauth_states','commerce_listings','commerce_orders','commerce_refunds','commerce_events','commerce_audit'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
end $$;
revoke all on function public.commerce_command(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.commerce_command(text,uuid,jsonb) to service_role;
commit;
