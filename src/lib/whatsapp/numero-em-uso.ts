/**
 * Mesmo número em duas conexões do Flow (dono, 07/11/2026): a linha da plataforma e a de um negócio chegaram a gerar
 * códigos de pareamento ao mesmo tempo para o mesmo número, e cada código novo derruba o anterior — o WhatsApp
 * respondia "Não foi possível conectar o dispositivo". Regra pura: ao pedir um código, outra conexão com o mesmo número
 * (a) já conectada bloqueia com explicação; (b) parada ou pendente é encerrada (para de gerar códigos) antes de seguir.
 */
export type OutraConexao = {
  id: string;
  sessao_id: string;
  status: string;
  numero: string | null;
};

export type DecisaoDeNumero = { bloquear: string | null; encerrar: string[] };

const soDigitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

export function decidirNumeroEmUso(
  outras: readonly OutraConexao[],
  numero: string,
  nomeDaOutra = "outra conexão do Flow",
): DecisaoDeNumero {
  const alvo = soDigitos(numero);
  const iguais = outras.filter((o) => soDigitos(o.numero) === alvo && alvo.length >= 10);
  const conectada = iguais.find((o) => o.status === "conectado");
  if (conectada)
    return {
      bloquear: `Este número já está conectado em ${nomeDaOutra}.\n\nUm número só pode ficar em uma conexão. Use outro número ou desconecte a outra primeiro.`,
      encerrar: [],
    };
  return { bloquear: null, encerrar: iguais.map((o) => o.sessao_id) };
}
