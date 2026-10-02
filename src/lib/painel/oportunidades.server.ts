/**
 * Cortaí Opportunity Engine — determinístico, sem IA.
 * Recebe apenas dados que o Cortaí já tem e devolve oportunidades estruturadas.
 * Nada é enviado automaticamente: o painel apenas sugere o próximo movimento.
 */

export type Prioridade = "alta" | "media" | "baixa";

export type Oportunidade = {
  tipo:
    | "HORARIO_VAZIO"
    | "RETORNO_PROXIMO"
    | "CLIENTE_INATIVO"
    | "FILA"
    | "CANCELAMENTO"
    | "OCUPACAO_BAIXA"
    | "FIADO_VENCIDO"
    | "AVALIACAO_PENDENTE"
    | "ESTOQUE_BAIXO"
    | "AGUARDANDO_HUMANO";
  prioridade: Prioridade;
  titulo: string;
  descricao: string;
  quantidade: number;
  entidadeId?: string | null;
  acao: string;
  destino: string;
};

export type EntradaDoMotor = {
  proximoHorarioVago: { label: string } | null;
  horariosVagosHoje: number;
  retornosProximos: number;
  inativos: number;
  naFila: number;
  canceladosHoje: { label: string | null; quantidade: number };
  profissionaisBaixaOcupacao: { nome: string; ocupacaoPct: number }[];
  fiadoVencido: number;
  avaliacoesPendentes: number;
  estoqueBaixo: { nome: string }[];
  aguardandoHumano: number;
};

const ORDEM: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

export function calcularOportunidades(e: EntradaDoMotor): Oportunidade[] {
  const lista: Oportunidade[] = [];

  if (e.proximoHorarioVago) {
    lista.push({
      tipo: "HORARIO_VAZIO",
      prioridade: "alta",
      titulo: `Hoje às ${e.proximoHorarioVago.label} existe um horário disponível`,
      descricao:
        e.horariosVagosHoje > 1
          ? `Mais ${e.horariosVagosHoje - 1} horários livres no restante do dia.`
          : "Último horário livre de hoje.",
      quantidade: e.horariosVagosHoje,
      acao: "VER_HORARIO",
      destino: "/barbeiro/agenda",
    });
  }

  if (e.canceladosHoje.quantidade > 0) {
    lista.push({
      tipo: "CANCELAMENTO",
      prioridade: "alta",
      titulo: e.canceladosHoje.label
        ? `Um horário foi liberado hoje às ${e.canceladosHoje.label}`
        : "Horário liberado por cancelamento hoje",
      descricao: "Ofereça para quem está esperando.",
      quantidade: e.canceladosHoje.quantidade,
      acao: "PREENCHER_HORARIO",
      destino: "/barbeiro/agenda",
    });
  }

  if (e.naFila > 0) {
    lista.push({
      tipo: "FILA",
      prioridade: "alta",
      titulo: `${e.naFila} ${e.naFila === 1 ? "cliente aguarda" : "clientes aguardam"} oportunidade de horário`,
      descricao: "Avise quem está na lista quando abrir um espaço.",
      quantidade: e.naFila,
      acao: "VER_FILA",
      destino: "/barbeiro/fila",
    });
  }

  if (e.aguardandoHumano > 0) {
    lista.push({
      tipo: "AGUARDANDO_HUMANO",
      prioridade: "alta",
      titulo: `${e.aguardandoHumano} ${e.aguardandoHumano === 1 ? "conversa espera" : "conversas esperam"} atendimento`,
      descricao: "Alguém pediu para falar com a barbearia.",
      quantidade: e.aguardandoHumano,
      acao: "VER_CONVERSAS",
      destino: "/barbeiro/cortai",
    });
  }

  if (e.retornosProximos > 0) {
    lista.push({
      tipo: "RETORNO_PROXIMO",
      prioridade: "media",
      titulo: `${e.retornosProximos} ${e.retornosProximos === 1 ? "cliente está" : "clientes estão"} no período habitual de retorno`,
      descricao: "Um lembrete costuma fechar a agenda da semana.",
      quantidade: e.retornosProximos,
      acao: "VER_CLIENTES",
      destino: "/barbeiro/clientes",
    });
  }

  if (e.inativos > 0) {
    lista.push({
      tipo: "CLIENTE_INATIVO",
      prioridade: "media",
      titulo: `${e.inativos} ${e.inativos === 1 ? "cliente não retorna" : "clientes não retornam"} há mais tempo que o habitual`,
      descricao: "Vale uma mensagem para reativar.",
      quantidade: e.inativos,
      acao: "REATIVAR",
      destino: "/barbeiro/clientes",
    });
  }

  if (e.profissionaisBaixaOcupacao.length) {
    const nomes = e.profissionaisBaixaOcupacao.map((p) => p.nome);
    lista.push({
      tipo: "OCUPACAO_BAIXA",
      prioridade: "media",
      titulo:
        nomes.length === 1
          ? `${nomes[0]} está com a agenda quase vazia hoje`
          : `${nomes.length} profissionais com a agenda quase vazia hoje`,
      descricao: `${nomes.slice(0, 3).join(", ")}${nomes.length > 3 ? " e outros" : ""} · direcione os próximos encaixes.`,
      quantidade: nomes.length,
      acao: "VER_AGENDA",
      destino: "/barbeiro/agenda",
    });
  }

  if (e.fiadoVencido > 0) {
    lista.push({
      tipo: "FIADO_VENCIDO",
      prioridade: "media",
      titulo: `${e.fiadoVencido} ${e.fiadoVencido === 1 ? "cliente com fiado" : "clientes com fiado"} em aberto há mais de 25 dias`,
      descricao: "Cobre com jeitinho antes de virar prejuízo.",
      quantidade: e.fiadoVencido,
      acao: "VER_FINANCEIRO",
      destino: "/barbeiro/caixa",
    });
  }

  if (e.avaliacoesPendentes > 0) {
    lista.push({
      tipo: "AVALIACAO_PENDENTE",
      prioridade: "baixa",
      titulo: `${e.avaliacoesPendentes} atendimentos sem avaliação`,
      descricao: "Registre a nota enquanto está fresco.",
      quantidade: e.avaliacoesPendentes,
      acao: "VER_AVALIACOES",
      destino: "/barbeiro/avaliacoes",
    });
  }

  if (e.estoqueBaixo.length > 0) {
    lista.push({
      tipo: "ESTOQUE_BAIXO",
      prioridade: "baixa",
      titulo: `${e.estoqueBaixo.length} ${e.estoqueBaixo.length === 1 ? "produto" : "produtos"} com estoque baixo`,
      descricao: e.estoqueBaixo
        .slice(0, 3)
        .map((p) => p.nome)
        .join(", "),
      quantidade: e.estoqueBaixo.length,
      acao: "VER_LOJA",
      destino: "/barbeiro/produtos",
    });
  }

  return lista.sort((a, b) => ORDEM[a.prioridade] - ORDEM[b.prioridade]).slice(0, 6);
}
