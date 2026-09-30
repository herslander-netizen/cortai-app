/**
 * Vitrine comercial oficial dos planos. Preço e liberação real continuam em
 * `planos_da_plataforma` e `recursos_de_plano`; aqui fica só a forma de
 * apresentar os quatro planos, na mesma ordem e com as mesmas chaves.
 */
export type PlanoComercial = {
  chave: "essencial" | "pro" | "conecta" | "studio";
  nome: string;
  precoCentavos: number;
  herda: string | null;
  itens: string[];
  destaque?: string;
};

export const PLANOS_COMERCIAIS: readonly PlanoComercial[] = [
  {
    chave: "essencial",
    nome: "Essencial",
    precoCentavos: 1990,
    herda: null,
    itens: ["Agenda", "Clientes", "Serviços", "Histórico básico", "Cadastro de profissionais"],
  },
  {
    chave: "pro",
    nome: "Profissional",
    precoCentavos: 2990,
    herda: "Tudo do Essencial",
    itens: ["Modo Foco", "Encaixes", "Comanda", "Caixa", "Histórico completo"],
  },
  {
    chave: "conecta",
    nome: "Conecta",
    precoCentavos: 3990,
    herda: "Tudo do Profissional",
    itens: [
      "Secretária Cortaí",
      "Agendamento pelo cliente",
      "WhatsApp",
      "Confirmações automáticas",
    ],
    destaque: "Inclui WhatsApp e automações",
  },
  {
    chave: "studio",
    nome: "Equipe",
    precoCentavos: 4990,
    herda: "Tudo do Conecta",
    itens: [
      "Gestão avançada de equipe",
      "Permissões",
      "Visão gerencial",
      "Recursos administrativos",
    ],
  },
] as const;

export function precoComercial(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
