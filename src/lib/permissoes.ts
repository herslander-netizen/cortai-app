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
  gerenciar_voltai: "Configurar o Voltaí (fidelidade)",
  ver_cortai: "Ver o CortAI e as conversas",
  gerenciar_conversas: "Organizar conversas do WhatsApp",
  assumir_conversa: "Assumir e responder conversas",
  configurar_automacoes: "Configurar o atendimento automático",
  gerenciar_whatsapp: "Conectar e desconectar o WhatsApp",
} as const;

export type ChaveDePermissao = keyof typeof PERMISSOES;

/** Ações da matriz, sempre nesta ordem e sempre em português. */
export const ACOES = {
  visualizar: "Visualizar",
  criar: "Criar",
  editar: "Editar",
  excluir: "Excluir",
  administrar: "Administrar",
} as const;

export type AcaoDePermissao = keyof typeof ACOES;

export type ItemDeModulo = { acao: AcaoDePermissao; chave: ChaveDePermissao; rotulo: string };

/** Matriz por módulo, na linguagem do dono da barbearia. */
export const MODULOS: { id: string; titulo: string; descricao: string; itens: ItemDeModulo[] }[] = [
  {
    id: "agenda",
    titulo: "Agenda",
    descricao: "Horários, encaixes e faltas do dia a dia.",
    itens: [
      { acao: "criar", chave: "criar_agendamento", rotulo: "Agendar horário" },
      { acao: "editar", chave: "agendamento_manual", rotulo: "Encaixar atendimento manual" },
      { acao: "excluir", chave: "cancelar_agendamento", rotulo: "Cancelar horário e marcar falta" },
    ],
  },
  {
    id: "clientes",
    titulo: "Clientes",
    descricao: "Cadastro, histórico e ficha de cada cliente.",
    itens: [
      { acao: "visualizar", chave: "visualizar_clientes", rotulo: "Ver a lista de clientes" },
      { acao: "editar", chave: "editar_clientes", rotulo: "Cadastrar e editar clientes" },
    ],
  },
  {
    id: "caixa",
    titulo: "Caixa",
    descricao: "Dinheiro que entra e sai da barbearia.",
    itens: [
      { acao: "visualizar", chave: "visualizar_financeiro", rotulo: "Ver caixa e financeiro" },
      { acao: "criar", chave: "confirmar_pagamento", rotulo: "Confirmar pagamento recebido" },
      { acao: "administrar", chave: "alterar_preco", rotulo: "Alterar preços e serviços" },
    ],
  },
  {
    id: "voltai",
    titulo: "Voltaí",
    descricao: "Programa de fidelidade que traz o cliente de volta.",
    itens: [{ acao: "administrar", chave: "gerenciar_voltai", rotulo: "Configurar as regras do Voltaí" }],
  },
  {
    id: "loja",
    titulo: "Loja",
    descricao: "Produtos, estoque e vendas no balcão.",
    itens: [
      { acao: "visualizar", chave: "visualizar_estoque", rotulo: "Ver produtos e estoque" },
      { acao: "criar", chave: "registrar_venda", rotulo: "Registrar venda" },
      { acao: "editar", chave: "alterar_estoque", rotulo: "Alterar produtos e estoque" },
    ],
  },
  {
    id: "equipe",
    titulo: "Equipe",
    descricao: "Quem trabalha na barbearia e o que cada um pode fazer.",
    itens: [
      { acao: "editar", chave: "gerenciar_profissionais", rotulo: "Gerenciar profissionais" },
      { acao: "excluir", chave: "acoes_destrutivas", rotulo: "Excluir dados e acessos" },
      { acao: "administrar", chave: "gerenciar_permissoes", rotulo: "Convidar pessoas e definir permissões" },
      { acao: "administrar", chave: "alterar_dados_barbearia", rotulo: "Alterar dados e marca da barbearia" },
    ],
  },
  {
    id: "relatorios",
    titulo: "Relatórios",
    descricao: "Resultados e números do negócio.",
    itens: [{ acao: "visualizar", chave: "relatorios", rotulo: "Ver relatórios" }],
  },
  {
    id: "cortai",
    titulo: "CortAI no WhatsApp",
    descricao: "Atendimento pelo WhatsApp e conversas com os clientes.",
    itens: [
      { acao: "visualizar", chave: "ver_cortai", rotulo: "Ver o CortAI e as conversas" },
      { acao: "editar", chave: "gerenciar_conversas", rotulo: "Organizar e encerrar conversas" },
      { acao: "criar", chave: "assumir_conversa", rotulo: "Assumir e responder conversas" },
      { acao: "administrar", chave: "configurar_automacoes", rotulo: "Configurar o atendimento automático" },
      { acao: "administrar", chave: "gerenciar_whatsapp", rotulo: "Conectar e desconectar o WhatsApp" },
    ],
  },
];

/** Agrupamento antigo, mantido para telas que ainda usam a lista simples. */
export const GRUPOS_DE_PERMISSAO: { titulo: string; chaves: ChaveDePermissao[] }[] = MODULOS.map(
  (modulo) => ({ titulo: modulo.titulo, chaves: modulo.itens.map((item) => item.chave) }),
);


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
    "gerenciar_voltai",
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
