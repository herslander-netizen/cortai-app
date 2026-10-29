/**
 * Provedor Promptfoo: roda o cérebro REAL da Flow IA (`pensarCortai`) com o mundo simulado.
 *
 * Perfis (config.perfil):
 *  - "oss"      → provedor compatível com GPT-OSS-20B (PROMPTFOO_OSS_BASE_URL/MODEL/API_KEY).
 *  - "ambiente" → usa o provedor independente configurado em CORTAI_AI_*.
 *
 * Mexe em process.env e em fetch durante a chamada → rode com `--max-concurrency 1`
 * (os scripts do package.json já fazem isso).
 *
 * Execução: `node --import tsx` (os scripts `npm run avaliar:*` cuidam disso), porque o
 * cérebro é TypeScript.
 */
import { instalarMundo, TENANT_DA_AVALIACAO } from "./mundo-falso.mjs";

/**
 * Aceita lista ("a,b") ou array. No YAML use texto separado por vírgula: o Promptfoo expande
 * variáveis que são arrays de textos em VÁRIOS testes (produto cartesiano).
 */
const lista = (x) =>
  Array.isArray(x) ? x : typeof x === "string" && x.trim() ? x.split(",").map((i) => i.trim()) : [];

const RAIZ = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const CHAVES_DO_PROVEDOR = [
  "CORTAI_AI_PROVIDER",
  "CORTAI_AI_BASE_URL",
  "CORTAI_AI_MODEL",
  "CORTAI_AI_API_KEY",
  "CORTAI_AI_CANAIS",
  "CORTAI_AI_REASONING_EFFORT",
  "CORTAI_AI_TIMEOUT_MS",
];

