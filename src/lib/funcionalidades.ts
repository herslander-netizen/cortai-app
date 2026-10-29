/**
 * Catálogo do Painel de Funcionalidades.
 *
 * Não é uma matriz nova: cada item aponta para o interruptor que o sistema JÁ
 * lê hoje (recursos_do_tenant, colunas do negócio, regras_de_plano ou a
 * configuração do WhatsApp). Itens sem interruptor real aparecem só com
 * "Configurar" ou como "Sempre ativo", para o painel nunca mentir.
 */
import type { ChaveDeRecurso } from "@/lib/planos";

export type FonteDoInterruptor =
  | { tipo: "recurso"; chave: ChaveDeRecurso }
  | { tipo: "tenant"; coluna: "loja_ativa" | "indicacao_ativa" | "listada" }
  | { tipo: "lista_automatica" }
  | { tipo: "regra"; regra: "fidelidade" | "fiado" | "fiado_bloqueio" }
  | { tipo: "secretaria"; coluna: "confirmacao_automatica" | "lembretes" | "recuperacao_ativa" }
  | { tipo: "sem_interruptor" };

export type ChaveDeFuncionalidade =
  | "encaixes"
  | "modo_foco"
  | "fila_chegada"
  | "lista_automatica"
  | "secretaria"
  | "confirmacoes"
  | "lembretes"
  | "recuperacao"
  | "pos_atendimento"
  | "agendamento_conversa"
  | "voltai"
  | "indicacoes"
  | "avaliacoes"
  | "preferencias_pos"
  | "comanda"
  | "carteira"
  | "fiado"
  | "fiado_bloqueio"
  | "comissoes"
  | "produtos"
  | "loja"
  | "crescimento"
  | "divulgar"
  | "descoberta"
  | "personalizacao"
  | "temas"
  | "equipe";

export type Funcionalidade = {
  chave: ChaveDeFuncionalidade;
  rotulo: string;
  detalhe: string;
  fonte: FonteDoInterruptor;
  /** Recurso da matriz de planos que libera o item (null = qualquer plano). */
  plano: ChaveDeRecurso | null;
  /** Precisa desta outra funcionalidade ligada. */
  depende?: ChaveDeFuncionalidade;
  /** Tela própria onde ficam os detalhes. */
  configurar?: string;
  /** Permissão extra, além de alterar_dados_barbearia. */
  permissaoExtra?: string;
};

export type GrupoDeFuncionalidades = { titulo: string; itens: Funcionalidade[] };

const f = (x: Funcionalidade) => x;

