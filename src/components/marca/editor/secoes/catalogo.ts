import {
  CalendarCheck,
  CalendarDays,
  Clock3,
  House,
  Images,
  Instagram,
  MapPin,
  MessageCircle,
  Package,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { componenteIds } from "@/lib/pagina-config";

export type ComponenteId = (typeof componenteIds)[number];

/** Nome, resumo e ícone de cada seção da página pública. */
export const CATALOGO_DE_SECOES: Record<
  ComponenteId,
  { nome: string; descricao: string; icone: LucideIcon }
> = {
  apresentacao: {
    nome: "Apresentação",
    descricao: "Frase de boas-vindas e apresentação do negócio.",
    icone: House,
  },
  servicos: {
    nome: "Serviços",
    descricao: "Serviços cadastrados, duração e preço.",
    icone: Clock3,
  },
  profissionais: {
    nome: "Equipe",
    descricao: "Profissionais e suas informações públicas.",
    icone: Users,
  },
  galeria: {
    nome: "Galeria",
    descricao: "Fotos para mostrar o espaço e o trabalho.",
    icone: Images,
  },
  avaliacoes: {
    nome: "Avaliações",
    descricao: "Notas e avaliações disponíveis do negócio.",
    icone: Star,
  },
  produtos: {
    nome: "Produtos",
    descricao: "Produtos do catálogo, quando a loja estiver ativa.",
    icone: Package,
  },
  instagram: {
    nome: "Redes sociais",
    descricao: "Links das redes sociais do negócio.",
    icone: Instagram,
  },
  localizacao: {
    nome: "Localização",
    descricao: "Endereço público e acesso ao mapa.",
    icone: MapPin,
  },
  horarios: { nome: "Horários", descricao: "Horários de funcionamento do negócio.", icone: Clock3 },
  whatsapp: {
    nome: "Contato",
    descricao: "Atalho de contato pelo WhatsApp ou telefone cadastrado.",
    icone: MessageCircle,
  },
  cta_final: {
    nome: "Chamada final",
    descricao: "Convite para o cliente iniciar o agendamento no final da página.",
    icone: CalendarDays,
  },
};

/** `booking-flow` do Figaro: sempre presente, obrigatório e sem editor. */
export const FLUXO_DE_AGENDAMENTO = { nome: "Fluxo de Agendamento", icone: CalendarCheck } as const;
