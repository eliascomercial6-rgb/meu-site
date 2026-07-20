-- ============================================================
-- storage_policies.sql
-- Policies de RLS para storage.objects.
-- Convenção de path: {photographer_id}/{filename} em todo bucket.
-- (storage.foldername(name))[1] extrai o primeiro segmento do path.
-- ============================================================

create policy "storage_public_read"
  on storage.objects for select
  using (bucket_id in ('photos', 'avatars', 'logos', 'hero'));

create policy "storage_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id in ('photos', 'avatars', 'logos', 'hero')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_owner_update"
  on storage.objects for update
  using (
    bucket_id in ('photos', 'avatars', 'logos', 'hero')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('photos', 'avatars', 'logos', 'hero')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_owner_delete"
  on storage.objects for delete
  using (
    bucket_id in ('photos', 'avatars', 'logos', 'hero')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
