/**
 * Qual barbearia recebe um aviso da conta oficial (Meta).
 * A Meta informa o número de destino em `value.metadata.phone_number_id`.
 */
export type ConexaoMeta = {
  id: string;
  tenant_id: string;
  sessao_id: string;
  meta_phone_number_id: string | null;
};

export type Roteamento =
  | { tipo: "ok"; conexao: ConexaoMeta; aprender?: boolean }
  | { tipo: "erro"; motivo: string };

export function rotearConexaoMeta(conexoes: ConexaoMeta[], phoneNumberId: string | null | undefined): Roteamento {
  if (conexoes.length === 0) return { tipo: "erro", motivo: "Nenhuma barbearia com a conta oficial de WhatsApp ativada." };
  if (phoneNumberId) {
    const achada = conexoes.find((c) => c.meta_phone_number_id === phoneNumberId);
    if (achada) return { tipo: "ok", conexao: achada };
    // Primeira mensagem da instalação: uma única conexão, ainda sem número gravado.
    // O número passa a ser gravado nela e, dali em diante, vale só a correspondência exata.
    const unica = conexoes.length === 1 ? conexoes[0] : undefined;
    if (unica && !unica.meta_phone_number_id) return { tipo: "ok", conexao: unica, aprender: true };
    return { tipo: "erro", motivo: `Número oficial ${phoneNumberId} não corresponde a nenhuma barbearia conectada.` };
  }
  if (conexoes.length === 1 && conexoes[0]) return { tipo: "ok", conexao: conexoes[0] };
  return { tipo: "erro", motivo: "Aviso sem phone_number_id e há mais de uma barbearia na conta oficial." };
}
