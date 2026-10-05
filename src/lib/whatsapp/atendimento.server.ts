import { fusoDoTenant } from "@/lib/fuso.server";
/**
 * Cérebro do atendimento do CortAI no WhatsApp — só roda no servidor.
 *
 * Ciclo: ENTENDER → CONTEXTUALIZAR → CONSULTAR → RACIOCINAR → AGIR → CONFIRMAR.
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
import {
  CONFIGURACAO_PADRAO,
  INTENCOES,
  type ConfiguracaoDoAtendimento,
  type ContextoDaConversa,
  type Intencao,
  type TomDoAtendimento,
} from "./contrato";

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODELO = "google/gemini-3-flash";
const MAX_PASSOS = 8;

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
  premium: "elegante, atencioso e sofisticado, sem ser pomposo",
  objetivo: "enxuto: só o essencial, sem rodeios",
};

/* --------------------------- Datas em português -------------------------- */

function diaLocal(fuso: string, deslocamentoEmDias = 0): string {
  const d = new Date(Date.now() + deslocamentoEmDias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function agoraLocal(fuso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());
}

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
      nome: "consultar_informacoes",
      descricao:
        "Perguntas e respostas oficiais cadastradas pela barbearia (estacionamento, formas de pagamento, políticas, avisos). Use antes de dizer que não sabe.",
      parametros: objeto({}, []),
      executar: (ctx) => acoes.consultarInformacoes(ctx),
    },
    {
      nome: "consultar_horarios",
      descricao: "Horário de funcionamento por dia da semana (0 = domingo).",
      parametros: objeto({}, []),
      executar: (ctx) => acoes.consultarHorariosDeFuncionamento(ctx),
    },
    {
      nome: "listar_servicos",
      descricao: "Serviços ativos com preço em centavos e duração em minutos.",
      parametros: objeto({}, []),
      executar: (ctx) => acoes.listarServicos(ctx),
    },
    {
      nome: "consultar_servico",
      descricao: "Detalhes de um serviço específico.",
      parametros: objeto({ servicoId: { type: "string" } }, ["servicoId"]),
      executar: (ctx, d) => acoes.consultarServico(ctx, d),
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
        {
          nome: { type: "string" },
          telefone: { type: "string" },
          optInWhatsapp: { type: "boolean" },
        },
        ["nome", "telefone", "optInWhatsapp"],
      ),
      executar: (ctx, d) => acoes.registrarCliente(ctx, d),
    },
    {
      nome: "historico_do_cliente",
      descricao:
        "Memória do cliente: visitas, último corte, serviço e profissional preferidos, frequência e preferências que ele mesmo informou. Use para 'o mesmo da última vez'.",
      parametros: objeto({ clienteId: { type: "string" } }, ["clienteId"]),
      executar: (ctx, d) => acoes.historicoDoCliente(ctx, d),
    },
    {
      nome: "salvar_preferencia_do_cliente",
      descricao:
        "Guarda uma preferência que a PRÓPRIA pessoa informou (ex.: chave 'barbeiro_preferido', valor 'João'). Nunca guarde deduções nem dados sensíveis.",
      parametros: objeto(
        { clienteId: { type: "string" }, chave: { type: "string" }, valor: { type: "string" } },
        ["clienteId", "chave", "valor"],
      ),
      executar: (ctx, d) => acoes.salvarPreferenciaDoCliente(ctx, d),
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

  if (config.permiteConfirmar) {
    lista.push({
      nome: "confirmar_agendamento",
      descricao: "Confirma a presença em um agendamento já existente.",
      parametros: objeto({ agendamentoId: { type: "string" } }, ["agendamentoId"]),
      executar: (ctx, d) => acoes.confirmarAgendamento(ctx, d),
    });
  }
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

function resumoDoContexto(contexto: ContextoDaConversa): string {
  const partes: string[] = [];
  if (contexto.intencao)
    partes.push(`assunto atual: ${INTENCOES[contexto.intencao] ?? contexto.intencao}`);
  if (contexto.resumo) partes.push(`combinado até agora: ${contexto.resumo}`);
  if (contexto.servicoNome || contexto.servicoId)
    partes.push(`serviço escolhido: ${contexto.servicoNome ?? contexto.servicoId}`);
  if (contexto.profissionalNome || contexto.profissionalId)
    partes.push(`profissional escolhido: ${contexto.profissionalNome ?? contexto.profissionalId}`);
  if (contexto.dia) partes.push(`dia escolhido: ${contexto.dia}`);
  if (contexto.agendamentoId) partes.push(`agendamento em foco: ${contexto.agendamentoId}`);
  if (contexto.opcoes?.length) {
    partes.push(
      `opções oferecidas na última mensagem, em ordem: ${contexto.opcoes
        .map(
          (o, i) =>
            `${i + 1}) ${o.rotulo} [inicio=${o.inicio}; profissionalId=${o.profissionalId}${o.servicoId ? `; servicoId=${o.servicoId}` : ""}]`,
        )
        .join(" | ")}`,
    );
  }
  return partes.join("\n- ");
}

