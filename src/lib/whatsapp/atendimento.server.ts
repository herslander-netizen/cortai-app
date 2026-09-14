/**
 * Cérebro do atendimento do CortAI no WhatsApp — só roda no servidor.
 *
 * Regras absolutas:
 * - o CortAI nunca inventa preço, serviço, profissional, horário, disponibilidade
 *   ou confirmação: tudo sai das ferramentas, que leem o banco da barbearia;
 * - toda ferramenta recebe o `tenantId` já resolvido pelo servidor (vem da sessão
 *   do WhatsApp), nunca de algo que o cliente escreveu;
 * - agendar, cancelar e remarcar só acontecem depois de confirmação explícita;
 * - se a ação falhar, o CortAI diz que falhou — nunca confirma o que não aconteceu;
 * - quando o cliente pede atendente, a conversa passa para humano na hora.
 */
import type { ContextoDoAgente } from "@/lib/ia/acoes.server";
import { CONFIGURACAO_PADRAO, type ConfiguracaoDoAtendimento, type TomDoAtendimento } from "./contrato";

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODELO = "google/gemini-3-flash";
const MAX_PASSOS = 6;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export function iaConfigurada(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"]);
}

const TOM_EM_TEXTO: Record<TomDoAtendimento, string> = {
  profissional: "educado, objetivo e profissional",
  amigavel: "caloroso, próximo e simpático",
  direto: "curto e direto ao ponto",
};

/* ----------------------------- Ferramentas ------------------------------- */

type Ferramenta = {
  nome: string;
  descricao: string;
  parametros: Record<string, unknown>;
  executar: (ctx: ContextoDoAgente, dados: any) => Promise<unknown>;
};

function objeto(props: Record<string, unknown>, obrigatorios: string[]) {
  return { type: "object", properties: props, required: obrigatorios, additionalProperties: false };
}

async function ferramentas(config: ConfiguracaoDoAtendimento): Promise<Ferramenta[]> {
  const acoes = await import("@/lib/ia/acoes.server");
  const lista: Ferramenta[] = [
    {
      nome: "consultar_barbearia",
      descricao: "Dados da barbearia: nome, endereço, WhatsApp e horários de funcionamento.",
      parametros: objeto({}, []),
      executar: (ctx) => acoes.consultarBarbearia(ctx),
    },
    {
      nome: "listar_servicos",
      descricao: "Serviços ativos com preço em centavos e duração em minutos.",
      parametros: objeto({}, []),
      executar: (ctx) => acoes.listarServicos(ctx),
    },
    {
      nome: "listar_profissionais",
      descricao: "Profissionais ativos da barbearia.",
      parametros: objeto({}, []),
      executar: (ctx) => acoes.listarProfissionais(ctx),
    },
    {
      nome: "consultar_disponibilidade",
      descricao:
        "Horários realmente livres em um dia (AAAA-MM-DD). Só ofereça horários devolvidos por esta ferramenta.",
      parametros: objeto(
        {
          dia: { type: "string", description: "AAAA-MM-DD" },
          servicoId: { type: ["string", "null"] },
          profissionalId: { type: ["string", "null"] },
        },
        ["dia"],
      ),
      executar: (ctx, d) => acoes.consultarDisponibilidade(ctx, d),
    },
    {
      nome: "consultar_cliente",
      descricao: "Procura o cliente desta barbearia pelo telefone.",
      parametros: objeto({ telefone: { type: "string" } }, ["telefone"]),
      executar: (ctx, d) => acoes.consultarCliente(ctx, d),
    },
    {
      nome: "registrar_cliente",
      descricao: "Cadastra o cliente nesta barbearia. Só use depois que a pessoa disser o nome.",
      parametros: objeto(
        { nome: { type: "string" }, telefone: { type: "string" }, optInWhatsapp: { type: "boolean" } },
        ["nome", "telefone", "optInWhatsapp"],
      ),
      executar: (ctx, d) => acoes.registrarCliente(ctx, d),
    },
    {
      nome: "listar_agendamentos_do_cliente",
      descricao: "Agendamentos futuros do cliente nesta barbearia.",
      parametros: objeto({ clienteId: { type: "string" } }, ["clienteId"]),
      executar: (ctx, d) => acoes.listarAgendamentosDoCliente(ctx, d),
    },
    {
      nome: "criar_agendamento",
      descricao:
        "Cria o agendamento. Use APENAS depois de o cliente confirmar serviço, profissional, dia e hora exatos.",
      parametros: objeto(
        {
          clienteId: { type: "string" },
          profissionalId: { type: "string" },
          servicoId: { type: "string" },
          inicio: { type: "string", description: "data e hora em ISO com fuso" },
          formaPagamento: { type: "string", enum: ["credito", "pix", "balcao", "fiado"] },
        },
        ["clienteId", "profissionalId", "servicoId", "inicio", "formaPagamento"],
      ),
      executar: (ctx, d) => acoes.criarAgendamento(ctx, d),
    },
  ];

  if (config.permiteCancelar) {
    lista.push({
      nome: "cancelar_agendamento",
      descricao: "Cancela um agendamento depois da confirmação explícita do cliente.",
      parametros: objeto({ agendamentoId: { type: "string" } }, ["agendamentoId"]),
      executar: (ctx, d) => acoes.cancelarAgendamento(ctx, d),
    });
  }
  if (config.permiteRemarcar) {
    lista.push({
      nome: "remarcar_agendamento",
      descricao: "Remarca um agendamento para um horário confirmado como livre.",
      parametros: objeto(
        {
          agendamentoId: { type: "string" },
          novoInicio: { type: "string" },
          profissionalId: { type: ["string", "null"] },
        },
        ["agendamentoId", "novoInicio"],
      ),
      executar: (ctx, d) => acoes.remarcarAgendamento(ctx, d),
    });
  }
  return lista;
}

