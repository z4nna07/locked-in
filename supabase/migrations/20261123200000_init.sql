-- Locked In: schema iniziale
-- Ogni tabella appartiene a un utente; le policy RLS limitano lettura e scrittura ai propri dati.

-- Categorie tracciate (Palestra, Corsa, Alimentazione, Studio, Progetti, personalizzate)
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('gym', 'run', 'food', 'study', 'project', 'check')),
  name text not null check (char_length(name) between 1 and 40),
  icon text not null default 'check' check (char_length(icon) <= 20),
  weekly_goal numeric not null default 3 check (weekly_goal >= 0 and weekly_goal <= 1000),
  options jsonb not null default '{}'::jsonb,
  position int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index categories_user_idx on public.categories (user_id, position);

-- Registrazioni giornaliere. amount dipende dal tipo:
-- gym = minuti, run = km, food = voto 1-3, study/project = minuti, check = 1
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  day date not null,
  amount numeric not null default 1 check (amount >= 0 and amount <= 100000),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index entries_user_day_idx on public.entries (user_id, day);
create index entries_category_day_idx on public.entries (category_id, day);

-- Peso corporeo, al massimo uno al giorno
create table public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  kg numeric not null check (kg between 20 and 400),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

-- Schede della palestra: exercises = [{ "name": "Panca piana", "sets": 4, "reps": 8 }]
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  exercises jsonb not null default '[]'::jsonb,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index templates_user_idx on public.templates (user_id, position);

-- Aggiorna updated_at sulle modifiche
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger entries_touch before update on public.entries
  for each row execute function public.touch_updated_at();

-- Row Level Security
alter table public.categories enable row level security;
alter table public.entries enable row level security;
alter table public.weights enable row level security;
alter table public.templates enable row level security;

create policy "own categories" on public.categories for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own entries" on public.entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own weights" on public.weights for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own templates" on public.templates for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
