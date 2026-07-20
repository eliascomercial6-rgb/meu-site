-- ============================================================
-- Migração: entidade Albums (Fase 3)
-- Rodar no SQL Editor do Supabase, na ordem em que aparece aqui.
-- ============================================================

-- 1. Tabela albums --------------------------------------------------
create table if not exists albums (
  id             uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  category_id    uuid references categories(id) on delete set null,
  title          text not null,
  description    text,
  cover_photo_id uuid, -- FK adicionada no passo 3, depois que photos.album_id existir
  is_published   boolean not null default false,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists albums_photographer_idx on albums (photographer_id);
create index if not exists albums_category_idx on albums (category_id);

-- 2. Relação Albums -> Photos ----------------------------------------
-- 1 álbum tem várias fotos. album_id fica nullable de propósito: fotos
-- enviadas antes desta migração continuam existindo sem álbum, sem
-- quebrar nada — a UI trata "sem álbum" como pendente de organização.
alter table photos add column if not exists album_id uuid references albums(id) on delete set null;
create index if not exists photos_album_idx on photos (album_id);

-- 3. Capa do álbum -----------------------------------------------------
-- cover_photo_id aponta pra uma foto específica DENTRO do álbum.
-- on delete set null: se a foto-capa for excluída, o álbum não quebra,
-- só fica sem capa até o fotógrafo escolher outra.
alter table albums
  add constraint albums_cover_photo_fk
  foreign key (cover_photo_id) references photos(id) on delete set null;

-- 4. RLS ----------------------------------------------------------------
alter table albums enable row level security;

-- Dono faz tudo com os próprios álbuns.
create policy albums_owner_all on albums
  for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- Leitura pública só de álbuns publicados (site público, sem sessão).
create policy albums_public_read on albums
  for select
  using (is_published = true);

-- 5. Leitura pública das fotos de um álbum publicado -----------------
-- A policy antiga de "photos" (leitura pública só com is_published=true
-- na própria foto) continua valendo — esta é ADICIONAL, não substitui.
-- Policies de RLS se combinam com OR: com as duas juntas, uma foto
-- fica visível ao público se ELA estiver marcada como publicada OU se
-- pertencer a um álbum publicado. Isso evita o fotógrafo ter que
-- publicar a foto duas vezes (uma vez "nela" e outra "no álbum") —
-- publicar o álbum já é suficiente pro conceito novo da Fase 2/3.
create policy photos_public_read_via_published_album on photos
  for select
  using (
    album_id in (select id from albums where is_published = true)
  );

-- 6. GRANT ----------------------------------------------------------------
-- Sem isso dá 403 mesmo com as policies certas (RLS restringe LINHAS,
-- não substitui o GRANT de tabela). Já mordeu este projeto antes.
grant select, insert, update, delete on albums to anon, authenticated;
