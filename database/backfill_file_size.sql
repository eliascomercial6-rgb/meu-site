-- 1) Conferir se é isso mesmo: linhas com file_size_bytes nulo/zero
select id, title, file_size_bytes, storage_path
from photos
where file_size_bytes is null or file_size_bytes = 0;

-- 2) Preencher a partir do tamanho real já registrado no Storage
--    (storage.objects.metadata->>'size' vem em bytes)
update photos p
set file_size_bytes = (o.metadata->>'size')::bigint
from storage.objects o
where o.bucket_id = 'photos'
  and o.name = p.storage_path
  and (p.file_size_bytes is null or p.file_size_bytes = 0);
