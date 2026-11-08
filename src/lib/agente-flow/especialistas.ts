/**
 * Perfis declarativos inspirados na separação host/runtime do Helpin.
 * Ainda NÃO iniciam runs, executam ferramentas ou enviam mensagens.
 * O executor e a autorização continuam pertencendo ao cérebro oficial.
 */
export type IdEspecialistaFlow =
  | "atendimento" | "agenda" | "crm" | "insights" | "conhecimento" | "operacoes";

export type EspecialistaFlow = {
  id: IdEspecialistaFlow;
  nome: string;
  objetivo: string;
  ferramentas: readonly string[];
  modo: "sombra";
  permiteEscrita: false;
};

export const ESPECIALISTAS_FLOW: readonly EspecialistaFlow[] = [
  {
    id: "atendimento",
    nome: "Atendimento",
    objetivo: "Explicar serviços e dados públicos sem assumir controle da conversa.",
    ferramentas: ["listar_servicos", "consultar_servico", "consultar_informacoes"],
    modo: "sombra",
    permiteEscrita: false,
  },
  {
    id: "agenda",
    nome: "Agenda",
    objetivo: "Consultar horários e agendamentos; nunca reservar sem confirmação oficial.",
    ferramentas: ["consultar_disponibilidade", "consultar_agendamento", "consultar_horarios_funcionamento"],
    modo: "sombra",
    permiteEscrita: false,
  },
  {
    id: "crm",
    nome: "CRM",
    objetivo: "Ajudar a equipe a entender relacionamentos e histórico permitido.",
    ferramentas: ["buscar_cliente", "buscar_cliente_por_nome", "consultar_agendamentos_cliente", "consultar_indicadores_crm"],
    modo: "sombra",
    permiteEscrita: false,
  },
  {
    id: "insights",
    nome: "Insights",
    objetivo: "Explicar indicadores oficiais sem confundir agenda com dinheiro recebido.",
    ferramentas: ["consultar_indicadores_crm", "consultar_movimento", "consultar_caixa_hoje"],
    modo: "sombra",
    permiteEscrita: false,
  },
  {
    id: "conhecimento",
    nome: "Conhecimento",
    objetivo: "Responder com documentação oficial do Flow, sem inventar funções.",
    ferramentas: ["consultar_ajuda_flow"],
    modo: "sombra",
    permiteEscrita: false,
  },
  {
    id: "operacoes",
    nome: "Operações",
    objetivo: "Investigar agenda e fila sem modificar dados nem iniciar avisos.",
    ferramentas: ["minha_agenda", "consultar_fila"],
    modo: "sombra",
    permiteEscrita: false,
  },
];

/**
 * Interseção obrigatória com as ações JÁ permitidas pelo cérebro oficial.
 * Não concede acesso por conta própria; não transforma lista em executor.
 */
export function ferramentasDoEspecialista(
  id: IdEspecialistaFlow,
  ferramentasJaAutorizadas: readonly string[],
): string[] {
  const especialista = ESPECIALISTAS_FLOW.find((item) => item.id === id);
  if (!especialista) return [];
  return especialista.ferramentas.filter((nome) => ferramentasJaAutorizadas.includes(nome));
}