export const GRUPOS_DE_FUNCIONALIDADES: GrupoDeFuncionalidades[] = [
  {
    titulo: "Atendimento",
    itens: [
      f({
        chave: "encaixes",
        rotulo: "Encaixes",
        detalhe: "Ajuste nas regras da agenda",
        fonte: { tipo: "sem_interruptor" },
        plano: "agendamento_manual",
        configurar: "/barbeiro/configurar",
      }),
      f({
        chave: "modo_foco",
        rotulo: "Modo Foco",
        detalhe: "Tela de hoje só com o atendimento atual e o próximo",
        fonte: { tipo: "recurso", chave: "modo_foco" },
        plano: "modo_foco",
      }),
      f({
        chave: "fila_chegada",
        rotulo: "Fila de chegada",
        detalhe: "Clientes aguardando vaga, pelo link e pelo WhatsApp",
        fonte: { tipo: "recurso", chave: "fila_espera" },
        plano: "fila_espera",
        configurar: "/barbeiro/fila",
      }),
      f({
        chave: "lista_automatica",
        rotulo: "Lista de espera automática",
        detalhe: "Oferece a vaga livre ao próximo da lista sozinha",
        fonte: { tipo: "lista_automatica" },
        plano: "fila_espera",
        depende: "fila_chegada",
        configurar: "/barbeiro/fila",
      }),
    ],
  },
  {
    titulo: "Comunicação",
    itens: [
      f({
        chave: "secretaria",
        rotulo: "WhatsApp",
        detalhe: "Avisos e respostas automáticas no WhatsApp",
        fonte: { tipo: "recurso", chave: "secretaria_whatsapp" },
        plano: "secretaria_whatsapp",
        configurar: "/barbeiro/cortai",
      }),
      f({
        chave: "confirmacoes",
        rotulo: "Confirmações automáticas",
        detalhe: "Confirma o horário assim que o cliente agenda",
        fonte: { tipo: "secretaria", coluna: "confirmacao_automatica" },
        plano: "secretaria_whatsapp",
        depende: "secretaria",
        permissaoExtra: "configurar_automacoes",
      }),
      f({
        chave: "lembretes",
        rotulo: "Lembretes",
        detalhe: "Lembra o cliente antes do horário",
        fonte: { tipo: "secretaria", coluna: "lembretes" },
        plano: "secretaria_whatsapp",
        depende: "secretaria",
        permissaoExtra: "configurar_automacoes",
      }),
      f({
        chave: "recuperacao",
        rotulo: "Recuperação de clientes",
        detalhe: "Chama de volta quem sumiu há um tempo",
        fonte: { tipo: "secretaria", coluna: "recuperacao_ativa" },
        plano: "secretaria_whatsapp",
        depende: "secretaria",
        permissaoExtra: "configurar_automacoes",
      }),
      f({
        chave: "pos_atendimento",
        rotulo: "Mensagem pós-atendimento",
        detalhe: "Ajuste na tela do WhatsApp",
        fonte: { tipo: "sem_interruptor" },
        plano: "secretaria_whatsapp",
        configurar: "/barbeiro/cortai",
      }),
      f({
        chave: "agendamento_conversa",
        rotulo: "Agendamento por conversa",
        detalhe: "Formato da página escolhido em Aparência",
        fonte: { tipo: "sem_interruptor" },
        plano: null,
        configurar: "/barbeiro/marca",
      }),
    ],
  },
  {
    titulo: "Relacionamento",
    itens: [
      f({
        chave: "voltai",
        rotulo: "Voltaí",
        detalhe: "Cartão de fidelidade. Nunca impede um agendamento",
        fonte: { tipo: "regra", regra: "fidelidade" },
        plano: "fidelidade",
        configurar: "/barbeiro/fidelidade",
        permissaoExtra: "gerenciar_voltai",
      }),
      f({
        chave: "indicacoes",
        rotulo: "Indicações",
        detalhe: "Clientes trazendo novos clientes",
        fonte: { tipo: "tenant", coluna: "indicacao_ativa" },
        plano: "indicacoes",
        configurar: "/barbeiro/indicacoes",
      }),
      f({
        chave: "avaliacoes",
        rotulo: "Avaliações",
        detalhe: "Notas e comentários depois do atendimento",
        fonte: { tipo: "sem_interruptor" },
        plano: null,
        configurar: "/barbeiro/avaliacoes",
      }),
      f({
        chave: "preferencias_pos",
        rotulo: "Preferências após agendar",
        detalhe: "O cliente conta como gosta de ser atendido",
        fonte: { tipo: "sem_interruptor" },
        plano: null,
      }),
    ],
  },
  {
    titulo: "Financeiro",
    itens: [
      f({
        chave: "comanda",
        rotulo: "Comanda e caixa",
        detalhe: "Entradas, saídas, Pix e fechamento do dia",
        fonte: { tipo: "recurso", chave: "comanda_caixa" },
        plano: "comanda_caixa",
        configurar: "/barbeiro/caixa",
      }),
      f({
        chave: "carteira",
        rotulo: "Carteira do cliente",
        detalhe: "Saldo e créditos de cada cliente",
        fonte: { tipo: "sem_interruptor" },
        plano: null,
      }),
      f({
        chave: "fiado",
        rotulo: "Fiado",
        detalhe: "Cliente agenda e paga depois",
        fonte: { tipo: "regra", regra: "fiado" },
        plano: null,
      }),
      f({
        chave: "fiado_bloqueio",
        rotulo: "Bloquear agendamento no limite do fiado",
        detalhe: "Quem passou do limite não agenda até acertar",
        fonte: { tipo: "regra", regra: "fiado_bloqueio" },
        plano: null,
        depende: "fiado",
      }),
      f({
        chave: "comissoes",
        rotulo: "Comissões",
        detalhe: "Calculadas a partir do caixa",
        fonte: { tipo: "sem_interruptor" },
        plano: "comanda_caixa",
        configurar: "/barbeiro/comissoes",
      }),
    ],
  },
  {
    titulo: "Vendas",
    itens: [
      f({
        chave: "produtos",
        rotulo: "Produtos e estoque",
        detalhe: "Venda de produtos e alertas de estoque",
        fonte: { tipo: "recurso", chave: "produtos_estoque" },
        plano: "produtos_estoque",
        configurar: "/barbeiro/produtos",
      }),
      f({
        chave: "loja",
        rotulo: "Loja online",
        detalhe: "Vitrine de produtos no seu link",
        fonte: { tipo: "tenant", coluna: "loja_ativa" },
        plano: "loja_online",
        depende: "produtos",
      }),
    ],
  },
  {
    titulo: "Crescimento",
    itens: [
      f({
        chave: "crescimento",
        rotulo: "Relatórios e crescimento",
        detalhe: "Ocupação, recorrência e novos clientes",
        fonte: { tipo: "recurso", chave: "crescimento" },
        plano: "crescimento",
        configurar: "/barbeiro/crescimento",
      }),
      f({
        chave: "divulgar",
        rotulo: "Divulgar nas redes",
        detalhe: "Posts prontos para Instagram e TikTok",
        fonte: { tipo: "sem_interruptor" },
        plano: null,
        configurar: "/barbeiro/divulgar",
      }),
      f({
        chave: "descoberta",
        rotulo: "Aparecer na descoberta",
        detalhe: "Seu negócio aparece na busca do Flow",
        fonte: { tipo: "tenant", coluna: "listada" },
        plano: null,
      }),
    ],
  },
  {
    titulo: "Aparência",
    itens: [
      f({
        chave: "personalizacao",
        rotulo: "Personalização avançada",
        detalhe: "Detalhes extras da experiência do cliente",
        fonte: { tipo: "sem_interruptor" },
        plano: "personalizacao_cliente",
        configurar: "/barbeiro/marca",
      }),
      f({
        chave: "temas",
        rotulo: "Temas",
        detalhe: "Cores e estilo do app",
        fonte: { tipo: "sem_interruptor" },
        plano: null,
        configurar: "/barbeiro/conta",
      }),
    ],
  },
  {
    titulo: "Equipe",
    itens: [
      f({
        chave: "equipe",
        rotulo: "Gestão avançada de equipe",
        detalhe: "Acessos e permissões de cada pessoa",
        fonte: { tipo: "recurso", chave: "equipe_avancada" },
        plano: "equipe_avancada",
        configurar: "/barbeiro/equipe",
      }),
    ],
  },
];

