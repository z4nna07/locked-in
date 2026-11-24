-- Nuovo tipo di categoria: sonno.
-- Una registrazione per notte, con day = giorno del risveglio,
-- amount = minuti dormiti, details = { "bed": "23:40", "wake": "07:10" }.
alter table public.categories drop constraint categories_kind_check;
alter table public.categories add constraint categories_kind_check
  check (kind in ('gym', 'run', 'food', 'study', 'project', 'check', 'sleep'));

-- Le abitudini "Sonno" create come semplice si'/no diventano categorie sonno (obiettivo 8 h a notte).
update public.categories
set kind = 'sleep',
    icon = 'moon',
    options = options || '{"target_hours": 8}'::jsonb
where kind = 'check' and lower(trim(name)) = 'sonno';
