-- ============================================================
-- storage_setup.sql
-- Cria os 4 buckets do projeto.
-- Executar no SQL Editor do Supabase, depois de schema.sql.
-- ============================================================

-- Todos os buckets são públicos para LEITURA (o site público exibe
-- as imagens sem autenticação). Escrita é controlada por policies
-- em storage_policies.sql (passo 5, junto com RLS das tabelas).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos',  'photos',  true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('logos',   'logos',   true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('hero',    'hero',    true, 10485760, array['image/jpeg', 'image/png', 'image/webp']);

-- file_size_limit em bytes: 10485760 = 10 MB (decisão do projeto)
-- allowed_mime_types: reforça no backend a mesma validação do frontend
