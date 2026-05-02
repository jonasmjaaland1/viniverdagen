-- =====================================================
-- VinIverdagen - Databaseskjema
-- =====================================================
-- Kjør hele denne filen i Supabase SQL Editor
-- =====================================================

-- ============== UTVIDELSER ==============
create extension if not exists "pg_trgm"; -- For fuzzy søk på vinnavn

-- ============== TABELLER ==============

-- Medlemmer (utvider Supabase auth.users)
create table public.medlemmer (
  id uuid primary key references auth.users(id) on delete cascade,
  navn text not null,
  epost text not null unique,
  godkjent boolean not null default false,
  er_admin boolean not null default false,
  opprettet_at timestamptz not null default now()
);

-- Vinmonopol-katalog (synkroniseres fra Vinmonopolets API)
create table public.vinmonopol_produkter (
  varenummer text primary key,
  navn text not null,
  produkttype text,        -- "Rødvin", "Hvitvin", "Musserende vin", osv.
  hovedkategori text,      -- forenklet kategori for filtrering
  land text,
  distrikt text,
  underdistrikt text,
  argang text,
  druer text[],            -- array av druenavn
  alkoholprosent numeric,
  pris numeric,
  pris_per_liter numeric,
  volum numeric,           -- i liter
  produsent text,
  bilde_url text,
  produkt_url text,
  lukt text,
  smak text,
  passer_til text[],
  sist_oppdatert timestamptz not null default now()
);

create index idx_vinmonopol_navn_trgm on public.vinmonopol_produkter using gin (navn gin_trgm_ops);
create index idx_vinmonopol_hovedkategori on public.vinmonopol_produkter (hovedkategori);

-- Klubbkvelder
create table public.klubbkvelder (
  id uuid primary key default gen_random_uuid(),
  dato date not null,
  tittel text not null,
  sted text,
  kommentar text,
  bilde_url text,
  opprettet_av uuid references public.medlemmer(id),
  opprettet_at timestamptz not null default now()
);

create index idx_klubbkvelder_dato on public.klubbkvelder (dato desc);

-- Oppmøte (mange-til-mange mellom klubbkvelder og medlemmer)
create table public.oppmote (
  klubbkveld_id uuid not null references public.klubbkvelder(id) on delete cascade,
  medlem_id uuid not null references public.medlemmer(id) on delete cascade,
  primary key (klubbkveld_id, medlem_id)
);

-- Smakingstilfeller (en vin tatt med på en klubbkveld av et medlem)
-- Dette er sentralt: én rad per gang en vin har vært på en kveld
create table public.smakinger (
  id uuid primary key default gen_random_uuid(),
  klubbkveld_id uuid not null references public.klubbkvelder(id) on delete cascade,
  varenummer text not null references public.vinmonopol_produkter(varenummer),
  tatt_med_av uuid not null references public.medlemmer(id),
  opprettet_at timestamptz not null default now(),
  unique (klubbkveld_id, varenummer)  -- samme vin kan kun tas med én gang per kveld
);

create index idx_smakinger_kveld on public.smakinger (klubbkveld_id);
create index idx_smakinger_vare on public.smakinger (varenummer);

-- Score (én per medlem per smakingstilfelle)
create table public.scorer (
  id uuid primary key default gen_random_uuid(),
  smaking_id uuid not null references public.smakinger(id) on delete cascade,
  medlem_id uuid not null references public.medlemmer(id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  opprettet_at timestamptz not null default now(),
  unique (smaking_id, medlem_id)
);

-- Kommentarer (mange per smakingstilfelle per medlem)
create table public.kommentarer (
  id uuid primary key default gen_random_uuid(),
  smaking_id uuid not null references public.smakinger(id) on delete cascade,
  medlem_id uuid not null references public.medlemmer(id) on delete cascade,
  tekst text not null,
  opprettet_at timestamptz not null default now()
);

create index idx_kommentarer_smaking on public.kommentarer (smaking_id);

-- ============== VIEWS FOR ENKELT OPPSLAG ==============

-- Snitt per smakingstilfelle og totalt per vin
create or replace view public.vin_oversikt as
select
  v.varenummer,
  v.navn,
  v.produkttype,
  v.hovedkategori,
  v.land,
  v.druer,
  v.pris,
  v.bilde_url,
  count(distinct s.id) as antall_smakinger,
  round(avg(sc.score)::numeric, 1) as snitt_total,
  count(sc.id) as antall_scorer,
  min(k.dato) as forste_klubbkveld
from public.vinmonopol_produkter v
left join public.smakinger s on s.varenummer = v.varenummer
left join public.scorer sc on sc.smaking_id = s.id
left join public.klubbkvelder k on k.id = s.klubbkveld_id
group by v.varenummer, v.navn, v.produkttype, v.hovedkategori, v.land, v.druer, v.pris, v.bilde_url
having count(distinct s.id) > 0;

-- ============== ROW LEVEL SECURITY ==============

alter table public.medlemmer enable row level security;
alter table public.vinmonopol_produkter enable row level security;
alter table public.klubbkvelder enable row level security;
alter table public.oppmote enable row level security;
alter table public.smakinger enable row level security;
alter table public.scorer enable row level security;
alter table public.kommentarer enable row level security;

-- Hjelpefunksjon: er innlogget bruker godkjent?
create or replace function public.er_godkjent_medlem()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select godkjent from public.medlemmer where id = auth.uid()),
    false
  );
