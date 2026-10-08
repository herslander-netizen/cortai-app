/* eslint-disable @typescript-eslint/no-explicit-any -- banco falso dos testes */
/**
 * Correção P0 — confiabilidade do WhatsApp: webhook fail-closed, envios presos,
 * timeout do gateway, SAIR sem cadastro, aviso de atraso sem envio e barreira.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* Banco falso: cada cadeia resolve com o próximo resultado da fila. */
const fila: { data: unknown; error: unknown }[] = [];
const atualizacoes: Record<string, unknown>[] = [];
function cadeia(): any {
  const alvo: any = {};
  const proxy: any = new Proxy(alvo, {
    get(_t, prop) {
      if (prop === "then") {
        const r = fila.shift() ?? { data: null, error: null };
        return (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
          Promise.resolve(r).then(ok, falha);
      }
      if (prop === "update")
        return (v: Record<string, unknown>) => {
          atualizacoes.push(v);
          return proxy;
        };
      return () => proxy;
    },
  });
  return proxy;
}
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => cadeia(), rpc: () => cadeia() },
}));
vi.mock("@/lib/fuso.server", () => ({ fusoDoTenant: async () => "America/Sao_Paulo" }));

beforeEach(() => {
  fila.length = 0;
  atualizacoes.length = 0;
});

describe("webhook da Evolution fail-closed", () => {
  it("sem segredo no ambiente → 503", async () => {
    const { autorizarWebhook } = await import("./segredo-webhook");
    const r = autorizarWebhook(new Headers({ "x-webhook-secret": "x" }), null);
    expect(r).toMatchObject({ ok: false, status: 503 });
  });
  it("segredo errado ou ausente → 401", async () => {
    const { autorizarWebhook } = await import("./segredo-webhook");
    expect(autorizarWebhook(new Headers({ "x-webhook-secret": "errado" }), "certo")).toMatchObject({
      ok: false,
      status: 401,
    });
    expect(autorizarWebhook(new Headers(), "certo")).toMatchObject({ ok: false, status: 401 });
  });
  it("segredo certo por x-webhook-secret ou apikey → processa", async () => {
    const { autorizarWebhook } = await import("./segredo-webhook");
    expect(autorizarWebhook(new Headers({ "x-webhook-secret": "certo" }), "certo").ok).toBe(true);
    expect(autorizarWebhook(new Headers({ apikey: "certo" }), "certo").ok).toBe(true);
  });
  it("não aceita segredo por Authorization nem pela URL", async () => {
    const { autorizarWebhook } = await import("./segredo-webhook");
    expect(autorizarWebhook(new Headers({ authorization: "Bearer certo" }), "certo").ok).toBe(
      false,
    );
  });
  it("a rota não tem mais exceção para a sessão cortai nem ?token=", async () => {
    const { readFileSync } = await import("node:fs");
    const fonte = readFileSync("src/routes/api/public/whatsapp/evolution.ts", "utf8");
    expect(fonte).not.toMatch(/instanciaDeTesteSemSegredo/);
    expect(fonte).not.toMatch(/searchParams\.get\("token"\)/);
    expect(fonte).toMatch(/autorizarWebhook\(request\.headers, segredo\)/);
  });
});

describe("envios presos em 'enviando'", () => {
  const agora = Date.parse("2026-10-08T18:00:00Z");
  const base = { id: "e1", status: "enviando", criado_em: null, mensagem_externa_id: null };
  it("decisão: com id externo → enviado; sem id e >5 min → interrompido; recente → aguarda", async () => {
    const { decidirEnvioPreso } = await import("./envios-presos");
    expect(
      decidirEnvioPreso(
        { ...base, atualizado_em: "2026-10-08T17:59:00Z", mensagem_externa_id: "w1" },
        agora,
      ),
    ).toBe("enviado");
    expect(decidirEnvioPreso({ ...base, atualizado_em: "2026-10-08T17:50:00Z" }, agora)).toBe(
      "interrompido",
    );
    expect(decidirEnvioPreso({ ...base, atualizado_em: "2026-10-08T17:58:00Z" }, agora)).toBe(
      "aguardar",
    );
  });
  it("recuperação marca erro sem reenvio (tentativas no limite) e enviado com id externo", async () => {
    const { recuperarEnviosPresos } = await import("./notificacoes.server");
    fila.push(
      {
        data: [
          { ...base, id: "a", atualizado_em: "2026-10-08T17:00:00Z" },
          { ...base, id: "b", atualizado_em: "2026-10-08T17:00:00Z", mensagem_externa_id: "w1" },
        ],
        error: null,
      },
      {
        data: {
          id: "a",
          tenant_id: "t",
          cliente_id: null,
          telefone: "5511",
          tipo: "lembrete_24h",
          conteudo: null,
        },
        error: null,
      },
      { data: { id: "x" }, error: null }, // aviso ao dono: já existe
      { data: { id: "b" }, error: null },
    );
    const n = await recuperarEnviosPresos(new Date(agora));
    expect(n).toBe(2);
    expect(atualizacoes[0]).toMatchObject({
      status: "erro",
      erro: "envio interrompido",
      tentativas: 3,
    });
    expect(atualizacoes[1]).toMatchObject({ status: "enviado" });
  });
});

