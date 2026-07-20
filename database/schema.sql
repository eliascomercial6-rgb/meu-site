-- ============================================================
-- schema.sql
-- Portfolio SaaS para Fotógrafos — Schema inicial (multi-tenant)
-- Executar no SQL Editor do Supabase.
-- RLS é habilitado em toda tabela aqui mesmo, sem policies ainda.
-- Isso bloqueia TODO acesso via anon/authenticated key até que
-- rls_policies.sql seja aplicado (passo seguinte do roadmap).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- FUNÇÃO utilitária: updated_at automático
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- photographers
-- id = mesmo UUID do auth.users (1:1 com o login)
-- ------------------------------------------------------------
create table photographers (
  id              uuid primary key references auth.users(id) on delete cascade,
  slug            text unique not null,
  name            text not null,
  bio             text,
  experience_years integer,
  specialties     text[],
  equipment       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create trigger trg_photographers_updated_at
  before update on photographers
  for each row execute function set_updated_at();

create index idx_photographers_slug on photographers(slug);

-- ------------------------------------------------------------
-- site_settings
-- Configurações do site, separadas dos dados do fotógrafo
-- ------------------------------------------------------------
create table site_settings (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null unique references photographers(id) on delete cascade,

  slogan          text,
  hero_photo_url  text,
  logo_url        text,
  avatar_url      text,

  whatsapp_number text,
  instagram_handle text,

  primary_color   text default '#111111',

  -- Fase 2: SEO
  seo_title       text,
  seo_description text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_site_settings_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
create table categories (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  name            text not null,
  slug            text not null,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  unique (photographer_id, slug)
);

create index idx_categories_photographer on categories(photographer_id);

-- ------------------------------------------------------------
-- photos
-- ------------------------------------------------------------
create table photos (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  category_id     uuid references categories(id) on delete set null,

  title           text,
  description     text,
  image_url       text not null,
  thumbnail_url   text not null,
  storage_path    text not null,
  file_size_bytes bigint not null default 0,

  is_published    boolean not null default true,
  sort_order      integer not null default 0,

  deleted_at      timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_photos_updated_at
  before update on photos
  for each row execute function set_updated_at();

create index idx_photos_photographer on photos(photographer_id);
create index idx_photos_category on photos(category_id);
create index idx_photos_deleted_at on photos(deleted_at);

-- ------------------------------------------------------------
-- services (Fase 2)
-- ------------------------------------------------------------
create table services (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  title           text not null,
  description     text,
  price_from      numeric(10,2),
  sort_order      integer not null default 0,
  is_published    boolean not null default true,
  created_at      timestamptz not null default now()
);

create index idx_services_photographer on services(photographer_id);

-- ------------------------------------------------------------
-- testimonials (Fase 2)
-- ------------------------------------------------------------
create table testimonials (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  client_name     text not null,
  content         text not null,
  rating          smallint check (rating between 1 and 5),
  is_published    boolean not null default true,
  created_at      timestamptz not null default now()
);

create index idx_testimonials_photographer on testimonials(photographer_id);

-- ------------------------------------------------------------
-- faqs (Fase 2)
-- ------------------------------------------------------------
create table faqs (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  question        text not null,
  answer          text not null,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index idx_faqs_photographer on faqs(photographer_id);

-- ------------------------------------------------------------
-- contacts (mensagens recebidas pelo site público)
-- ------------------------------------------------------------
create table contacts (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  name            text not null,
  phone           text,
  email           text,
  message         text not null,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_contacts_photographer on contacts(photographer_id);

-- ------------------------------------------------------------
-- audit_logs
-- ------------------------------------------------------------
create table audit_logs (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  actor_id        uuid not null,
  action          text not null,        -- ex: 'delete', 'edit', 'restore'
  entity          text not null,        -- ex: 'photo', 'category'
  entity_id       uuid,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index idx_audit_logs_photographer on audit_logs(photographer_id);

-- ------------------------------------------------------------
-- plans (Fase 3 — preparação apenas)
-- ------------------------------------------------------------
create table plans (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  price_cents     integer not null default 0,
  max_photos      integer,
  max_storage_mb  integer,
  features        jsonb,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- subscriptions (Fase 3 — preparação apenas)
-- ------------------------------------------------------------
create table subscriptions (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  plan_id         uuid references plans(id),
  status          text not null default 'trialing', -- trialing, active, canceled, past_due
  started_at      timestamptz not null default now(),
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_subscriptions_photographer on subscriptions(photographer_id);

-- ------------------------------------------------------------
-- Habilita RLS em todas as tabelas (sem policies ainda —
-- bloqueia todo acesso até rls_policies.sql ser aplicado)
-- ------------------------------------------------------------
alter table photographers   enable row level security;
alter table site_settings   enable row level security;
alter table categories      enable row level security;
alter table photos          enable row level security;
alter table services        enable row level security;
alter table testimonials    enable row level security;
alter table faqs            enable row level security;
alter table contacts        enable row level security;
alter table audit_logs      enable row level security;
alter table plans           enable row level security;
alter table subscriptions   enable row level security;
