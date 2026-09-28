import {
  Armchair,
  Banknote,
  Gauge,
  BarChart3,
  Bot,
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
} from "lucide-react";

import type { ChaveDePermissao } from "@/lib/permissoes";
import { termos, type Segmento } from "@/lib/segmentos";

export const MODULOS_DE_NAVEGACAO = [
  { grupo: "Gestão", to: "/barbeiro/hoje", label: "Hoje", detail: "O dia da barbearia em cinco números", icon: Gauge, permissao: "relatorios" },
  { grupo: "Operação", to: "/barbeiro/casa", label: "Visão Casa", detail: "Todas as cadeiras, fila e caixa ao vivo", icon: Armchair, permissao: "confirmar_pagamento" },
  { grupo: "Operação", to: "/barbeiro/agendamentos", label: "Agendamentos confirmados", detail: "Nome, WhatsApp e horário de cada cliente", icon: Clock3, permissao: "visualizar_clientes" },
  { grupo: "Operação", to: "/barbeiro/caixa", label: "Caixa", detail: "Entradas, saídas e fiado em aberto", icon: Banknote, permissao: "visualizar_financeiro" },
  { grupo: "Gestão", to: "/barbeiro/comissoes", label: "Comissões", detail: "Gerada, paga e pendente por profissional", icon: Banknote, permissao: "visualizar_financeiro" },

  { grupo: "Operação", to: "/barbeiro/produtos", label: "Loja e estoque", detail: "Produtos, vendas e alertas", icon: Store, permissao: "visualizar_estoque" },
  { grupo: "Operação", to: "/barbeiro/profissionais", label: "Profissionais", detail: "Perfis e portfólios", icon: UserSquare2, permissao: "gerenciar_profissionais" },
  { grupo: "Operação", to: "/barbeiro/servicos", label: "Serviços", detail: "Preços e duração", icon: Scissors, permissao: "alterar_preco" },
  { grupo: "Gestão", to: "/barbeiro/financeiro", label: "Relatórios", detail: "Faturamento e movimentações", icon: BarChart3, permissao: "visualizar_financeiro" },
  { grupo: "Gestão", to: "/barbeiro/crescimento", label: "Crescimento", detail: "Ocupação, recorrência e números", icon: Sparkles, permissao: "relatorios" },
  { grupo: "Gestão", to: "/barbeiro/indicacoes", label: "Marketing", detail: "Indicações e novos clientes", icon: Megaphone, permissao: "relatorios" },
  { grupo: "Gestão", to: "/barbeiro/avaliacoes", label: "Avaliações", detail: "Notas e convite público", icon: Star, permissao: "alterar_dados_barbearia" },
  { grupo: "Gestão", to: "/barbeiro/fidelidade", label: "Voltaí", detail: "Seu cliente corta. Ganha. Volta.", icon: Star, permissao: "gerenciar_voltai" },
  { grupo: "Configurações", to: "/barbeiro/horarios", label: "Horários", detail: "Dias e horas em que você atende", icon: Clock3, permissao: "alterar_dados_barbearia" },
  { grupo: "Configurações", to: "/barbeiro/equipe", label: "Equipe e permissões", detail: "Quem entra e o que pode fazer", icon: UsersRound, permissao: "gerenciar_permissoes" },
  { grupo: "Configurações", to: "/barbeiro/marca", label: "Página e marca", detail: "Identidade e página pública", icon: Palette, permissao: "alterar_dados_barbearia" },
  { grupo: "Configurações", to: "/barbeiro/temas", label: "Temas e layouts", detail: "Troque o visual com prévia ao vivo", icon: Palette, permissao: "alterar_dados_barbearia" },
  { grupo: "Operação", to: "/barbeiro/cortai", label: "CortAI no WhatsApp", detail: "Conexão, conversas e atendimento", icon: MessageCircle, permissao: "ver_cortai" },
  { grupo: "Gestão", to: "/barbeiro/cortai-atividade", label: "Atividade do CortAI", detail: "Assuntos, consultas e falhas", icon: Bot, permissao: "ver_cortai" },
  { grupo: "Gestão", to: "/barbeiro/painel-ia", label: "Painel do atendente", detail: "Resumo, agenda, clientes e serviços", icon: BarChart3, permissao: "ver_cortai" },
  { grupo: "Operação", to: "/barbeiro/atendentes", label: "Painel de atendentes", detail: "Quem está online e assumir conversas", icon: UsersRound, permissao: "ver_cortai" },
] as const satisfies ReadonlyArray<{ grupo: string; to: string; label: string; detail: string; icon: typeof Banknote; permissao: ChaveDePermissao }>;

export const GRUPOS_DE_NAVEGACAO = ["Operação", "Gestão", "Configurações"] as const;

export function modulosDeNavegacao(segmento: Segmento) {
  if (segmento === "barbearia") return MODULOS_DE_NAVEGACAO;
  const t = termos(segmento);
  return MODULOS_DE_NAVEGACAO.map((item) => ({
    ...item,
    detail: item.to === "/barbeiro/hoje" ? `O dia ${t.de} em cinco números`
      : item.to === "/barbeiro/casa" ? "Todos os atendimentos, fila e caixa ao vivo"
      : item.to === "/barbeiro/fidelidade" ? "Cliente vem. Ganha. Volta."
      : item.detail,
  }));
}