$$;

-- Hjelpefunksjon: er innlogget bruker admin?
create or replace function public.er_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select er_admin from public.medlemmer where id = auth.uid()),
    false
  );
$$;

-- MEDLEMMER
create policy "Godkjente medlemmer kan se alle medlemmer"
  on public.medlemmer for select
  using (public.er_godkjent_medlem() or auth.uid() = id);

create policy "Brukere kan opprette sin egen medlemsrad"
  on public.medlemmer for insert
  with check (auth.uid() = id);

create policy "Admin kan oppdatere medlemmer"
  on public.medlemmer for update
  using (public.er_admin());

-- VINMONOPOL_PRODUKTER (alle godkjente kan lese)
create policy "Godkjente medlemmer kan lese produkter"
  on public.vinmonopol_produkter for select
  using (public.er_godkjent_medlem());

-- KLUBBKVELDER
create policy "Godkjente medlemmer kan se alle kvelder"
  on public.klubbkvelder for select
  using (public.er_godkjent_medlem());

create policy "Kun admin kan opprette kvelder"
  on public.klubbkvelder for insert
  with check (public.er_admin());

create policy "Kun admin kan oppdatere kvelder"
  on public.klubbkvelder for update
  using (public.er_admin());

create policy "Kun admin kan slette kvelder"
  on public.klubbkvelder for delete
  using (public.er_admin());

-- OPPMØTE
create policy "Godkjente medlemmer kan se oppmøte"
  on public.oppmote for select
  using (public.er_godkjent_medlem());

create policy "Kun admin kan endre oppmøte"
  on public.oppmote for all
  using (public.er_admin());

-- SMAKINGER
create policy "Godkjente medlemmer kan se smakinger"
  on public.smakinger for select
  using (public.er_godkjent_medlem());

create policy "Godkjente medlemmer kan legge til smakinger"
  on public.smakinger for insert
  with check (public.er_godkjent_medlem() and tatt_med_av = auth.uid());

create policy "Den som la til kan slette egen smaking"
  on public.smakinger for delete
  using (tatt_med_av = auth.uid() or public.er_admin());

-- SCORER
create policy "Godkjente medlemmer kan se scorer"
  on public.scorer for select
  using (public.er_godkjent_medlem());

create policy "Godkjente medlemmer kan score"
  on public.scorer for insert
  with check (public.er_godkjent_medlem() and medlem_id = auth.uid());

-- (Ingen update/delete-policy = score kan ikke endres eller slettes, jf. krav)

-- KOMMENTARER
create policy "Godkjente medlemmer kan se kommentarer"
  on public.kommentarer for select
  using (public.er_godkjent_medlem());

create policy "Godkjente medlemmer kan kommentere"
  on public.kommentarer for insert
  with check (public.er_godkjent_medlem() and medlem_id = auth.uid());

-- (Ingen update/delete-policy = kommentar kan ikke endres eller slettes, jf. krav)

-- ============== STORAGE BUCKETS ==============
-- Kjør disse separat i Supabase Storage UI, eller bruk:
insert into storage.buckets (id, name, public)
values ('klubbkveld-bilder', 'klubbkveld-bilder', true)
on conflict (id) do nothing;

create policy "Alle godkjente kan lese klubbkveld-bilder"
  on storage.objects for select
  using (bucket_id = 'klubbkveld-bilder');

create policy "Admin kan laste opp klubbkveld-bilder"
  on storage.objects for insert
  with check (bucket_id = 'klubbkveld-bilder' and public.er_admin());

create policy "Admin kan oppdatere klubbkveld-bilder"
  on storage.objects for update
  using (bucket_id = 'klubbkveld-bilder' and public.er_admin());

-- ============== TRIGGER: opprett medlem-rad ved registrering ==============
create or replace function public.handle_ny_bruker()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.medlemmer (id, navn, epost, godkjent, er_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'navn', new.email),
    new.email,
    false,  -- må godkjennes manuelt
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_ny_bruker();