function aplicarPerfil(perfil) {
  const guardado = Object.fromEntries(CHAVES_DO_PROVEDOR.map((k) => [k, process.env[k]]));
  if (perfil === "oss") {
    process.env.CORTAI_AI_PROVIDER = "openai_compatible";
    // A avaliação mede o modelo em todos os canais, independentemente do rollout de produção.
    process.env.CORTAI_AI_CANAIS = "painel,whatsapp,site";
    process.env.CORTAI_AI_BASE_URL = process.env.PROMPTFOO_OSS_BASE_URL ?? "";
    process.env.CORTAI_AI_MODEL = process.env.PROMPTFOO_OSS_MODEL ?? "";
    process.env.CORTAI_AI_API_KEY = process.env.PROMPTFOO_OSS_API_KEY ?? "";
    if (process.env.PROMPTFOO_OSS_REASONING_EFFORT)
      process.env.CORTAI_AI_REASONING_EFFORT = process.env.PROMPTFOO_OSS_REASONING_EFFORT;
  }
  return () => {
    for (const [k, v] of Object.entries(guardado)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
}

function nomesDasFerramentas(corpo) {
  const lista = Array.isArray(corpo?.tools) ? corpo.tools : [];
  return lista.map((t) => t?.name ?? t?.function?.name).filter(Boolean);
}
function esquemasDasFerramentas(corpo) {
  const lista = Array.isArray(corpo?.tools) ? corpo.tools : [];
  return Object.fromEntries(
    lista.map((t) => [
      t?.name ?? t?.function?.name,
      t?.parameters ?? t?.function?.parameters ?? {},
    ]),
  );
}

export default class ProvedorCortai {
  constructor(opcoes = {}) {
    this.config = opcoes.config ?? {};
    this.rotulo = opcoes.label ?? `cortai-${this.config.perfil ?? "ambiente"}`;
  }

  id() {
    return this.rotulo;
  }

  async callApi(_prompt, contexto) {
    const v = contexto?.vars ?? {};
    const perfil = this.config.perfil ?? "ambiente";
    if (
      perfil === "oss" &&
      !(
        process.env.PROMPTFOO_OSS_BASE_URL &&
        process.env.PROMPTFOO_OSS_MODEL &&
        process.env.PROMPTFOO_OSS_API_KEY
      )
    )
      return { error: "Perfil oss sem PROMPTFOO_OSS_BASE_URL/MODEL/API_KEY: nada foi avaliado." };

    const restaurarEnv = aplicarPerfil(perfil);
    // Cenário "execução direta desligada": o interruptor vale só durante esta chamada.
    const diretaVoz = process.env.CORTAI_EXECUCAO_DIRETA_VOZ;
    if (v.execucaoDiretaVoz === true) process.env.CORTAI_EXECUCAO_DIRETA_VOZ = "true";
    else delete process.env.CORTAI_EXECUCAO_DIRETA_VOZ;
    const direta = process.env.CORTAI_EXECUCAO_DIRETA;
    if (v.execucaoDireta === false) process.env.CORTAI_EXECUCAO_DIRETA = "false";
    else delete process.env.CORTAI_EXECUCAO_DIRETA;
    const { ACOES, ferramentasDoContexto } = await import(`${RAIZ}/src/lib/brain/acoes.server.ts`);
    const { pensarCortai } = await import(`${RAIZ}/src/lib/brain/agente.server.ts`);
    const { mensagemComEscolha } = await import(`${RAIZ}/src/lib/brain/escolha-de-cliente.ts`);
    const mundo = instalarMundo(ACOES, {
      falhas: lista(v.falhasDeLeitura),
      falhasDeEscrita: lista(v.falhasDeEscrita),
    });

    const canal = v.canal ?? "whatsapp";
    const papel = v.papel ?? "cliente";
    const ctx = {
      tenantId: TENANT_DA_AVALIACAO,
      canal,
      ator: canal === "painel" ? "usuario-1" : "5511900000000",
      ...(canal === "whatsapp" && papel === "cliente" ? { telefoneCliente: "5511900000000" } : {}),
      ...(canal === "whatsapp" || canal === "painel" ? { papel } : {}),
      ...(lista(v.permissoes).length ? { permissoes: lista(v.permissoes) } : {}),
      ...(v.profissionalId ? { profissionalId: v.profissionalId } : {}),
    };
    const ferramentasOferecidasNoCatalogo = ferramentasDoContexto(ctx).map((f) => f.name);

    // Observa as chamadas ao MODELO (e só elas) para medir ferramentas oferecidas, tokens e falhas.
    const fetchOriginal = globalThis.fetch;
    const requisicoes = [];
    const tokens = { prompt: 0, completion: 0, total: 0 };
    globalThis.fetch = async (url, init) => {
      const alvo = String(url);
      if (!/\/chat\/completions|\/v1\/responses/.test(alvo)) return fetchOriginal(url, init);
      try {
        requisicoes.push(JSON.parse(String(init?.body ?? "{}")));
      } catch {
        requisicoes.push({});
      }
      if (v.falhaDoProvedor === "rede") throw new Error("ECONNRESET");
      if (typeof v.falhaDoProvedor === "number")
        return new Response("falha simulada do provedor", { status: v.falhaDoProvedor });
      const r = await fetchOriginal(url, init);
      if ((r.headers.get("content-type") ?? "").includes("application/json")) {
        const u = (
          await r
            .clone()
            .json()
            .catch(() => null)
        )?.usage;
        if (u) {
          tokens.prompt += u.prompt_tokens ?? 0;
          tokens.completion += u.completion_tokens ?? 0;
          tokens.total += u.total_tokens ?? 0;
        }
      }
      return r;
    };

    const inicio = Date.now();
    try {
      // "AGORA" e "ATRASADA" evitam datas fixas nos cenários (a pendente vale 15 min).
      const pendenteAtual = v.pendente
        ? {
            ...v.pendente,
            criadaEm:
              v.pendente.criadaEm === "ATRASADA"
                ? new Date(Date.now() - 20 * 60_000).toISOString()
                : v.pendente.criadaEm === "AGORA" || !v.pendente.criadaEm
                  ? new Date().toISOString()
                  : v.pendente.criadaEm,
          }
        : null;
      // Reivindicação atômica em memória, igual em espírito à atualização condicional do banco.
      let consumida = false;
      const consumirPendente = async () => {
        await Promise.resolve();
        if (consumida) return false;
        consumida = true;
        return true;
      };
      const rodar = () =>
        pensarCortai({
          ctx,
          persona: {
            nome: canal === "painel" ? "Flow IA" : "o atendimento de Barbearia Aurora",
            negocio: "Barbearia Aurora",
            segmento: "barbearia",
          },
          historico: v.historico ?? [],
          // Igual ao servidor: a escolha tocada na tela entra só como id já validado.
          mensagem: v.clienteEscolhidoId
            ? mensagemComEscolha(v.mensagem, v.clienteEscolhidoId)
            : v.mensagem,
          ...(v.clienteEscolhidoId ? { clienteEscolhidoId: v.clienteEscolhidoId } : {}),
          origemDoComando: v.origem === "voz" ? "voz" : "texto",
          pendente: pendenteAtual,
          conversaId: "conversa-avaliacao",
          ...(v.simultaneas ? { consumirPendente } : {}),
        });
      const respostas = await Promise.all(Array.from({ length: v.simultaneas ?? 1 }, rodar));
      const r = respostas[0];
      const ultimo = requisicoes.at(-1);
      const saida = {
        texto: r.texto,
        textos: respostas.map((x) => x.texto),
        pendente: r.pendente,
        pedirHumano: r.pedirHumano,
        indisponivel: r.indisponivel,
        opcoes: r.opcoes ?? [],
        conferencia: r.conferencia ?? null,
        executadas: mundo.registro.executadas,
        preparadas: mundo.registro.preparadas,
        leituras: mundo.registro.leituras,
        tenantsVistos: [...mundo.registro.tenantsVistos],
        ferramentasOferecidas: nomesDasFerramentas(requisicoes[0]),
        ferramentasDoCatalogo: ferramentasOferecidasNoCatalogo,
        esquemas: esquemasDasFerramentas(requisicoes[0]),
        rodadasDoModelo: requisicoes.length,
        ultimaRequisicaoTemSistema: Boolean(ultimo),
        latenciaMs: Date.now() - inicio,
      };
      return {
        output: JSON.stringify(saida),
        tokenUsage: tokens.total
          ? { prompt: tokens.prompt, completion: tokens.completion, total: tokens.total }
          : undefined,
        latencyMs: saida.latenciaMs,
      };
    } catch (erro) {
      return { error: `Falha no harness: ${erro instanceof Error ? erro.message : String(erro)}` };
    } finally {
      globalThis.fetch = fetchOriginal;
      mundo.restaurar();
      restaurarEnv();
      if (diretaVoz === undefined) delete process.env.CORTAI_EXECUCAO_DIRETA_VOZ;
      else process.env.CORTAI_EXECUCAO_DIRETA_VOZ = diretaVoz;
      if (direta === undefined) delete process.env.CORTAI_EXECUCAO_DIRETA;
      else process.env.CORTAI_EXECUCAO_DIRETA = direta;
    }
  }
}
