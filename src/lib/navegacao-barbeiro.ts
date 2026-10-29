import {
  Banknote,
  Bot,
  Gauge,
  HeartHandshake,
  MessageCircle,
  Clock3,
  Eye,
  Scissors,
  Store,
  UsersRound,
  CalendarDays,
  ContactRound,
  Hourglass,
  MapPin,
} from "lucide-react";

import type { ChaveDePermissao } from "@/lib/permissoes";
import { termos, type Segmento } from "@/lib/segmentos";

/**
 * Um item por área. Telas relacionadas (ex.: Caixa, Comissões, Relatórios)
 * ficam reunidas em SECOES e aparecem como abas dentro da área.
 */
export const MODULOS_DE_NAVEGACAO = [
  {
    grupo: "Dia a dia",
    to: "/barbeiro/hoje",
    label: "Hoje",
    detail: "Resumo do dia e atendimentos ao vivo",
    icon: Gauge,
    permissao: "relatorios",
  },
  {
    grupo: "Dia a dia",
    to: "/barbeiro",
    label: "Agenda",
    detail: "Dia, horários e atendimentos",
    icon: CalendarDays,
    permissao: "criar_agendamento",
    rotaDaCapacidade: "/barbeiro/agenda",
  },
  {
    grupo: "Dia a dia",
    to: "/barbeiro/fila",
    label: "Lista de espera",
    detail: "Clientes aguardando uma vaga futura",
    icon: Hourglass,
    permissao: "criar_agendamento",
    rotaDaCapacidade: "/barbeiro/fila",
  },
  {
    grupo: "Dia a dia",
    to: "/barbeiro/clientes",
    label: "Clientes",
    detail: "Cadastro, histórico e retorno",
    icon: ContactRound,
    permissao: "visualizar_clientes",
    rotaDaCapacidade: "/barbeiro/clientes",
  },
  {
    grupo: "Dia a dia",
    to: "/barbeiro/caixa",
    label: "Financeiro",
    detail: "Caixa, comissões e relatórios",
    icon: Banknote,
    permissao: "visualizar_financeiro",
  },
  {
    grupo: "Negócio",
    to: "/barbeiro/servicos",
    label: "Serviços",
    detail: "Preços, duração e retorno",
    icon: Scissors,
    permissao: "alterar_preco",
    rotaDaCapacidade: "/barbeiro/servicos",
  },
  {
    grupo: "Negócio",
    to: "/barbeiro/profissionais",
    label: "Equipe",
    detail: "Profissionais e acessos",
    icon: UsersRound,
    permissao: "gerenciar_profissionais",
  },
  {
    grupo: "Negócio",
    to: "/barbeiro/horarios",
    label: "Horários",
    detail: "Dias e horas de atendimento",
    icon: Clock3,
    permissao: "alterar_dados_barbearia",
  },
  {
    grupo: "Negócio",
    to: "/barbeiro/produtos",
    label: "Loja e estoque",
    detail: "Produtos, vendas e alertas",
    icon: Store,
    permissao: "visualizar_estoque",
  },
  {
    grupo: "Negócio",
    to: "/barbeiro/configurar",
    label: "Dados e localização",
    detail: "Informações essenciais do negócio",
    icon: MapPin,
    permissao: "alterar_dados_barbearia",
  },
  {
    grupo: "Clientes e marca",
    to: "/barbeiro/cortai",
    label: "WhatsApp",
    detail: "Conexão, notificações e experiência",
    icon: MessageCircle,
    permissao: "ver_cortai",
    rotaDaCapacidade: "/barbeiro/cortai",
  },
  {
    grupo: "Clientes e marca",
    to: "/barbeiro/automacao",
    label: "Automação do WhatsApp",
    detail: "Atendimento e avisos inteligentes",
    icon: Bot,
    permissao: "ver_cortai",
    rotaDaCapacidade: "/barbeiro/cortai",
  },
  {
    grupo: "Clientes e marca",
    to: "/barbeiro/avaliacoes",
    label: "Relacionamento",
    detail: "Avaliações, Voltaí e indicações",
    icon: HeartHandshake,
    permissao: "alterar_dados_barbearia",
  },
  {
    grupo: "Clientes e marca",
    to: "/barbeiro/marca",
    label: "Sua Página",
    detail: "Página pública, layout e temas",
    icon: Eye,
    permissao: "alterar_dados_barbearia",
  },
] as const satisfies ReadonlyArray<{
  grupo: string;
  to: string;
  label: string;
  detail: string;
  icon: typeof Banknote;
  permissao: ChaveDePermissao;
  rotaDaCapacidade?: string;
}>;

