import type { ChaveDeRecurso } from "@/lib/planos";
import type { Permissao } from "@/lib/permissoes";

/**
 * Catálogo de recursos opcionais da barbearia.
 * A chave é a mesma usada na matriz de planos (quando existe lá), para que o
 * plano defina o teto e a barbearia decida o que usa dentro do permitido.
 */
export type ChaveRecursoTenant =
  | "produtos_estoque"
  | "loja_online"
  | "fidelidade"
  | "fila_espera"
  | "indicacoes"
  | "avaliacoes"
  | "crescimento"
  | "agendamento_manual"
  | "personalizacao_cliente"
  | "branding_avancado";

export type RecursoOpcional = {
  chave: ChaveRecursoTenant;
  rotulo: string;
  descricao: string;
  /** Chave equivalente na matriz de planos, quando o recurso é limitado por plano. */
  plano?: ChaveDeRecurso;
  /** Recurso que precisa estar ativo antes deste. */
  depende?: ChaveRecursoTenant;
  /** Aviso curto quando desligar pode afetar a operação. */
  alertaAoDesligar?: string;
};

export const RECURSOS_OPCIONAIS: RecursoOpcional[] = [
  { chave: "produtos_estoque", rotulo: "Produtos e estoque", descricao: "Catálogo, vendas no balcão e alerta de estoque.", plano: "produtos_estoque", alertaAoDesligar: "Vendas de produtos deixam de aparecer para a equipe." },
  { chave: "loja_online", rotulo: "Loja online", descricao: "Mostra seus produtos na página pública da barbearia.", plano: "loja_online", depende: "produtos_estoque", alertaAoDesligar: "Sua loja some da página pública." },
  { chave: "fidelidade", rotulo: "Fidelidade", descricao: "Progresso de cortes e clientes prontos para o brinde.", plano: "fidelidade" },
  { chave: "fila_espera", rotulo: "Lista de espera", descricao: "Clientes avisados quando abre um horário.", plano: "fila_espera", alertaAoDesligar: "A fila atual deixa de ser exibida para a equipe e para os clientes." },
  { chave: "indicacoes", rotulo: "Indicações", descricao: "Cliente que traz cliente, com recompensa.", plano: "indicacoes" },
  { chave: "avaliacoes", rotulo: "Avaliações", descricao: "Notas após o atendimento e convite público." },
  { chave: "crescimento", rotulo: "Crescimento e relatórios", descricao: "Retorno de clientes, oportunidades e análises.", plano: "crescimento" },
  { chave: "agendamento_manual", rotulo: "Agendamento manual", descricao: "Encaixar atendimento direto pelo balcão.", plano: "agendamento_manual" },
  { chave: "personalizacao_cliente", rotulo: "Ficha avançada do cliente", descricao: "Descontos, condições e observações internas.", plano: "personalizacao_cliente" },
  { chave: "branding_avancado", rotulo: "Marca avançada", descricao: "Temas, paleta própria e histórico de versões.", plano: "branding_avancado" },
];

export const ESSENCIAIS: { rotulo: string; descricao: string }[] = [
  { rotulo: "Visão geral e agenda", descricao: "O dia da barbearia e os próximos atendimentos." },
  { rotulo: "Clientes", descricao: "Cadastro, histórico e contato." },
  { rotulo: "Pedidos e pagamentos", descricao: "Confirmação financeira dos atendimentos." },
  { rotulo: "Financeiro, serviços e profissionais", descricao: "Base da operação, sempre disponível." },
  { rotulo: "Conta e barbearia", descricao: "Seus dados, plano e página pública." },
];

/** Permissão exigida para gerenciar os recursos da barbearia. */
export const PERMISSAO_RECURSOS: Permissao = "alterar_dados_barbearia";
