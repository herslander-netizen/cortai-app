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
  alterar_dados_barbearia: "Alterar dados e marca do negócio",
  gerenciar_permissoes: "Gerenciar equipe e permissões",
  acoes_destrutivas: "Ações críticas e exclusões",
  gerenciar_voltai: "Configurar o Voltaí (fidelidade)",
  ver_cortai: "Ver o Flow e as conversas",
  gerenciar_conversas: "Organizar conversas do WhatsApp",
  assumir_conversa: "Assumir e responder conversas",
  configurar_automacoes: "Configurar o atendimento automático",
  gerenciar_whatsapp: "Conectar e desconectar o WhatsApp",
  conceder_desconto: "Dar desconto na comanda",
  caixa_abrir_fechar: "Abrir e fechar o caixa",
  caixa_movimentar: "Registrar saída, sangria e despesa",
  estorno_autorizar: "Autorizar estorno e ajuste",
  comissao_configurar: "Configurar comissões e Pix",
  comissao_pagar: "Pagar comissões",
  comissao_visualizar_todas: "Ver comissões de toda a equipe",
  caixa_do_dia: "Ver o caixa de hoje",
  gerenciar_plano: "Plano e cobrança do Flow",
  liberar_fiado: "Liberar fiado para clientes",
  excluir_barbearia: "Excluir o negócio",
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
    descricao: "Dinheiro que entra e sai do negócio.",
    itens: [
      { acao: "visualizar", chave: "caixa_do_dia", rotulo: "Ver o caixa de hoje" },
      {
        acao: "visualizar",
        chave: "visualizar_financeiro",
        rotulo: "Ver caixa e financeiro completos",
      },
      { acao: "criar", chave: "confirmar_pagamento", rotulo: "Confirmar pagamento recebido" },
      { acao: "criar", chave: "conceder_desconto", rotulo: "Dar desconto na comanda" },
      { acao: "editar", chave: "caixa_movimentar", rotulo: "Registrar saída, sangria e despesa" },
      { acao: "administrar", chave: "caixa_abrir_fechar", rotulo: "Abrir e fechar o caixa" },
      { acao: "administrar", chave: "estorno_autorizar", rotulo: "Autorizar estorno e ajuste" },
      { acao: "administrar", chave: "comissao_configurar", rotulo: "Configurar comissões e Pix" },
      { acao: "administrar", chave: "comissao_pagar", rotulo: "Pagar comissões" },
      {
        acao: "visualizar",
        chave: "comissao_visualizar_todas",
        rotulo: "Ver comissões de toda a equipe",
      },
      { acao: "administrar", chave: "alterar_preco", rotulo: "Alterar preços e serviços" },
    ],
  },
  {
    id: "voltai",
    titulo: "Voltaí",
    descricao: "Programa de fidelidade que traz o cliente de volta.",
    itens: [
      { acao: "administrar", chave: "gerenciar_voltai", rotulo: "Configurar as regras do Voltaí" },
    ],
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
    descricao: "Quem trabalha no negócio e o que cada um pode fazer.",
    itens: [
      { acao: "editar", chave: "gerenciar_profissionais", rotulo: "Gerenciar profissionais" },
      { acao: "excluir", chave: "acoes_destrutivas", rotulo: "Excluir dados e acessos" },
      {
        acao: "administrar",
        chave: "gerenciar_permissoes",
        rotulo: "Convidar pessoas e definir permissões",
      },
      {
        acao: "administrar",
        chave: "alterar_dados_barbearia",
        rotulo: "Alterar dados e marca do negócio",
      },
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
    titulo: "Flow no WhatsApp",
    descricao: "Atendimento pelo WhatsApp e conversas com os clientes.",
    itens: [
      { acao: "visualizar", chave: "ver_cortai", rotulo: "Ver o Flow e as conversas" },
      { acao: "editar", chave: "gerenciar_conversas", rotulo: "Organizar e encerrar conversas" },
      { acao: "criar", chave: "assumir_conversa", rotulo: "Assumir e responder conversas" },
      {
        acao: "administrar",
        chave: "configurar_automacoes",
        rotulo: "Configurar o atendimento automático",
      },
      {
        acao: "administrar",
        chave: "gerenciar_whatsapp",
        rotulo: "Conectar e desconectar o WhatsApp",
      },
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
  gerente: "Gestão do negócio conforme as permissões concedidas.",
  barbeiro: "Atende, agenda e registra o que sua função permite.",
  recepcao: "Agenda, clientes e operação do balcão.",
};

const TODAS = Object.keys(PERMISSOES) as ChaveDePermissao[];
const SO_DONO: ChaveDePermissao[] = ["gerenciar_plano", "liberar_fiado", "excluir_barbearia"];

/** Espelha `teto_do_papel` do banco: o ajuste fino nunca passa daqui. */
export const TETO_DO_PAPEL: Record<PapelDeEquipe, ChaveDePermissao[]> = {
  dono: TODAS,
  gerente: TODAS.filter((c) => !SO_DONO.includes(c)),
  recepcao: [
    "criar_agendamento",
    "agendamento_manual",
    "cancelar_agendamento",
    "confirmar_pagamento",
    "registrar_venda",
    "visualizar_estoque",
    "visualizar_clientes",
    "editar_clientes",
    "ver_cortai",
    "gerenciar_conversas",
    "assumir_conversa",
    "conceder_desconto",
    "caixa_abrir_fechar",
    "caixa_movimentar",
    "caixa_do_dia",
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
    "ver_cortai",
    "assumir_conversa",
    "conceder_desconto",
  ],
};

/** Espelha `permissoes_padrao` do banco — o preset aplicado em um toque. */
export const PERMISSOES_PADRAO: Record<PapelDeEquipe, ChaveDePermissao[]> = {
  dono: TODAS,
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
    "gerenciar_permissoes",
    "gerenciar_voltai",
    "ver_cortai",
    "gerenciar_conversas",
    "assumir_conversa",
    "configurar_automacoes",
    "gerenciar_whatsapp",
    "conceder_desconto",
    "caixa_abrir_fechar",
    "caixa_movimentar",
    "comissao_visualizar_todas",
    "caixa_do_dia",
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
    "caixa_do_dia",
  ],
};

export const SEM_PERMISSAO = "Você não tem permissão para acessar esta área.";
