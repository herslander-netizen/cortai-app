import {
  Armchair,
  Banknote,
  Gauge,
  BarChart3,
  Megaphone,
  MessageCircle,
  Clock3,
  Palette,
  Scissors,
  Sparkles,
  Star,
  Store,
  UserSquare2,
  UsersRound,
  CalendarDays,
  ContactRound,
  ListOrdered,
  MapPin,
} from "lucide-react";

import type { ChaveDePermissao } from "@/lib/permissoes";
import { termos, type Segmento } from "@/lib/segmentos";

export const MODULOS_DE_NAVEGACAO = [
  {
    grupo: "Negócio",
    to: "/barbeiro/hoje",
    label: "Hoje",
    detail: "O dia da barbearia em cinco números",
    icon: Gauge,
    permissao: "relatorios",
  },
  {
    grupo: "Negócio",
    to: "/barbeiro/casa",
    label: "Visão Casa",
    detail: "Todas as cadeiras, fila e caixa ao vivo",
    icon: Armchair,
    permissao: "confirmar_pagamento",
  },
  {
    grupo: "Agenda",
    to: "/barbeiro",
    label: "Agenda",
    detail: "Dia, horários e atendimentos",
    icon: CalendarDays,
    permissao: "criar_agendamento",
    rotaDaCapacidade: "/barbeiro/agenda",
  },
  {
    grupo: "Agenda",
    to: "/barbeiro/agendamentos",
    label: "Agendamentos confirmados",
    detail: "Nome, WhatsApp e horário de cada cliente",
    icon: Clock3,
    permissao: "visualizar_clientes",
  },
  {
    grupo: "Agenda",
    to: "/barbeiro/horarios",
    label: "Horários",
    detail: "Dias e horas de atendimento",
    icon: Clock3,
    permissao: "alterar_dados_barbearia",
  },
  {
    grupo: "Agenda",
    to: "/barbeiro/fila",
    label: "Fila de espera",
    detail: "Encaixes e clientes aguardando",
    icon: ListOrdered,
    permissao: "criar_agendamento",
    rotaDaCapacidade: "/barbeiro/fila",
  },
  {
    grupo: "Atendimento",
    to: "/barbeiro/clientes",
    label: "Clientes",
    detail: "Cadastro, histórico e retorno",
    icon: ContactRound,
    permissao: "visualizar_clientes",
    rotaDaCapacidade: "/barbeiro/clientes",
  },
  {
    grupo: "Atendimento",
    to: "/barbeiro/servicos",
    label: "Serviços",
    detail: "Preços, duração e retorno",
    icon: Scissors,
    permissao: "alterar_preco",
    rotaDaCapacidade: "/barbeiro/servicos",
  },
  {
    grupo: "Financeiro",
    to: "/barbeiro/caixa",
    label: "Caixa",
    detail: "Entradas, saídas e fiado em aberto",
    icon: Banknote,
    permissao: "visualizar_financeiro",
  },
  {
    grupo: "Financeiro",
    to: "/barbeiro/comissoes",
    label: "Comissões",
    detail: "Gerada, paga e pendente por profissional",
    icon: Banknote,
    permissao: "visualizar_financeiro",
  },

  {
    grupo: "Financeiro",
    to: "/barbeiro/produtos",
    label: "Loja e estoque",
    detail: "Produtos, vendas e alertas",
    icon: Store,
    permissao: "visualizar_estoque",
  },
  {
    grupo: "Equipe",
    to: "/barbeiro/profissionais",
    label: "Profissionais",
    detail: "Perfis e portfólios",
    icon: UserSquare2,
    permissao: "gerenciar_profissionais",
  },
  {
    grupo: "Equipe",
    to: "/barbeiro/equipe",
    label: "Equipe e permissões",
    detail: "Acessos e responsabilidades",
    icon: UsersRound,
    permissao: "gerenciar_permissoes",
    rotaDaCapacidade: "/barbeiro/equipe",
  },
  {
    grupo: "Financeiro",
    to: "/barbeiro/financeiro",
    label: "Relatórios",
    detail: "Faturamento e movimentações",
    icon: BarChart3,
    permissao: "visualizar_financeiro",
  },
  {
    grupo: "Negócio",
    to: "/barbeiro/crescimento",
    label: "Crescimento",
    detail: "Ocupação, recorrência e números",
    icon: Sparkles,
    permissao: "relatorios",
  },
  {
    grupo: "Negócio",
    to: "/barbeiro/indicacoes",
    label: "Marketing",
    detail: "Indicações e novos clientes",
    icon: Megaphone,
    permissao: "relatorios",
  },
  {
    grupo: "Atendimento",
    to: "/barbeiro/avaliacoes",
    label: "Avaliações",
    detail: "Notas e convite público",
    icon: Star,
    permissao: "alterar_dados_barbearia",
  },
  {
    grupo: "Atendimento",
    to: "/barbeiro/fidelidade",
    label: "Voltaí",
    detail: "Seu cliente corta. Ganha. Volta.",
    icon: Star,
    permissao: "gerenciar_voltai",
  },
  {
    grupo: "Secretária e link",
    to: "/barbeiro/marca",
    label: "Página e marca",
    detail: "Identidade e página pública",
    icon: Palette,
    permissao: "alterar_dados_barbearia",
  },
  {
    grupo: "Secretária e link",
    to: "/barbeiro/temas",
    label: "Temas e layouts",
    detail: "Troque o visual com prévia ao vivo",
    icon: Palette,
    permissao: "alterar_dados_barbearia",
  },
  {
    grupo: "Secretária e link",
    to: "/barbeiro/cortai",
    label: "Secretária Cortaí",
    detail: "Conexão, notificações e experiência",
    icon: MessageCircle,
    permissao: "ver_cortai",
    rotaDaCapacidade: "/barbeiro/cortai",
  },
  {
    grupo: "Negócio",
    to: "/barbeiro/configurar",
    label: "Dados e localização",
    detail: "Informações essenciais do negócio",
    icon: MapPin,
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

export const GRUPOS_DE_NAVEGACAO = [
  "Agenda",
  "Atendimento",
  "Equipe",
  "Financeiro",
  "Secretária e link",
  "Negócio",
] as const;

export function modulosDeNavegacao(segmento: Segmento) {
  if (segmento === "barbearia") return MODULOS_DE_NAVEGACAO;
  const t = termos(segmento);
  return MODULOS_DE_NAVEGACAO.map((item) => ({
    ...item,
    detail:
      item.to === "/barbeiro/hoje"
        ? `O dia ${t.de} em cinco números`
        : item.to === "/barbeiro/casa"
          ? "Todos os atendimentos, fila e caixa ao vivo"
          : item.to === "/barbeiro/fidelidade"
            ? "Cliente vem. Ganha. Volta."
            : item.detail,
  }));
}
