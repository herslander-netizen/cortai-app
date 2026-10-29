/**
 * Catálogo central das capacidades do Flow.
 *
 * Uma capacidade descreve uma função do produto e onde ela mora. O que decide
 * se ela aparece é sempre a combinação:
 *   plano da barbearia (matriz `recursos_de_plano`)
 *   + interruptor da barbearia (`recursos_do_tenant`)
 *   + permissão da pessoa (`tenant_usuarios.permissoes`).
 *
 * Nenhum limite comercial é inventado aqui: os limites vêm de
 * `planos_da_plataforma` e das condições comerciais já existentes.
 */
import type { ChaveDeRecurso } from "@/lib/planos";
import type { ChaveDePermissao } from "@/lib/permissoes";

export type GrupoDeCapacidade = "essencial" | "operacao" | "crescimento" | "avancado";

export type Capacidade = {
  chave: string;
  rotulo: string;
  detalhe: string;
  grupo: GrupoDeCapacidade;
  /** Recurso da matriz de planos; `null` quando faz parte de qualquer plano. */
  recurso: ChaveDeRecurso | null;
  permissao: ChaveDePermissao;
  rota: string;
};

export const CAPACIDADES: readonly Capacidade[] = [
  {
    chave: "agenda",
    rotulo: "Agenda",
    detalhe: "Horários, encaixes e faltas do dia",
    grupo: "essencial",
    recurso: null,
    permissao: "criar_agendamento",
    rota: "/barbeiro/agenda",
  },
  {
    chave: "servicos",
    rotulo: "Serviços e preços",
    detalhe: "O que você atende e quanto custa",
    grupo: "essencial",
    recurso: null,
    permissao: "alterar_preco",
    rota: "/barbeiro/servicos",
  },
  {
    chave: "clientes",
    rotulo: "Clientes",
    detalhe: "Histórico e contato de cada cliente",
    grupo: "essencial",
    recurso: null,
    permissao: "visualizar_clientes",
    rota: "/barbeiro/clientes",
  },
  {
    chave: "pagina_publica",
    rotulo: "Página do negócio",
    detalhe: "Link público para o cliente agendar",
    grupo: "essencial",
    recurso: "branding_avancado",
    permissao: "alterar_dados_barbearia",
    rota: "/barbeiro/marca",
  },
  {
    chave: "fila_espera",
    rotulo: "Fila de espera",
    detalhe: "Quem chegou sem hora marcada",
    grupo: "operacao",
    recurso: "fila_espera",
    permissao: "criar_agendamento",
    rota: "/barbeiro/fila",
  },
  {
    chave: "agendamento_manual",
    rotulo: "Encaixe manual",
    detalhe: "Marcar cliente direto no balcão",
    grupo: "operacao",
    recurso: "agendamento_manual",
    permissao: "agendamento_manual",
    rota: "/barbeiro/agenda",
  },
  {
    chave: "caixa",
    rotulo: "Caixa, Pix e fiado",
    detalhe: "Entradas, saídas e pendências",
    grupo: "operacao",
    recurso: "comanda_caixa",
    permissao: "visualizar_financeiro",
    rota: "/barbeiro/caixa",
  },
  {
    chave: "produtos_estoque",
    rotulo: "Produtos e estoque",
    detalhe: "Venda de produtos e controle de estoque",
    grupo: "operacao",
    recurso: "produtos_estoque",
    permissao: "visualizar_estoque",
    rota: "/barbeiro/produtos",
  },
  {
    chave: "loja_online",
    rotulo: "Loja online",
    detalhe: "Vitrine de produtos no link público",
    grupo: "crescimento",
    recurso: "loja_online",
    permissao: "registrar_venda",
    rota: "/barbeiro/produtos",
  },
  {
    chave: "cortai_whatsapp",
    rotulo: "WhatsApp do Flow",
    detalhe: "Confirmações e avisos automáticos",
    grupo: "operacao",
    recurso: "secretaria_whatsapp",
    permissao: "ver_cortai",
    rota: "/barbeiro/cortai",
  },
  {
    chave: "fidelidade",
    rotulo: "Voltaí (fidelidade)",
    detalhe: "Cliente corta, ganha e volta",
    grupo: "crescimento",
    recurso: "fidelidade",
    permissao: "gerenciar_voltai",
    rota: "/barbeiro/fidelidade",
  },
  {
    chave: "indicacoes",
    rotulo: "Indicações",
    detalhe: "Clientes trazendo clientes",
    grupo: "crescimento",
    recurso: "indicacoes",
    permissao: "relatorios",
    rota: "/barbeiro/indicacoes",
  },
  {
    chave: "crescimento",
    rotulo: "Relatórios e crescimento",
    detalhe: "Ocupação, recorrência e faturamento",
    grupo: "crescimento",
    recurso: "crescimento",
    permissao: "relatorios",
    rota: "/barbeiro/crescimento",
  },
  {
    chave: "equipe",
    rotulo: "Equipe e permissões",
    detalhe: "Quem entra e o que cada um pode fazer",
    grupo: "avancado",
    recurso: "equipe_avancada",
    permissao: "gerenciar_permissoes",
    rota: "/barbeiro/equipe",
  },
  {
    chave: "personalizacao_cliente",
    rotulo: "Personalização avançada",
    detalhe: "Temas, layouts e detalhes da página",
    grupo: "avancado",
    recurso: "personalizacao_cliente",
    permissao: "alterar_dados_barbearia",
    rota: "/barbeiro/marca",
  },
] as const;

export type EstadoDaCapacidade = "ativa" | "disponivel" | "nao_incluida" | "sem_permissao";

export type CapacidadeAvaliada = Capacidade & { estado: EstadoDaCapacidade };

export type LimitesDoPlano = {
  profissionais: number | null;
  clientes: number | null;
  agendamentos_mes: number | null;
  unidades: number | null;
};

export type CapacidadesDoTenant = {
  plano: { chave: string; nome: string };
  limites: LimitesDoPlano;
  /** Recursos liberados pelo plano, por chave da matriz. */
  liberados: Record<string, boolean>;
  /** Interruptores da barbearia, por chave. Ausente = ligado. */
  ativos: Record<string, boolean>;
  uso: { profissionais: number; servicos: number };
  /** Teste grátis em andamento (recursos do plano mais completo). */
  teste?: { ativo: boolean; diasRestantes: number; fim: string | null };
};

/** Estado final de cada capacidade para quem está olhando a tela. */
export function avaliarCapacidades(
  dados: CapacidadesDoTenant,
  permissoes: readonly string[],
): CapacidadeAvaliada[] {
  return CAPACIDADES.map((c) => {
    const liberado = c.recurso ? (dados.liberados[c.recurso] ?? true) : true;
    const ativo = c.recurso ? (dados.ativos[c.recurso] ?? true) : true;
    const temPermissao = permissoes.includes(c.permissao);
    const estado: EstadoDaCapacidade = !liberado
      ? "nao_incluida"
      : !temPermissao
        ? "sem_permissao"
        : ativo
          ? "ativa"
          : "disponivel";
    return { ...c, estado };
  });
}

export const ROTULO_DO_ESTADO: Record<EstadoDaCapacidade, string> = {
  ativa: "Ativado",
  disponivel: "Disponível",
  nao_incluida: "Não incluído",
  sem_permissao: "Sem permissão",
};