describe("timeout do gateway", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("estouro de 10 s vira erro claro de tempo esgotado", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      (_u: string, init: RequestInit) =>
        new Promise((_ok, falha) =>
          init.signal?.addEventListener("abort", () =>
            falha(new DOMException("abort", "AbortError")),
          ),
        ),
    );
    const { chamar, TEMPO_LIMITE_MS } = await import("./gateway.server");
    const p = chamar(
      { provedor: "evolution", baseUrl: "https://x", apiKey: "k" } as never,
      "/a",
      "GET",
    );
    const verificacao = expect(p).rejects.toThrow(/tempo esgotado/);
    await vi.advanceTimersByTimeAsync(TEMPO_LIMITE_MS + 1);
    await verificacao;
  });
});

describe("SAIR sem cadastro", () => {
  it("nenhuma linha afetada não responde 'Pronto' e encaminha para a equipe", async () => {
    const { tratarRespostaDeLembrete, TEXTO_SAIR_SEM_CADASTRO } =
      await import("./lembretes.server");
    fila.push({ data: [], error: null });
    const r = await tratarRespostaDeLembrete({
      tenantId: "t",
      conversaId: "c",
      telefone: "5511999990000",
      texto: "SAIR",
    });
    expect(r?.texto).toBe(TEXTO_SAIR_SEM_CADASTRO);
    expect(r?.texto).not.toMatch(/^Pronto/);
    expect(r?.encaminharHumano).toBe(true);
  });
  it("com linha afetada confirma a saída", async () => {
    const { tratarRespostaDeLembrete } = await import("./lembretes.server");
    fila.push({ data: [{ id: "cli" }], error: null });
    const r = await tratarRespostaDeLembrete({
      tenantId: "t",
      conversaId: "c",
      telefone: "5511999990000",
      texto: "sair",
    });
    expect(r?.texto).toMatch(/^Pronto/);
  });
});

describe("erro no tratamento de aviso com número solto", () => {
  it("o fluxo responde texto fixo e nunca segue para a IA", async () => {
    const { readFileSync } = await import("node:fs");
    const fonte = readFileSync("src/lib/whatsapp/fluxo.server.ts", "utf8");
    const trecho = fonte.slice(
      fonte.indexOf("tratarRespostaDeLembrete({"),
      fonte.indexOf("if (lembrete) {"),
    );
    expect(trecho).not.toMatch(/\.catch\(\(\) => null\)/);
    expect(trecho).toMatch(/ehNumeroSolto/);
    expect(trecho).toMatch(/TEXTO_FALHA_TRANSITORIA/);
    const { TEXTO_FALHA_TRANSITORIA } = await import("./lembretes.server");
    expect(TEXTO_FALHA_TRANSITORIA).toBe(
      "Não consegui processar agora. Tente novamente em instantes.",
    );
  });
});

describe("avisar_atraso", () => {
  it("enviado:false vira falha da ação", async () => {
    vi.doMock("@/lib/whatsapp/aviso-atraso.server", () => ({
      avisarClienteDoAtraso: async () => ({
        enviado: false,
        motivo: "Nenhum WhatsApp disponível.",
        cliente: "Ana",
      }),
    }));
    const { ACOES } = await import("@/lib/brain/acoes.server");
    fila.push({
      data: { id: "ag", inicio: new Date().toISOString(), clientes: { nome: "Ana" } },
      error: null,
    });
    await expect(
      ACOES["avisar_atraso"]!.executar({ tenantId: "t", profissionalId: "p" } as never, {
        minutos: 10,
      }),
    ).rejects.toThrow(/não recebeu o aviso/);
  });
});

describe("barreira contra sucesso falso", () => {
  const bloquear = [
    "Pronto, confirmei seu horário.",
    "Cancelei o seu agendamento!",
    "Remarquei para amanhã às 15h.",
    "Agendei você para sexta.",
    "Seu horário está confirmado.",
    "Seu agendamento foi cancelado.",
    "O horário ficou remarcado para 16h.",
    "Tudo certo, está agendado!",
    "Horário confirmado ✅",
    "Já está cancelado.",
    "Acabei de confirmar sua presença.",
    "Agendamento realizado: agendado com sucesso.",
    "Fiz o agendamento para você.",
    "Reagendei seu corte.",
    "Sua reserva foi confirmada!",
    "Ok, tá marcado.",
    "Desmarquei o horário de terça.",
    "Obrigado por confirmar!",
    "Confirmamos seu horário das 10h.",
    "Foram cancelados os dois horários.",
    "Feito! Remarcado para quinta.",
    "Seu horário FOI CONFIRMADO.",
  ];
  const permitir = [
    "Quer que eu confirme?",
    "Posso cancelar o horário das 15h?",
    "Deseja que eu agende para amanhã?",
    "Seu horário ainda não foi confirmado.",
    "Não consegui cancelar agora.",
    "Para confirmar, responda SIM.",
    "Você quer remarcar para outro dia?",
    "Tenho 16:00, 16:30 e 17:00. Qual prefere?",
    "Seu horário está confirmado?",
    "Nada foi cancelado.",
  ];
  it.each(bloquear)("bloqueia: %s", async (texto) => {
    const { afirmaConclusao } = await import("@/lib/brain/guardas");
    expect(afirmaConclusao(texto)).toBe(true);
  });
  it.each(permitir)("permite: %s", async (texto) => {
    const { afirmaConclusao } = await import("@/lib/brain/guardas");
    expect(afirmaConclusao(texto)).toBe(false);
  });
});
