-- ============================================================
-- rls_policies.sql
-- Policies de Row Level Security.
-- Executar depois de schema.sql e storage_setup.sql.
--
-- Padrão adotado:
--   - Dono (auth.uid() = photographer_id) tem CRUD completo sobre
--     seus próprios dados, publicados ou não (necessário pro painel).
--   - Público (anon) só lê o que está publicado — necessário pro
--     site público funcionar sem login.
--   - Tabelas sensíveis (contacts, audit_logs, subscriptions) nunca
--     têm leitura pública.
-- ============================================================

-- ------------------------------------------------------------
-- photographers
-- ------------------------------------------------------------
create policy "photographers_public_read"
  on photographers for select
  using (true);

create policy "photographers_owner_insert"
  on photographers for insert
  with check (auth.uid() = id);

create policy "photographers_owner_update"
  on photographers for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "photographers_owner_delete"
  on photographers for delete
  using (auth.uid() = id);

-- ------------------------------------------------------------
-- site_settings
-- ------------------------------------------------------------
create policy "site_settings_public_read"
  on site_settings for select
  using (true);

create policy "site_settings_owner_write"
  on site_settings for all
  using (auth.uid() = photographer_id)
  with check (auth.uid() = photographer_id);

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
create policy "categories_public_read"
  on categories for select
  using (true);

create policy "categories_owner_write"
  on categories for all
  using (auth.uid() = photographer_id)
  with check (auth.uid() = photographer_id);

-- ------------------------------------------------------------
-- photos
-- ------------------------------------------------------------
create policy "photos_public_read_published"
  on photos for select
  using (is_published = true and deleted_at is null);

create policy "photos_owner_read_all"
  on photos for select
  using (auth.uid() = photographer_id);

create policy "photos_owner_write"
  on photos for insert
  with check (auth.uid() = photographer_id);

create policy "photos_owner_update"
  on photos for update
  using (auth.uid() = photographer_id)
  with check (auth.uid() = photographer_id);

create policy "photos_owner_delete"
  on photos for delete
  using (auth.uid() = photographer_id);

-- ------------------------------------------------------------
-- services
-- ------------------------------------------------------------
create policy "services_public_read_published"
  on services for select
  using (is_published = true);

create policy "services_owner_read_all"
  on services for select
  using (auth.uid() = photographer_id);

create policy "services_owner_write"
  on services for insert
  with check (auth.uid() = photographer_id);

create policy "services_owner_update"
  on services for update
  using (auth.uid() = photographer_id)
  with check (auth.uid() = photographer_id);

create policy "services_owner_delete"
  on services for delete
  using (auth.uid() = photographer_id);

-- ------------------------------------------------------------
-- testimonials
-- ------------------------------------------------------------
create policy "testimonials_public_read_published"
  on testimonials for select
  using (is_published = true);

create policy "testimonials_owner_read_all"
  on testimonials for select
  using (auth.uid() = photographer_id);

create policy "testimonials_owner_write"
  on testimonials for insert
  with check (auth.uid() = photographer_id);

create policy "testimonials_owner_update"
  on testimonials for update
  using (auth.uid() = photographer_id)
  with check (auth.uid() = photographer_id);

create policy "testimonials_owner_delete"
  on testimonials for delete
  using (auth.uid() = photographer_id);

-- ------------------------------------------------------------
-- faqs
-- ------------------------------------------------------------
create policy "faqs_public_read"
  on faqs for select
  using (true);

create policy "faqs_owner_write"
  on faqs for all
  using (auth.uid() = photographer_id)
  with check (auth.uid() = photographer_id);

-- ------------------------------------------------------------
-- contacts
-- Visitante do site pode ENVIAR mensagem (insert), mas nunca ler.
-- Só o dono lê, marca como lida e apaga.
-- ------------------------------------------------------------
create policy "contacts_public_insert"
  on contacts for insert
  with check (true);

create policy "contacts_owner_read"
  on contacts for select
  using (auth.uid() = photographer_id);

create policy "contacts_owner_update"
  on contacts for update
  using (auth.uid() = photographer_id)
  with check (auth.uid() = photographer_id);

create policy "contacts_owner_delete"
  on contacts for delete
  using (auth.uid() = photographer_id);

-- ------------------------------------------------------------
-- audit_logs
-- Log é imutável: só insert e select do dono. Sem update/delete.
-- ------------------------------------------------------------
create policy "audit_logs_owner_insert"
  on audit_logs for insert
  with check (auth.uid() = photographer_id and auth.uid() = actor_id);

create policy "audit_logs_owner_read"
  on audit_logs for select
  using (auth.uid() = photographer_id);

-- ------------------------------------------------------------
-- plans
-- Leitura pública (futura página de preços). Escrita: nenhuma
-- policy criada de propósito — só Service Role altera planos.
-- ------------------------------------------------------------
create policy "plans_public_read"
  on plans for select
  using (true);

-- ------------------------------------------------------------
-- subscriptions
-- Leitura restrita ao dono. Sem policy de escrita nesta fase —
-- será criada junto com a lógica de cobrança (Fase 3).
-- ------------------------------------------------------------
create policy "subscriptions_owner_read"
  on subscriptions for select
  using (auth.uid() = photographer_id);
