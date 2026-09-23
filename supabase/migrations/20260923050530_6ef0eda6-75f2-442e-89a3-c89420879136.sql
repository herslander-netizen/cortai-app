
revoke all on function public.criar_notificacao(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.notificar_agendamento() from public, anon, authenticated;
revoke all on function public.notificar_fila() from public, anon, authenticated;
revoke all on function public.notificar_fiado() from public, anon, authenticated;
revoke all on function public.notificar_pix() from public, anon, authenticated;
