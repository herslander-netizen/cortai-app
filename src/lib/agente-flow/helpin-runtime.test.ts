import { describe, expect, it, vi } from "vitest";
import { iniciarAnaliseHelpinAgregada, type PedidoDeAnaliseHelpin } from "./helpin-runtime.server";

const resumo = {
  clientesCadastrados: 10, clientesAtendidos: 8, clientesRecorrentes: 3,
  taxaRecorrencia: 38, novosClientesMes: 2, atendimentosMes: 12,
  clientesQueRetornaramMes: 1,
};
const pedido: PedidoDeAnaliseHelpin = {
  tenantId: "tenant_demo_10", aprovadoNoServidor: true,
  aprovacaoId: "aprovacao_001234", resumo,
};
const ambiente = {
  FLOW_HELPIN_RUNTIME_ATIVO: "true",
  FLOW_HELPIN_RUNTIME_URL: "https://runtime.flow.example/",
  FLOW_HELPIN_RUNTIME_ORIGEM: "https://runtime.flow.example/",
  FLOW_HELPIN_RUNTIME_SERVICE_TOKEN: "token-ficticio-com-tamanho-minimo",
};

describe("adaptador Helpin Runtime", () => {
  it("desligado por padrão, sem rede", async () => {
    const transporte = vi.fn();
    const r = await iniciarAnaliseHelpinAgregada(pedido, {
      ambiente: {}, transporte: transporte as unknown as typeof fetch,
    });
    expect(r).toEqual({ estado: "desligado", motivo: "runtime_nao_ativado" });
    expect(transporte).not.toHaveBeenCalled();
  });

  it("exige aprovação pelo servidor antes de qualquer requisição", async () => {
    const transporte = vi.fn();
    await expect(iniciarAnaliseHelpinAgregada(
      { ...pedido, aprovadoNoServidor: false },
      { ambiente, transporte: transporte as unknown as typeof fetch },
    )).rejects.toThrow(/aprovação/);
    expect(transporte).not.toHaveBeenCalled();
  });

  it("nega HTTP e origens externas mesmo com o interruptor ligado", async () => {
    const transporte = vi.fn();
    for (const url of ["http://localhost/", "https://outro.example/"]) {
      await expect(iniciarAnaliseHelpinAgregada(pedido, {
        ambiente: { ...ambiente, FLOW_HELPIN_RUNTIME_URL: url },
        transporte: transporte as unknown as typeof fetch,
      })).rejects.toThrow(/Origem HTTPS/);
    }
    expect(transporte).not.toHaveBeenCalled();
  });

  it("nega números inválidos sem enviar dados", async () => {
    const transporte = vi.fn();
    await expect(iniciarAnaliseHelpinAgregada({
      ...pedido, resumo: { ...resumo, clientesRecorrentes: -1 },
    }, { ambiente, transporte: transporte as unknown as typeof fetch }))
      .rejects.toThrow(/contadores agregados/);
    expect(transporte).not.toHaveBeenCalled();
  });

  it("faz upsert e inicia run sem ferramentas, MCP nem campos adicionais", async () => {
    const transporte = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "flow_crm_agregados_v1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "run-123", status: "queued" }), { status: 200 }));
    const dadosExtras = { ...resumo, telefone: "5511999999999", nome: "Cliente Falso" };
    const r = await iniciarAnaliseHelpinAgregada({ ...pedido, resumo: dadosExtras }, {
      ambiente, transporte: transporte as unknown as typeof fetch,
    });
    expect(r).toEqual({ estado: "iniciada", runId: "run-123", status: "queued" });
    expect(transporte).toHaveBeenCalledTimes(2);
    const [upsertURL, upsertOpts] = transporte.mock.calls[0]!;
    const [runURL, runOpts] = transporte.mock.calls[1]!;
    expect(String(upsertURL)).toContain("/v1/agents/flow_crm_agregados_v1");
    expect(String(runURL)).toContain("/v1/runs");
    const agent = JSON.parse(upsertOpts.body as string);
    const run = JSON.parse(runOpts.body as string);
    expect(agent.allowed_tools).toEqual([]);
    expect(run.allowed_tools).toEqual([]);
    expect(run).not.toHaveProperty("mcp_servers");
    expect(JSON.stringify(run)).not.toContain("5511999999999");
    expect(JSON.stringify(run)).not.toContain("Cliente Falso");
    expect(run).not.toHaveProperty("model_credential");
    expect(upsertOpts.headers.Authorization).toMatch(/^Bearer /);
  });

  it("falha fechada se o serviço responder erro", async () => {
    const transporte = vi.fn().mockResolvedValue(new Response("erro", { status: 503 }));
    await expect(iniciarAnaliseHelpinAgregada(pedido, {
      ambiente, transporte: transporte as unknown as typeof fetch,
    })).rejects.toThrow(/recusou/);
  });
});
