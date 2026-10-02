/**
 * Vitrine comercial oficial dos planos. Preço e liberação real continuam em
 * `planos_da_plataforma` e `recursos_de_plano`; aqui fica só a forma de
 * apresentar os planos à venda, na mesma ordem e com as mesmas chaves.
 * Cobrança fixa por plano (não por profissional). Planos fora da vitrine
 * (ex.: Profissional) continuam no banco, inativos.
 */
import { precoAnual } from "@/lib/teste-gratis";

export type PlanoComercial = {
  chave: "essencial" | "conecta" | "studio";
  nome: string;
  precoCentavos: number;
  /** Quantos profissionais cabem no plano. */
  profissionais: number;
  /** Agendamentos por mês; null = sem limite. */
  agendamentosMes: number | null;
  herda: string | null;
  itens: string[];
  destaque?: string;
};

export const PLANOS_COMERCIAIS: readonly PlanoComercial[] = [
  {
    chave: "essencial",
    nome: "Essencial",
    precoCentavos: 0,
    profissionais: 1,
    agendamentosMes: 40,
    herda: null,
    itens: ["Agenda", "Clientes", "Serviços", "Histórico básico"],
  },
  {
    chave: "conecta",
    nome: "Conecta",
    precoCentavos: 3990,
    profissionais: 4,
    agendamentosMes: null,
    herda: "Tudo do Essencial",
    itens: [
      "Lembrete automático por WhatsApp (menos faltas)",
      "Secretária Cortaí",
      "Agendamento pelo cliente",
      "Modo Foco, encaixes, comanda e caixa",
    ],
    destaque: "Mais escolhido",
  },
  {
    chave: "studio",
    nome: "Studio",
    precoCentavos: 4990,
    profissionais: 10,
    agendamentosMes: null,
    herda: "Tudo do Conecta",
    itens: ["Gestão avançada de equipe", "Permissões", "Visão gerencial", "Recursos administrativos"],
  },
] as const;

export function precoComercial(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export function precoAnualComercial(mensalCentavos: number) {
  return precoAnual(mensalCentavos);
}
