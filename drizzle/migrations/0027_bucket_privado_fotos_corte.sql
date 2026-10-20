-- Bucket privado usado por enviarFotoCorte/getPerfilCliente.
-- O acesso às imagens é mediado pelo servidor (supabaseAdmin) e por URLs assinadas temporárias.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-corte',
  'fotos-corte',
  false,
  5242880,
  array['image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
