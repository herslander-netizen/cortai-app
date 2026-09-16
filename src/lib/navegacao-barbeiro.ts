import {
  Banknote,
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

export const MODULOS_DE_NAVEGACAO = [
  { grupo: "Operação", to: "/barbeiro/caixa", label: "Caixa", detail: "Entradas e valores em aberto", icon: Banknote, permissao: "visualizar_financeiro" },
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
  { grupo: "Operação", to: "/barbeiro/cortai", label: "CortAI no WhatsApp", detail: "Conexão, conversas e atendimento", icon: MessageCircle, permissao: "ver_cortai" },
  { grupo: "Gestão", to: "/barbeiro/cortai-atividade", label: "Atividade do CortAI", detail: "Assuntos, consultas e falhas", icon: Bot, permissao: "ver_cortai" },
  { grupo: "Gestão", to: "/barbeiro/painel-ia", label: "Painel do atendente", detail: "Resumo, agenda, clientes e serviços", icon: BarChart3, permissao: "ver_cortai" },
  { grupo: "Configurações", to: "/barbeiro/integracoes", label: "Integrações", detail: "Atendimento inteligente da ALVO", icon: Bot, permissao: "alterar_dados_barbearia" },
] as const satisfies ReadonlyArray<{ grupo: string; to: string; label: string; detail: string; icon: typeof Banknote; permissao: ChaveDePermissao }>;

export const GRUPOS_DE_NAVEGACAO = ["Operação", "Gestão", "Configurações"] as const;