export const GRUPOS_DE_NAVEGACAO = ["Dia a dia", "Negócio", "Clientes e marca"] as const;

type Aba = { to: string; label: string; permissao?: ChaveDePermissao };

/** Áreas consolidadas: cada rota antiga continua existindo e vira uma aba. */
export const SECOES: ReadonlyArray<{ titulo: string; abas: ReadonlyArray<Aba> }> = [
  {
    titulo: "Hoje",
    abas: [
      { to: "/barbeiro/hoje", label: "Resumo", permissao: "relatorios" },
      { to: "/barbeiro/casa", label: "Ao vivo", permissao: "confirmar_pagamento" },
    ],
  },
  {
    titulo: "Financeiro",
    abas: [
      { to: "/barbeiro/caixa", label: "Caixa", permissao: "visualizar_financeiro" },
      { to: "/barbeiro/comissoes", label: "Comissões", permissao: "visualizar_financeiro" },
      { to: "/barbeiro/financeiro", label: "Relatórios", permissao: "visualizar_financeiro" },
    ],
  },
  {
    titulo: "Equipe",
    abas: [
      {
        to: "/barbeiro/profissionais",
        label: "Profissionais",
        permissao: "gerenciar_profissionais",
      },
      { to: "/barbeiro/equipe", label: "Acessos", permissao: "gerenciar_permissoes" },
    ],
  },
  {
    titulo: "WhatsApp",
    abas: [
      { to: "/barbeiro/cortai", label: "Flow", permissao: "ver_cortai" },
      { to: "/barbeiro/cortai-atividade", label: "Atividade", permissao: "ver_cortai" },
    ],
  },
  {
    titulo: "Relacionamento",
    abas: [
      { to: "/barbeiro/avaliacoes", label: "Avaliações", permissao: "alterar_dados_barbearia" },
      { to: "/barbeiro/fidelidade", label: "Voltaí", permissao: "gerenciar_voltai" },
      { to: "/barbeiro/indicacoes", label: "Indicações", permissao: "relatorios" },
      { to: "/barbeiro/crescimento", label: "Crescimento", permissao: "relatorios" },
      { to: "/barbeiro/divulgar", label: "Divulgar nas redes", permissao: "relatorios" },
    ],
  },
  {
    titulo: "Sua Página",
    abas: [
      { to: "/barbeiro/marca", label: "Sua Página", permissao: "alterar_dados_barbearia" },
    ],
  },
];

export function secaoDoCaminho(caminho: string) {
  const limpo = caminho.replace(/\/$/, "");
  return SECOES.find((s) => s.abas.some((a) => limpo === a.to || limpo.startsWith(`${a.to}/`)));
}

/** Mantém um único item principal ativo, incluindo as telas irmãs reunidas por área. */
export function itemDeNavegacaoAtivo(caminho: string, to: string) {
  const limpo = caminho.replace(/\/$/, "");
  if (to === "/barbeiro") return limpo === "/barbeiro" || limpo === "/barbeiro/agenda";
  return (
    limpo === to ||
    limpo.startsWith(`${to}/`) ||
    Boolean(secaoDoCaminho(limpo)?.abas.some((a) => a.to === to))
  );
}

/** Itens fixos da lateral de telas maiores; o drawer desktop não os repete. */
export function itensDaBarra(permissoes: ReadonlyArray<string> | undefined) {
  const financeiro = permissoes?.includes("visualizar_financeiro");
  return [
    { to: "/barbeiro", label: "Agenda" },
    { to: "/barbeiro/clientes", label: "Clientes" },
    financeiro
      ? { to: "/barbeiro/caixa", label: "Financeiro" }
      : { to: "/barbeiro/fila", label: "Espera" },
  ] as const;
}

/** Dia a dia completo no celular, com a Agenda como primeira porta de entrada. */
export function itensDoDiaADiaNoMenuMovel(permissoes: ReadonlyArray<string> | undefined) {
  return [...MODULOS_DE_NAVEGACAO]
    .filter((item) => item.grupo === "Dia a dia")
    .filter((item) => !item.permissao || permissoes?.includes(item.permissao))
    .sort((a, b) => (a.to === "/barbeiro" ? -1 : b.to === "/barbeiro" ? 1 : 0));
}

export function modulosDeNavegacao(segmento: Segmento) {
  if (segmento === "barbearia") return MODULOS_DE_NAVEGACAO;
  const t = termos(segmento);
  return MODULOS_DE_NAVEGACAO.map((item) => ({
    ...item,
    detail:
      item.to === "/barbeiro/hoje" ? `Resumo do dia ${t.de} e atendimentos ao vivo` : item.detail,
  }));
}
