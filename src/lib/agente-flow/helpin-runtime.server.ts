/**
 * Ponte restrita para Helpin Agent Runtime. Não é conectada ao atendimento.
 * Não existem tools, MCP, dados pessoais nem execução sem autorização do host.
 */
import type { IndicadoresCRM } from "@/lib/crm/indicadores";

const CAMPOS = [
  "clientesCadastrados", "clientesAtendidos", "clientesRecorrentes",
  "taxaRecorrencia", "novosClientesMes", "atendimentosMes",
  "clientesQueRetornaramMes",
] as const;
type Contador = (typeof CAMPOS)[number];
type Resumo = Pick<IndicadoresCRM, Contador>;
export type PedidoDeAnaliseHelpin = {
  tenantId: string;
  /** Só pode ser preenchido por serviço autenticado, após aprovação humana auditada. */
  aprovadoNoServidor: boolean;
  aprovacaoId: string;
  resumo: Resumo;
};
type Ambiente = Record<string, string | undefined>;
export type EstadoDeAnaliseHelpin =
  | { estado: "desligado"; motivo: "runtime_nao_ativado" }
  | { estado: "iniciada"; runId: string; status: string };

const AGENTE = "flow_crm_agregados_v1";

export async function iniciarAnaliseHelpinAgregada(
  pedido: PedidoDeAnaliseHelpin,
  opcoes: { ambiente?: Ambiente; transporte?: typeof fetch } = {},
): Promise<EstadoDeAnaliseHelpin> {
  const env = opcoes.ambiente ?? process.env;
  if (env["FLOW_HELPIN_RUNTIME_ATIVO"] !== "true") {
    return { estado: "desligado", motivo: "runtime_nao_ativado" };
  }
  if (!pedido.aprovadoNoServidor || !pedido.aprovacaoId.trim()) {
    throw new Error("A análise externa exige aprovação registrada pelo servidor.");
  }
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(pedido.tenantId) ||
      !/^[a-zA-Z0-9:_-]{8,100}$/.test(pedido.aprovacaoId)) {
    throw new Error("Identificador interno inválido para o runtime.");
  }
  const destino = env["FLOW_HELPIN_RUNTIME_URL"]?.trim();
  const origemFixa = env["FLOW_HELPIN_RUNTIME_ORIGEM"]?.trim();
  const token = env["FLOW_HELPIN_RUNTIME_SERVICE_TOKEN"]?.trim();
  if (!destino || !origemFixa || !token || token.length < 24) {
    throw new Error("Configuração segura do runtime incompleta.");
  }
  let base: URL;
  let origem: URL;
  try {
    base = new URL(destino);
    origem = new URL(origemFixa);
  } catch {
    throw new Error("URL do runtime inválida.");
  }
  if (base.protocol !== "https:" || origem.protocol !== "https:" ||
      base.origin !== origem.origin || origem.pathname !== "/" ||
      base.pathname !== "/" || base.search || base.hash ||
      origem.search || origem.hash || base.username || base.password ||
      origem.username || origem.password) {
    throw new Error("Origem HTTPS do runtime não está autorizada.");
  }
  // Lista positiva: quaisquer campos adicionais são descartados, inclusive
  // nomes, telefones, mensagens, clientId ou parâmetros vindos de modelos.
  const dados = {} as Record<Contador, number>;
  for (const campo of CAMPOS) {
    const valor = pedido.resumo[campo];
    if (!Number.isSafeInteger(valor) || valor < 0) {
      throw new Error("Somente contadores agregados válidos podem sair do Flow.");
    }
    dados[campo] = valor;
  }

  const appId = "flow_" + pedido.tenantId; // partição separada por tenant
  const transporte = opcoes.transporte ?? fetch;
  const requisitar = async (caminho: string, metodo: "PUT" | "POST", corpo: object) => {
    const resposta = await transporte(new URL(caminho, base), {
      method: metodo,
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(12_000),
      redirect: "error",
    });
    if (!resposta.ok) {
      throw new Error("O runtime recusou a execução (HTTP " + resposta.status + ").");
    }
    const texto = await resposta.text();
    if (texto.length > 16_384) throw new Error("Resposta do runtime excedeu o limite.");
    try {
      return JSON.parse(texto) as Record<string, unknown>;
    } catch {
      throw new Error("Resposta inválida do runtime.");
    }
  };

  // O runtime registra um executor sem ferramentas. A autorização das ferramentas
  // reais continua exclusivamente no cérebro oficial do Flow.
  await requisitar(
    "/v1/agents/" + AGENTE + "?app_id=" + encodeURIComponent(appId),
    "PUT",
    {
      id: AGENTE,
      app_id: appId,
      name: "Flow CRM — análise de indicadores agregados",
      runtime_kind: "native_sdk",
      system_prompt: "Analise somente contagens agregadas. Explique tendências e possíveis ações, sem inventar dados, mudar registros ou afirmar execução de tarefas.",
      allowed_targets: ["crm_summary"],
      allowed_tools: [],
      approval_mode: "always",
      default_invocation_mode: "interactive",
    },
  );
  const resposta = await requisitar("/v1/runs", "POST", {
    app_id: appId,
    agent_id: AGENTE,
    host_run_id: pedido.aprovacaoId,
    target: { type: "crm_summary", id: "indicadores" },
    instructions: "Com base apenas nestes agregados, sugira até três melhorias de relacionamento. Sem ferramentas: " + JSON.stringify(dados),
    allowed_tools: [],
    mode: "interactive",
    execution_mode: "lightweight",
    metadata: { origem: "flow_core", dados: "agregados", referencia_aprovacao: pedido.aprovacaoId },
  });
  if (typeof resposta["id"] !== "string" || !resposta["id"]) {
    throw new Error("Runtime não retornou identificador de execução.");
  }
  return {
    estado: "iniciada",
    runId: resposta["id"],
    status: typeof resposta["status"] === "string" ? resposta["status"] : "queued",
  };
}