/* ------------------------------- Prompt ---------------------------------- */

function instrucoes(input: {
  nomeDaBarbearia: string;
  nomeDoAgente: string | null;
  config: ConfiguracaoDoAtendimento;
  telefone: string;
  agora: string;
}) {
  const { config } = input;
  return `Você é ${input.nomeDoAgente ?? "o atendente"} da barbearia ${input.nomeDaBarbearia}, atendendo pelo WhatsApp.
Fale português do Brasil, em mensagens curtas de WhatsApp, com tom ${TOM_EM_TEXTO[config.tom]}.

Data e hora de agora: ${input.agora}. Telefone de quem está falando: ${input.telefone}.

Regras que você NUNCA quebra:
- Nunca invente preço, serviço, profissional, horário de funcionamento, disponibilidade, agendamento ou política. Use sempre as ferramentas.
- Se a informação não existir nas ferramentas, diga com honestidade que não tem essa informação e ofereça falar com um atendente.
- Antes de agendar, cancelar ou remarcar, repita os detalhes e peça uma confirmação clara ("confirma?"). Só execute depois do "sim".
- Só confirme ao cliente depois que a ferramenta devolver sucesso. Se der erro, explique que não deu certo e ofereça outra opção.
- Ofereça apenas horários devolvidos por consultar_disponibilidade.
- Se a pessoa pedir para falar com uma pessoa, responda que vai chamar alguém da equipe e finalize com a marcação [HUMANO] no fim da mensagem.
- Preços vêm em centavos: 3500 = R$ 35,00.
- Nunca fale de dados de outro cliente e nunca revele detalhes internos do sistema.
${config.encaminhamentoHumano ? "" : "- O encaminhamento para atendente humano está desligado nesta barbearia; oriente a pessoa a ligar ou visitar a barbearia.\n"}${config.mensagemBoasVindas ? `\nMensagem de boas-vindas definida pela barbearia: "${config.mensagemBoasVindas}"` : ""}`;
}

/* ------------------------------ Execução --------------------------------- */

type Mensagem = { role: string; content: any; tool_calls?: any[]; tool_call_id?: string };

