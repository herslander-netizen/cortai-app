/** Pacotes e combos do negócio (layout Raízes): formato comum à gestão e à página pública. */
export type TipoDePacote = "pacote" | "combo";

export type ItemDoPacote = {
  servicoId: string;
  nome: string;
  quantidade: number;
  /** Preço de tabela de um serviço, usado só para mostrar "separado" e a economia. */
  precoCentavos: number;
};

export type PacoteDoNegocio = {
  id: string;
  tipo: TipoDePacote;
  nome: string;
  descricao: string | null;
  precoCentavos: number;
  validadeDias: number | null;
  destaque: boolean;
  ativo: boolean;
  itens: ItemDoPacote[];
};

/** Quanto custaria comprar os mesmos itens avulsos. */
export function precoSeparado(itens: Pick<ItemDoPacote, "quantidade" | "precoCentavos">[]): number {
  return itens.reduce((total, i) => total + i.quantidade * i.precoCentavos, 0);
}

/** Economia do pacote em relação aos serviços avulsos; nunca negativa. */
export function economiaDoPacote(pacote: {
  precoCentavos: number;
  itens: Pick<ItemDoPacote, "quantidade" | "precoCentavos">[];
}): {
  centavos: number;
  percentual: number;
} {
  const separado = precoSeparado(pacote.itens);
  const centavos = Math.max(0, separado - pacote.precoCentavos);
  const percentual = separado > 0 ? Math.round((centavos / separado) * 100) : 0;
  return { centavos, percentual };
}

/** "1 mês", "15 dias", "3 meses"; nulo = sem prazo. */
export function validadeEmTexto(dias: number | null): string | null {
  if (!dias) return null;
  if (dias % 30 === 0) {
    const meses = dias / 30;
    return meses === 1 ? "1 mês" : `${meses} meses`;
  }
  return dias === 1 ? "1 dia" : `${dias} dias`;
}

/** Duração somada dos serviços, para o combo ("1h10", "50 min"). */
export function duracaoEmTexto(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Junta as linhas das duas tabelas no formato único (usado no servidor). */
export function montarPacotes(
  linhas: {
    id: string;
    tipo: string;
    nome: string;
    descricao: string | null;
    preco_centavos: number;
    validade_dias: number | null;
    destaque: boolean;
    ativo: boolean;
  }[],
  itens: { pacote_id: string; servico_id: string; quantidade: number }[],
  servicos: { id: string; nome: string; preco_centavos: number }[],
): PacoteDoNegocio[] {
  const porServico = new Map(servicos.map((s) => [s.id, s]));
  return linhas
    .filter((l) => l.tipo === "pacote" || l.tipo === "combo")
    .map((l) => ({
      id: l.id,
      tipo: l.tipo as TipoDePacote,
      nome: l.nome,
      descricao: l.descricao,
      precoCentavos: l.preco_centavos,
      validadeDias: l.validade_dias,
      destaque: l.destaque,
      ativo: l.ativo,
      itens: itens
        .filter((i) => i.pacote_id === l.id && porServico.has(i.servico_id))
        .map((i) => {
          const s = porServico.get(i.servico_id)!;
          return {
            servicoId: s.id,
            nome: s.nome,
            quantidade: i.quantidade,
            precoCentavos: s.preco_centavos,
          };
        }),
    }));
}

/** "170", "170,50" ou "R$ 1.170,50" → centavos; texto inválido → null. */
export function reaisParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.]/g, "");
  if (!limpo) return null;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const valor = Number(normal);
  if (!Number.isFinite(valor) || valor < 0) return null;
  return Math.round(valor * 100);
}

/** Centavos → texto para o campo ("170,00"). */
export function centavosParaReais(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}
