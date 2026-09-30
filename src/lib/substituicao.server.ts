/**
 * Alteração de horário pelo link público: o novo já foi criado; agora libera o antigo.
 * Se o antigo não puder ser cancelado, desfaz o novo — o cliente nunca fica com dois.
 */
type Rpc = (
  fn: "cancelar_agendamento",
  args: { _agendamento_id: string },
) => PromiseLike<{ error: { message: string } | null }>;

export async function concluirSubstituicao(
  db: { rpc: Rpc },
  p: { novoId: string; antigoId: string },
): Promise<void> {
  const { error } = await db.rpc("cancelar_agendamento", { _agendamento_id: p.antigoId });
  if (!error) return;
  console.error("[agendamento-publico] falha ao liberar horário antigo", p.antigoId, error.message);
  const { error: erroDesfazer } = await db.rpc("cancelar_agendamento", { _agendamento_id: p.novoId });
  if (erroDesfazer) console.error("[agendamento-publico] falha ao desfazer novo horário", p.novoId, erroDesfazer.message);
  throw new Error("Não conseguimos alterar seu horário agora. Seu horário anterior continua marcado.");
}
