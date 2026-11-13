/**
 * FACHADA SOMENTE DE TESTE. Todos os nomes, IDs e mensagens são fictícios.
 * Nunca acessa Supabase, WhatsApp, Railway, localhost do app nem segredos.
 * Mantém o mesmo contrato de dados usado pelo componente de produção.
 */
type Estado = "nova" | "ia_atendendo" | "aguardando_cliente" | "atendimento_humano" | "resolvida";
type Origem = "cliente" | "equipe" | "flow_ia" | "automacao" | "nao_confirmada";

export type ResumoDaConversa = {
  id: string;
  nome: string;
  telefoneFinal: string;
  estado: Estado;
  naoLidas: number;
  ultimaMensagemEm: string | null;
  previa: string;
  ultimaOrigem: Origem | null;
  iaAtiva: boolean;
  atualizadoEm: string;
};
export type MensagemDaCentral = {
  id: string;
  direcao: "entrada" | "saida";
  tipo: string;
  conteudo: string;
  origem: Origem;
  status: string;
  criadoEm: string;
};

const AGORA = "2026-11-13T10:30:00Z";
const FICHA: ResumoDaConversa[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    nome: "Maria Clara de Albuquerque Cardoso da Silva",
    telefoneFinal: "7788",
    estado: "nova",
    naoLidas: 3,
    ultimaMensagemEm: AGORA,
    previa: "Gostaria de saber se há horário amanhã e quanto tempo dura o serviço. Preciso escolher um bom horário para a minha rotina.",
    ultimaOrigem: "cliente",
    iaAtiva: true,
    atualizadoEm: AGORA,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    nome: "Ana Costa",
    telefoneFinal: "3311",
    estado: "ia_atendendo",
    naoLidas: 0,
    ultimaMensagemEm: "2026-11-13T10:15:00Z",
    previa: "Qual é o valor do serviço?",
    ultimaOrigem: "cliente",
    iaAtiva: true,
    atualizadoEm: AGORA,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    nome: "João Pedro",
    telefoneFinal: "1144",
    estado: "aguardando_cliente",
    naoLidas: 0,
    ultimaMensagemEm: "2026-11-13T09:30:00Z",
    previa: "Conseguimos reservar sua visita para a sexta-feira.",
    ultimaOrigem: "automacao",
    iaAtiva: true,
    atualizadoEm: AGORA,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    nome: "Beatriz Andrade",
    telefoneFinal: "0055",
    estado: "atendimento_humano",
    naoLidas: 1,
    ultimaMensagemEm: "2026-11-13T09:00:00Z",
    previa: "Já estou verificando isso para você.",
    ultimaOrigem: "equipe",
    iaAtiva: false,
    atualizadoEm: AGORA,
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    nome: "Paulo Lima",
    telefoneFinal: "5566",
    estado: "resolvida",
    naoLidas: 0,
    ultimaMensagemEm: "2026-11-12T17:00:00Z",
    previa: "Muito obrigado!",
    ultimaOrigem: "cliente",
    iaAtiva: false,
    atualizadoEm: AGORA,
  },
];

const MENSAGENS: MensagemDaCentral[] = [
  {
    id: "m1", direcao: "entrada", tipo: "text",
    conteudo: "Olá! Quero conversar com alguém sobre os horários disponíveis.",
    origem: "cliente", status: "recebida", criadoEm: "2026-11-13T10:15:00Z",
  },
  {
    id: "m2", direcao: "saida", tipo: "text",
    conteudo: "Vou verificar os serviços e os horários disponíveis para você.",
    origem: "automacao", status: "enviada", criadoEm: "2026-11-13T10:17:00Z",
  },
  {
    id: "m3", direcao: "entrada", tipo: "text",
    conteudo: "Gostaria de saber se há horário amanhã e quanto tempo dura o serviço.",
    origem: "cliente", status: "recebida", criadoEm: AGORA,
  },
];

let conversas = FICHA.map(x => ({ ...x }));
let versao = 0;
function perfil() {
  const q = new URLSearchParams(location.search).get("perfil");
  if (q === "leitura") return { podeAssumir: false, podeGerenciar: false };
  if (q === "profissional") return { podeAssumir: true, podeGerenciar: false };
  return { podeAssumir: true, podeGerenciar: true };
}

export async function listarConversasDaCentral() {
  return {
    conversas: conversas.map(x => ({ ...x })),
    ...perfil(),
    geradoEm: new Date().toISOString(),
  };
}

export async function detalharConversaDaCentral(input: { data: { conversaId: string } }) {
  const id = input.data.conversaId;
  if (!conversas.some(c => c.id === id)) throw new Error("Conversa inexistente");
  return {
    mensagens: id.endsWith("1") ? MENSAGENS.map(m => ({ ...m })) : [
      { ...MENSAGENS[0]!, conteudo: "Olá, bom dia!" },
      { ...MENSAGENS[1]!, origem: "nao_confirmada" as const },
    ],
    agendamentos: id.endsWith("1") ? [
      { id: "ag-1", inicio: "2026-11-14T13:00:00Z", status: "confirmado", servico: "Corte e hidratação" },
    ] : [],
  };
}

export async function comandarConversaDaCentral(input: {
  data: { acao: "assumir" | "retomar" | "resolver"; conversaId: string; atualizadoEm: string };
}) {
  const { acao, conversaId, atualizadoEm } = input.data;
  const c = conversas.find(x => x.id === conversaId);
  if (!c || c.atualizadoEm !== atualizadoEm) return { ok: false as const, motivo: "conflito" as const };

  const p = perfil();
  if ((acao === "resolver" && !p.podeGerenciar) ||
      (acao !== "resolver" && !p.podeAssumir && !p.podeGerenciar)) {
    throw new Error("Permissão insuficiente");
  }
  if (acao === "assumir") c.estado = "atendimento_humano";
  else if (acao === "resolver") c.estado = "resolvida";
  else c.estado = "ia_atendendo";
  c.iaAtiva = acao === "retomar";
  c.atualizadoEm = new Date(Date.parse(AGORA) + ++versao * 1000).toISOString();
  return { ok: true as const };
}

// Ponto de inspeção para o navegador: somente a bancada define esse objeto.
declare global {
  interface Window {
    __centralQa?: {
      conversa: (id: string) => ResumoDaConversa | undefined;
      provocarConflito: (id: string) => void;
    };
  }
}
window.__centralQa = {
  conversa: (id) => conversas.find(c => c.id === id),
  provocarConflito: (id) => {
    const c = conversas.find(v => v.id === id);
    if (c) c.atualizadoEm = new Date(Date.parse(AGORA) + ++versao * 1000).toISOString();
  },
};
