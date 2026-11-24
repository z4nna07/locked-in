-- Rafforzamento dopo la revisione di sicurezza.

-- 1) Le registrazioni e i promemoria possono riferirsi solo a categorie dello stesso utente.
alter table public.categories add constraint categories_id_user_unique unique (id, user_id);

alter table public.entries drop constraint entries_category_id_fkey;
alter table public.entries add constraint entries_category_same_user
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade;

alter table public.reminders drop constraint reminders_category_id_fkey;
alter table public.reminders add constraint reminders_category_same_user
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade;

-- 2) Dispositivi push: solo i servizi di notifica reali (Google, Mozilla, Apple, Microsoft) e lunghezze limitate.
alter table public.push_subscriptions add constraint push_endpoint_known_service check (
  char_length(endpoint) <= 1000 and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)/'
);
alter table public.push_subscriptions add constraint push_keys_length check (char_length(p256dh) <= 200 and char_length(auth) <= 100);

-- 3) Dimensioni e intervalli ragionevoli (evita di riempire il database per errore).
alter table public.entries add constraint entries_details_size check (pg_column_size(details) < 32768);
alter table public.entries add constraint entries_day_range check (day between date '2000-01-01' and date '2100-12-31');
alter table public.categories add constraint categories_options_size check (pg_column_size(options) < 16384);
alter table public.templates add constraint templates_exercises_size check (pg_column_size(exercises) < 32768);
alter table public.weights add constraint weights_day_range check (day between date '2000-01-01' and date '2100-12-31');
