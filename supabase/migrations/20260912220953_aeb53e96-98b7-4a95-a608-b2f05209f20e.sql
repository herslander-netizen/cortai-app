revoke all on function public.criar_barbearia(text) from public, anon;
revoke all on function public.unaccent_placeholder(text) from public, anon, authenticated;
grant execute on function public.criar_barbearia(text) to authenticated;
alter function public.unaccent_placeholder(text) security invoker;