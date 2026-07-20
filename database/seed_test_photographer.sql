-- ============================================================
-- seed_test_photographer.sql
-- Vincula o usuário já criado no Authentication (UUID abaixo)
-- a uma linha em photographers. Rode uma vez no SQL Editor.
-- ============================================================

insert into photographers (id, slug, name)
values ('42b94574-9a06-472d-9416-9a6aad24656d', 'joao-silva', 'João Silva');