export const FUNCIONALIDADES = GRUPOS_DE_FUNCIONALIDADES.flatMap((g) => g.itens);

export function funcionalidade(chave: ChaveDeFuncionalidade) {
  return FUNCIONALIDADES.find((x) => x.chave === chave)!;
}

export type EstadoDaFuncionalidade = "ativo" | "desativado" | "fora_do_plano" | "sempre";

export type LeituraDasFuncionalidades = {
  /** Valor real de cada interruptor existente. */
  valores: Partial<Record<ChaveDeFuncionalidade, boolean>>;
  liberados: Record<string, boolean>;
  /** Primeiro plano que libera cada recurso. */
  planoMinimo: Record<string, string>;
  permissoes: string[];
};

export function estadoDe(
  item: Funcionalidade,
  l: LeituraDasFuncionalidades,
): EstadoDaFuncionalidade {
  if (item.plano && l.liberados[item.plano] === false) return "fora_do_plano";
  if (item.fonte.tipo === "sem_interruptor") return "sempre";
  return l.valores[item.chave] === false ? "desativado" : "ativo";
}

export function podeAlterar(item: Funcionalidade, permissoes: readonly string[]) {
  if (!permissoes.includes("alterar_dados_barbearia")) return false;
  return !item.permissaoExtra || permissoes.includes(item.permissaoExtra);
}

/** Itens ligados que dependem deste (para avisar antes de desligar). */
export function dependentesLigados(chave: ChaveDeFuncionalidade, l: LeituraDasFuncionalidades) {
  return FUNCIONALIDADES.filter((x) => x.depende === chave && estadoDe(x, l) === "ativo");
}

export function resumo(l: LeituraDasFuncionalidades) {
  const comInterruptor = FUNCIONALIDADES.filter((x) => x.fonte.tipo !== "sem_interruptor");
  const ativas = comInterruptor.filter((x) => estadoDe(x, l) === "ativo").length;
  return { ativas, total: comInterruptor.length };
}
