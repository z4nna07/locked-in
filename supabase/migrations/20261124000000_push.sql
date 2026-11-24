-- Notifiche push: dispositivi iscritti, promemoria e controllo automatico ogni 5 minuti.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Un dispositivo (browser o app installata) che riceve le notifiche
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  timezone text not null default 'Europe/Rome' check (char_length(timezone) <= 64),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Promemoria: per categoria, "segna la giornata" o "streak a rischio".
-- days: giorni ISO della settimana (1 = lunedi ... 7 = domenica).
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('category', 'daily_log', 'streak_risk')),
  category_id uuid references public.categories (id) on delete cascade,
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  days smallint[] not null default '{1,2,3,4,5,6,7}' check (days <@ '{1,2,3,4,5,6,7}'::smallint[]),
  enabled boolean not null default true,
  last_sent_on date,
  created_at timestamptz not null default now(),
  constraint reminders_one_per_kind unique nulls not distinct (user_id, kind, category_id),
  constraint reminders_category_needed check ((kind = 'category') = (category_id is not null))
);

alter table public.push_subscriptions enable row level security;
alter table public.reminders enable row level security;

create policy "own subscriptions" on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own reminders" on public.reminders for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Ogni 5 minuti chiama la funzione che invia i promemoria dovuti.
-- Il segreto condiviso sta nel Vault (creato a parte, mai scritto nel codice).
select cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://bxavldcdzhvgqrjcgomu.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