function instrucoes(input: {
  nomeDaBarbearia: string;
  nomeDoAgente: string | null;
  config: ConfiguracaoDoAtendimento;
  telefone: string;
  contexto: ContextoDaConversa;
  perfil: string | null;
  houveAtendimentoHumano: boolean;
  fuso: string;
}) {
  const { config, contexto, fuso } = input;
  const contextoTexto = resumoDoContexto(contexto);
  return `Você é ${input.nomeDoAgente ?? "o atendente"} da barbearia ${input.nomeDaBarbearia}, atendendo pelo WhatsApp.
Fale português do Brasil, em mensagens curtas de WhatsApp, com tom ${TOM_EM_TEXTO[config.tom]}.

AGORA: ${agoraLocal(fuso)} (fuso ${fuso}). Hoje é ${diaLocal(fuso, 0)}; amanhã é ${diaLocal(fuso, 1)}; depois de amanhã é ${diaLocal(fuso, 2)}.
Telefone de quem está falando: ${input.telefone}.

COMO PENSAR
1. Entenda a intenção mesmo em mensagem informal ("tem vaga amanhã?", "consigo cortar depois do trabalho?", "quanto fica corte e barba?").
2. Resolva referências do próprio diálogo: "o primeiro", "o segundo", "aquele das 19", "o mesmo da última vez", "depois das seis" (= a partir das 18:00).
3. Consulte as ferramentas antes de afirmar qualquer coisa.
4. Só então responda, e registre o que ficou decidido com anotar_contexto.

${contextoTexto ? `MEMÓRIA CURTA DESTA CONVERSA (já está decidido, não pergunte de novo):\n- ${contextoTexto}` : "Esta conversa ainda não tem nada decidido."}

${input.perfil ? `MEMÓRIA DO CLIENTE (dados reais desta barbearia):\n${input.perfil}` : "Cliente ainda não identificado nesta barbearia."}
${input.houveAtendimentoHumano ? "\nEsta conversa passou por um atendente humano e voltou para você. Leia o histórico acima antes de responder e, se o que a pessoa está autorizando não estiver claro, pergunte em vez de supor.\n" : ""}
REGRAS QUE VOCÊ NUNCA QUEBRA
- Nunca invente preço, serviço, profissional, horário de funcionamento, disponibilidade, agendamento, endereço ou política. Use sempre as ferramentas.
- Se a informação não existir nas ferramentas, diga com honestidade que não tem essa informação e ofereça falar com alguém da barbearia.
- Antes de agendar, cancelar, remarcar ou confirmar, repita os detalhes e peça confirmação clara. Só execute depois do "sim".
- Só confirme ao cliente depois que a ferramenta devolver sucesso. Se der erro, diga que não conseguiu concluir e ofereça outra opção — nunca diga que deu certo.
- Ofereça apenas horários devolvidos por consultar_disponibilidade, no máximo 3 por vez, numerados, e registre-os em anotar_contexto.
- Resolva tudo aqui na conversa: nunca mande a pessoa entrar em site, link, aplicativo ou portal para agendar, cancelar ou remarcar. Você mesmo faz pelas ferramentas.
- Quando a pessoa demonstrar que quer marcar ("quero agendar", "tem horário?", "dá pra hoje?"), já consulte serviços e disponibilidade e responda numa única mensagem curta com as opções numeradas; ela pode responder só o número.
- Peça o mínimo: se o cliente já existir pelo telefone, não peça nome nem dados de novo. Se for novo, peça apenas o primeiro nome.
- Chame historico_do_cliente quando a pessoa citar "o de sempre", "o mesmo da última vez" ou pedir algo que dependa do histórico.
- Se a pessoa pedir para falar com uma pessoa, responda que vai chamar alguém da equipe e finalize a mensagem com [HUMANO].
- Preços vêm em centavos: 3500 = R$ 35,00. Mostre sempre em reais.
- Varie naturalmente a forma de responder; não repita sempre a mesma frase. No máximo um emoji, e só se o tom pedir.
- Nunca fale de dados de outro cliente, de outra barbearia, nem revele detalhes internos do sistema (ids, nomes de ferramentas, erros técnicos).
${config.encaminhamentoHumano ? "" : "- O encaminhamento para atendente humano está desligado nesta barbearia; oriente a pessoa a ligar ou ir até a barbearia.\n"}${config.mensagemBoasVindas ? `\nMensagem de boas-vindas definida pela barbearia: "${config.mensagemBoasVindas}"` : ""}${config.mensagemForaDoHorario ? `\nAviso fora do horário definido pela barbearia: "${config.mensagemForaDoHorario}"` : ""}${config.instrucoesExtras ? `\nRegras de atendimento definidas pela barbearia (siga sempre, sem inventar nada além delas):\n${config.instrucoesExtras}` : ""}`;
}