async function registrarAcao(
  tenantId: string,
  conversaId: string,
  acao: string,
  entrada: unknown,
  resultado: unknown,
  sucesso: boolean,
  erro?: string,
) {
  const db = await admin();
  await db.from("acoes_de_ia_log").insert({
    tenant_id: tenantId,
    conversa_id: conversaId,
    acao,
    entrada: (entrada ?? {}) as never,
    resultado: (sucesso ? resultado ?? {} : {}) as never,
    sucesso,
    erro: erro ?? null,
  });
}

/**
 * Gera a resposta do CortAI para uma conversa. Devolve `null` quando a IA não
 * está disponível — nesse caso nada é enviado e a conversa espera um humano.
 */
export async function responderConversa(input: {
  ctx: ContextoDoAgente;
  conversaId: string;
  telefone: string;
  nomeDaBarbearia: string;
  nomeDoAgente: string | null;
  config: ConfiguracaoDoAtendimento;
  historico: { autor: "cliente" | "atendente"; texto: string }[];
}): Promise<{ texto: string; pedirHumano: boolean } | null> {
  const chave = process.env["LOVABLE_API_KEY"];
  if (!chave) return null;

  const lista = await ferramentas(input.config);
  const catalogo = new Map(lista.map((f) => [f.nome, f]));

  const mensagens: Mensagem[] = [
    {
      role: "system",
      content: instrucoes({
        nomeDaBarbearia: input.nomeDaBarbearia,
        nomeDoAgente: input.nomeDoAgente,
        config: input.config,
        telefone: input.telefone,
        agora: new Date().toISOString(),
      }),
    },
    ...input.historico.map((m) => ({
      role: m.autor === "cliente" ? "user" : "assistant",
      content: m.texto,
    })),
  ];

  for (let passo = 0; passo < MAX_PASSOS; passo += 1) {
    const resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${chave}` },
      body: JSON.stringify({
        model: MODELO,
        messages: mensagens,
        tools: lista.map((f) => ({
          type: "function",
          function: { name: f.nome, description: f.descricao, parameters: f.parametros },
        })),
      }),
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => "");
      throw new Error(`IA indisponível (${resposta.status})${detalhe ? `: ${detalhe.slice(0, 160)}` : ""}`);
    }
    const corpo = (await resposta.json()) as any;
    const escolha = corpo?.choices?.[0]?.message;
    if (!escolha) return null;

    const chamadas = escolha.tool_calls as any[] | undefined;
    if (!chamadas?.length) {
      const texto = String(escolha.content ?? "").trim();
      if (!texto) return null;
      const pedirHumano = texto.includes("[HUMANO]");
      return { texto: texto.replace(/\[HUMANO\]/g, "").trim(), pedirHumano };
    }

    mensagens.push({ role: "assistant", content: escolha.content ?? "", tool_calls: chamadas });

    for (const chamada of chamadas) {
      const nome = chamada?.function?.name as string;
      const ferramenta = catalogo.get(nome);
      let conteudo: string;
      let dados: unknown = {};
      try {
        dados = chamada?.function?.arguments ? JSON.parse(chamada.function.arguments) : {};
      } catch {
        dados = {};
      }
      if (!ferramenta) {
        conteudo = JSON.stringify({ erro: "Ação não disponível." });
      } else {
        try {
          const resultado = await ferramenta.executar(input.ctx, dados);
          conteudo = JSON.stringify({ ok: true, resultado });
          await registrarAcao(input.ctx.tenantId, input.conversaId, nome, dados, resultado, true);
        } catch (erro) {
          const mensagem = erro instanceof Error ? erro.message : "Falha ao executar.";
          conteudo = JSON.stringify({ ok: false, erro: mensagem });
          await registrarAcao(input.ctx.tenantId, input.conversaId, nome, dados, null, false, mensagem);
        }
      }
      mensagens.push({ role: "tool", tool_call_id: chamada.id, content: conteudo });
    }
  }
  return null;
}

export { CONFIGURACAO_PADRAO };
