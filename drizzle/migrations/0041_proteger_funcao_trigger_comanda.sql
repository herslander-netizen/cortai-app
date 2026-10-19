-- A função é exclusiva do gatilho; não precisa ser executável via RPC pela API pública.
REVOKE EXECUTE ON FUNCTION public.agendamento_criar_comanda_ao_vincular_cliente() FROM PUBLIC, anon, authenticated;
