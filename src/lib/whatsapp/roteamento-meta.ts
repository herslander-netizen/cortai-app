/**
 * Qual conexão recebe um aviso da conta oficial (Meta).
 * A Meta informa o número de destino em `value.metadata.phone_number_id`.
 *
 * Número compartilhado: vários negócios usam o mesmo número oficial do Flow.
 * Nesse caso a rota devolve uma das conexões e o negócio é decidido depois,
 * pela regra de número compartilhado (`negocioDoNumeroCompartilhado`).
 * Mensagem nunca é descartada por roteamento quando há conexão oficial.
 */
export type ConexaoMeta = {
  id: string;
  tenant_id: string;
  sessao_id: string;
  meta_phone_number_id: string | null;
  numero?: string | null;
  compartilhada?: boolean | null;
};

export type Roteamento =
  | {
      tipo: "ok";
      conexao: ConexaoMeta;
      /** Número compartilhado: o negócio é decidido pela regra própria. */
      compartilhada: boolean;
      /** Conexões que devem passar a gravar o phone_number_id. */
      aprenderIds: string[];
    }
  | { tipo: "erro"; motivo: string };

const digitos = (v: string | null | undefined) => String(v ?? "").replace(/\D/g, "");

function resultado(grupo: ConexaoMeta[], phoneNumberId: string | null | undefined): Roteamento {
  const conexao = grupo[0]!;
  return {
    tipo: "ok",
    conexao,
    compartilhada: grupo.length > 1 || grupo.some((c) => c.compartilhada === true),
    aprenderIds: phoneNumberId
      ? grupo.filter((c) => c.meta_phone_number_id !== phoneNumberId).map((c) => c.id)
      : [],
  };
}

export function rotearConexaoMeta(
  conexoes: ConexaoMeta[],
  phoneNumberId: string | null | undefined,
  numeroExibido?: string | null,
): Roteamento {
  if (conexoes.length === 0)
    return { tipo: "erro", motivo: "Nenhum negócio com a conta oficial de WhatsApp ativada." };

  if (phoneNumberId) {
    const porId = conexoes.filter((c) => c.meta_phone_number_id === phoneNumberId);
    // Inclui as do mesmo número que ainda não gravaram o id.
    const numeros = new Set(porId.map((c) => digitos(c.numero)).filter(Boolean));
    const alvo = digitos(numeroExibido);
    if (alvo) numeros.add(alvo);
    const mesmoNumero = conexoes.filter(
      (c) => !c.meta_phone_number_id && digitos(c.numero) && numeros.has(digitos(c.numero)),
    );
    const grupo = [...porId, ...mesmoNumero];
    if (grupo.length > 0) return resultado(grupo, phoneNumberId);
    // Instalação nova: nenhuma conexão tem id gravado ainda.
    const semId = conexoes.filter((c) => !c.meta_phone_number_id);
    if (semId.length === conexoes.length) return resultado(semId, phoneNumberId);
    return {
      tipo: "erro",
      motivo: `Número oficial ${phoneNumberId} não corresponde a nenhum negócio conectado.`,
    };
  }
  return resultado(conexoes, null);
}