/* ------------------------------ Execução --------------------------------- */

type Mensagem = { role: string; content: any; tool_calls?: any[]; tool_call_id?: string };

async function registrarAcao(entrada: {
  tenantId: string;
  conversaId: string;
  acao: string;
  intencao: Intencao | null;
  dados: unknown;
  resultado: unknown;
  sucesso: boolean;
  erro?: string;
}) {
  const db = await admin();
  await db.from("acoes_de_ia_log").insert({
    tenant_id: entrada.tenantId,
    conversa_id: entrada.conversaId,
    acao: entrada.acao,
    intencao: entrada.intencao,
    entrada: (entrada.dados ?? {}) as never,
    resultado: (entrada.sucesso ? (entrada.resultado ?? {}) : {}) as never,
    sucesso: entrada.sucesso,
    erro: entrada.erro ?? null,
  });
}

export type RespostaDoCortai = {
  texto: string;
  pedirHumano: boolean;
  contexto: ContextoDaConversa;
  intencao: Intencao | null;
};

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
  contexto?: ContextoDaConversa;
  perfil?: string | null;
  houveAtendimentoHumano?: boolean;
}): Promise<RespostaDoCortai | null> {
  const chave = process.env["LOVABLE_API_KEY"];
  if (!chave) return null;

  const contextoAtual: ContextoDaConversa = { ...(input.contexto ?? {}) };
  let intencao: Intencao | null = contextoAtual.intencao ?? null;

  const lista = await ferramentas(input.config);
  const catalogo = new Map(lista.map((f) => [f.nome, f]));

  /** Memória curta: o modelo registra o que já ficou decidido. */
  const anotar: Ferramenta = {
    nome: "anotar_contexto",
    descricao:
      "Registra a intenção identificada e o que já ficou combinado nesta conversa (serviço, profissional, dia, opções oferecidas, agendamento em foco). Chame sempre antes da resposta final.",
    parametros: objeto(
      {
        intencao: { type: "string", enum: Object.keys(INTENCOES) },
        resumo: { type: ["string", "null"], description: "uma frase com o combinado até agora" },
        servicoId: { type: ["string", "null"] },
        servicoNome: { type: ["string", "null"] },
        profissionalId: { type: ["string", "null"] },
        profissionalNome: { type: ["string", "null"] },
        dia: { type: ["string", "null"], description: "AAAA-MM-DD" },
        agendamentoId: { type: ["string", "null"] },
        opcoes: {
          type: ["array", "null"],
          description: "opções oferecidas nesta mensagem, na ordem apresentada",
          items: objeto(
            {
              rotulo: { type: "string" },
              inicio: { type: "string" },
              profissionalId: { type: "string" },
              servicoId: { type: ["string", "null"] },
            },
            ["rotulo", "inicio", "profissionalId"],
          ),
        },
      },
      ["intencao"],
    ),
    executar: async (_ctx, d) => {
      const dados = (d ?? {}) as Partial<ContextoDaConversa> & { intencao?: string };
      if (dados.intencao && dados.intencao in INTENCOES) intencao = dados.intencao as Intencao;
      for (const campo of [
        "resumo",
        "servicoId",
        "servicoNome",
        "profissionalId",
        "profissionalNome",
        "dia",
        "agendamentoId",
      ] as const) {
        const valor = (dados as Record<string, unknown>)[campo];
        if (valor !== undefined && valor !== null && valor !== "")
          (contextoAtual as Record<string, unknown>)[campo] = valor;
      }
      if (Array.isArray(dados.opcoes)) contextoAtual.opcoes = dados.opcoes.slice(0, 5);
      if (intencao) contextoAtual.intencao = intencao;
      contextoAtual.atualizadoEm = new Date().toISOString();
      return { ok: true };
    },
  };
  lista.push(anotar);
  catalogo.set(anotar.nome, anotar);

  const mensagens: Mensagem[] = [
    {
      role: "system",
      content: instrucoes({
        fuso: await fusoDoTenant(input.ctx.tenantId),
        nomeDaBarbearia: input.nomeDaBarbearia,
        nomeDoAgente: input.nomeDoAgente,
        config: input.config,
        telefone: input.telefone,
        contexto: contextoAtual,
        perfil: input.perfil ?? null,
        houveAtendimentoHumano: Boolean(input.houveAtendimentoHumano),
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
      throw new Error(
        `IA indisponível (${resposta.status})${detalhe ? `: ${detalhe.slice(0, 160)}` : ""}`,
      );
    }
    const corpo = (await resposta.json()) as any;
    const escolha = corpo?.choices?.[0]?.message;
    if (!escolha) return null;

    const chamadas = escolha.tool_calls as any[] | undefined;
    if (!chamadas?.length) {
      const texto = String(escolha.content ?? "").trim();
      if (!texto) return null;
      const pedirHumano = texto.includes("[HUMANO]");
      return {
        texto: texto.replace(/\[HUMANO\]/g, "").trim(),
        pedirHumano,
        contexto: contextoAtual,
        intencao: pedirHumano ? "atendimento_humano" : intencao,
      };
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
          await registrarAcao({
            tenantId: input.ctx.tenantId,
            conversaId: input.conversaId,
            acao: nome,
            intencao,
            dados,
            resultado,
            sucesso: true,
          });
        } catch (erro) {
          const mensagem = erro instanceof Error ? erro.message : "Falha ao executar.";
          conteudo = JSON.stringify({ ok: false, erro: mensagem });
          await registrarAcao({
            tenantId: input.ctx.tenantId,
            conversaId: input.conversaId,
            acao: nome,
            intencao,
            dados,
            resultado: null,
            sucesso: false,
            erro: mensagem,
          });
        }
      }
      mensagens.push({ role: "tool", tool_call_id: chamada.id, content: conteudo });
    }
  }
  return null;
}

export { CONFIGURACAO_PADRAO };
