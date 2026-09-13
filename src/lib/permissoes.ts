/**
 * Matriz de permissões da barbearia.
 * As chaves são exatamente as usadas em `tenant_usuarios.permissoes` e nas
 * funções do banco (`has_tenant_permission`, `permissoes_padrao`).
 * A interface só esconde botões; a checagem de verdade acontece no servidor.
 */
export const PERMISSOES = {
  criar_agendamento: "Agendar horários",
  agendamento_manual: "Encaixar atendimento manual",
  cancelar_agendamento: "Cancelar e marcar falta",
  confirmar_pagamento: "Confirmar pagamento",
  registrar_venda: "Registrar venda na loja",
  alterar_preco: "Alterar preços e serviços",
  visualizar_estoque: "Ver estoque",
  alterar_estoque: "Alterar estoque",
  visualizar_clientes: "Ver clientes",
  editar_clientes: "Editar clientes",
  visualizar_financeiro: "Ver caixa e financeiro",
  relatorios: "Ver relatórios",
  gerenciar_profissionais: "Gerenciar profissionais",
  alterar_dados_barbearia: "Alterar dados e marca da barbearia",
  gerenciar_permissoes: "Gerenciar equipe e permissões",
  acoes_destrutivas: "Ações críticas e exclusões",
} as const;

export type ChaveDePermissao = keyof typeof PERMISSOES;

/** Agrupamento por módulo, na linguagem do dono da barbearia. */
export const GRUPOS_DE_PERMISSAO: { titulo: string; chaves: ChaveDePermissao[] }[] = [
  { titulo: "Agenda e fila", chaves: ["criar_agendamento", "agendamento_manual", "cancelar_agendamento"] },
  { titulo: "Clientes e Voltaí", chaves: ["visualizar_clientes", "editar_clientes"] },
  { titulo: "Caixa e loja", chaves: ["confirmar_pagamento", "registrar_venda", "visualizar_estoque", "alterar_estoque"] },
  { titulo: "Gestão", chaves: ["visualizar_financeiro", "relatorios", "alterar_preco", "gerenciar_profissionais"] },
  { titulo: "Administração", chaves: ["alterar_dados_barbearia", "gerenciar_permissoes", "acoes_destrutivas"] },
];

export const PAPEIS = {
  dono: "Proprietário",
  gerente: "Admin/Gerente",
  barbeiro: "Profissional/Barbeiro",
  recepcao: "Recepção/Atendimento",
} as const;

export type PapelDeEquipe = keyof typeof PAPEIS;

export const DESCRICAO_DO_PAPEL: Record<PapelDeEquipe, string> = {
  dono: "Acesso total, inclusive equipe e permissões.",
  gerente: "Gestão da barbearia conforme as permissões concedidas.",
  barbeiro: "Atende, agenda e registra o que sua função permite.",
  recepcao: "Agenda, clientes e operação do balcão.",
};

/** Espelha `permissoes_padrao` do banco — usado só para pré-marcar a tela. */
export const PERMISSOES_PADRAO: Record<PapelDeEquipe, ChaveDePermissao[]> = {
  dono: Object.keys(PERMISSOES) as ChaveDePermissao[],
  gerente: [
    "criar_agendamento",
    "agendamento_manual",
    "cancelar_agendamento",
    "confirmar_pagamento",
    "registrar_venda",
    "alterar_preco",
    "visualizar_estoque",
    "alterar_estoque",
    "visualizar_clientes",
    "editar_clientes",
    "visualizar_financeiro",
    "relatorios",
    "gerenciar_profissionais",
    "alterar_dados_barbearia",
  ],
  barbeiro: [
    "criar_agendamento",
    "agendamento_manual",
    "cancelar_agendamento",
    "confirmar_pagamento",
    "registrar_venda",
    "visualizar_estoque",
    "visualizar_clientes",
    "editar_clientes",
  ],
  recepcao: [
    "criar_agendamento",
    "agendamento_manual",
    "cancelar_agendamento",
    "confirmar_pagamento",
    "registrar_venda",
    "visualizar_estoque",
    "visualizar_clientes",
    "editar_clientes",
  ],
};

export const SEM_PERMISSAO = "Você não tem permissão para acessar esta área.";
