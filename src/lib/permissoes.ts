export const PERMISSOES = [
  "criar_agendamento", "agendamento_manual", "cancelar_agendamento", "confirmar_pagamento",
  "registrar_venda", "alterar_preco", "visualizar_estoque", "alterar_estoque",
  "visualizar_clientes", "editar_clientes", "visualizar_financeiro", "relatorios",
  "gerenciar_profissionais", "alterar_dados_barbearia", "gerenciar_permissoes", "acoes_destrutivas",
] as const;

export type Permissao = (typeof PERMISSOES)[number];
export type PapelEquipe = "dono" | "gerente" | "barbeiro" | "recepcao";

export const ROTULOS_PERMISSAO: Record<Permissao, string> = {
  criar_agendamento: "Criar agendamento", agendamento_manual: "Agendamento manual",
  cancelar_agendamento: "Cancelar agendamento", confirmar_pagamento: "Confirmar pagamento",
  registrar_venda: "Registrar venda", alterar_preco: "Alterar preço",
  visualizar_estoque: "Visualizar estoque", alterar_estoque: "Alterar estoque",
  visualizar_clientes: "Visualizar clientes", editar_clientes: "Editar clientes",
  visualizar_financeiro: "Visualizar financeiro", relatorios: "Relatórios",
  gerenciar_profissionais: "Gerenciar profissionais", alterar_dados_barbearia: "Alterar dados da barbearia",
  gerenciar_permissoes: "Gerenciar equipe e permissões", acoes_destrutivas: "Ações destrutivas",
};

export const ROTULOS_PAPEL: Record<PapelEquipe, string> = {
  dono: "Dono", gerente: "Gerente", barbeiro: "Barbeiro", recepcao: "Recepção",
};

/** Grupos usados na tela de equipe para evitar uma parede de caixas de seleção. */
export const GRUPOS_PERMISSAO: { titulo: string; itens: Permissao[] }[] = [
  { titulo: "Atendimento", itens: ["criar_agendamento", "agendamento_manual", "cancelar_agendamento"] },
  { titulo: "Dinheiro", itens: ["confirmar_pagamento", "registrar_venda", "alterar_preco", "visualizar_financeiro", "relatorios"] },
  { titulo: "Estoque", itens: ["visualizar_estoque", "alterar_estoque"] },
  { titulo: "Clientes", itens: ["visualizar_clientes", "editar_clientes"] },
  { titulo: "Administração", itens: ["gerenciar_profissionais", "alterar_dados_barbearia", "gerenciar_permissoes", "acoes_destrutivas"] },
];

/** Ponto de partida por perfil; o dono pode personalizar depois. */
export const PADRAO_POR_PAPEL: Record<PapelEquipe, Permissao[]> = {
  dono: [...PERMISSOES],
  gerente: ["criar_agendamento", "agendamento_manual", "cancelar_agendamento", "confirmar_pagamento", "registrar_venda", "alterar_preco", "visualizar_estoque", "alterar_estoque", "visualizar_clientes", "editar_clientes", "visualizar_financeiro", "relatorios", "gerenciar_profissionais"],
  barbeiro: ["criar_agendamento", "agendamento_manual", "visualizar_clientes"],
  recepcao: ["criar_agendamento", "agendamento_manual", "cancelar_agendamento", "confirmar_pagamento", "registrar_venda", "visualizar_clientes", "editar_clientes"],
};