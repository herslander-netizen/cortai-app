import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Webhook da Evolution: segredo, sessão vinda só da instância registrada, grupos e mensagens do próprio número
 * ignorados, e os três eventos (QR, conexão, mensagem) entregues ao fluxo oficial. Sem banco e sem rede.
 */

const segredo = { valor: "segredo-de-teste" as string | null };
const atualizar = vi.fn(async (_sessao: string, _estado: Record<string, unknown>) => true);
const processar = vi.fn(async (_entrada: Record<string, unknown>) => ({
  tratada: true,
  motivo: "flow_bot",
}));
const respostaDoNegocio = vi.fn(async (_entrada: Record<string, unknown>) => "pessoa" as const);
const rejeitar = vi.fn(async () => undefined);

vi.mock("@/lib/whatsapp/gateway.server", () => ({
  segredoDoWebhookDeWhatsapp: () => segredo.valor,
}));
vi.mock("@/lib/webhook-guard.server", () => ({
  barrarAbusivo: async () => null,
  rejeitar,
  limiteAutenticado: async () => null,
}));
const conexaoPorSessao = vi.fn(async (): Promise<{ status: string } | null> => null);
vi.mock("@/lib/whatsapp/fluxo.server", () => ({
  atualizarEstadoDaConexao: atualizar,
  processarMensagemRecebida: processar,
  conexaoPorSessao,
}));
vi.mock("@/lib/flow-bot/humano.server", () => ({
  registrarRespostaDoNegocio: respostaDoNegocio,
}));

const { Route } = await import("./evolution");
type Handler = (ctx: { request: Request }) => Promise<Response>;
const post = (Route.options as unknown as { server: { handlers: { POST: Handler } } }).server
  .handlers.POST;

function chamar(corpo: unknown, cabecalhos: Record<string, string> = {}) {
  return post({
    request: new Request("https://previa.exemplo/api/public/whatsapp/evolution", {
      method: "POST",
      headers: { "content-type": "application/json", ...cabecalhos },
      body: JSON.stringify(corpo),
    }),
  });
}
const comSegredo = { "x-webhook-secret": "segredo-de-teste" };

function mensagem(dados: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return { event: "messages.upsert", instance: "flow-bot-teste", data: dados, ...extra };
}

beforeEach(() => {
  segredo.valor = "segredo-de-teste";
  for (const f of [atualizar, processar, respostaDoNegocio, rejeitar]) f.mockClear();
  processar.mockResolvedValue({ tratada: true, motivo: "flow_bot" });
});

describe("webhook da Evolution", () => {
  it("sem segredo no ambiente recusa tudo (503)", async () => {
    segredo.valor = null;
    const r = await chamar(mensagem({}), comSegredo);
    expect(r.status).toBe(503);
    expect(processar).not.toHaveBeenCalled();
  });

  it("segredo ausente ou errado: 401 sem tocar no fluxo", async () => {
    expect((await chamar(mensagem({}))).status).toBe(401);
    expect((await chamar(mensagem({}), { "x-webhook-secret": "outro" })).status).toBe(401);
    expect(rejeitar).toHaveBeenCalledTimes(2);
    expect(processar).not.toHaveBeenCalled();
    expect(atualizar).not.toHaveBeenCalled();
  });

  it("aceita o segredo também no cabeçalho apikey", async () => {
    const r = await chamar(
      { event: "connection.update", instance: "flow-bot-teste", data: { state: "close" } },
      { apikey: "segredo-de-teste" },
    );
    expect(r.status).toBe(200);
  });

  it("segredo da própria instância é aceito; o de outra instância, recusado", async () => {
    const { segredoDaInstancia } = await import("@/lib/whatsapp/segredo-webhook");
    const corpo = {
      event: "CONNECTION_UPDATE",
      instance: "flow-bot-teste",
      data: { state: "close" },
    };
    const proprio = {
      "x-webhook-secret": segredoDaInstancia("segredo-de-teste", "flow-bot-teste"),
    };
    expect((await chamar(corpo, proprio)).status).toBe(200);
    const deOutra = { "x-webhook-secret": segredoDaInstancia("segredo-de-teste", "cortai_outra") };
    expect((await chamar(corpo, deOutra)).status).toBe(401);
  });

  it("caiu com 401 enquanto o QR estava na tela: grava que pode ser o serviço, não o número", async () => {
    conexaoPorSessao.mockResolvedValueOnce({ status: "qr_pronto" });
    const r = await chamar(
      {
        event: "CONNECTION_UPDATE",
        instance: "flow-bot-teste",
        data: { state: "close", statusReason: 401 },
      },
      comSegredo,
    );
    expect(r.status).toBe(200);
    expect(atualizar).toHaveBeenLastCalledWith(
      "flow-bot-teste",
      expect.objectContaining({
        status: "close",
        erro: expect.stringContaining("não é o seu número"),
      }),
    );
  });

  it("sem instância: 400", async () => {
    expect((await chamar({ event: "messages.upsert", data: {} }, comSegredo)).status).toBe(400);
  });

  it("QR atualizado vai para a conexão da sessão", async () => {
    const r = await chamar(
      {
        event: "QRCODE_UPDATED",
        instance: "flow-bot-teste",
        data: { qrcode: { base64: "data:x" } },
      },
      comSegredo,
    );
    expect(r.status).toBe(200);
    expect(atualizar).toHaveBeenCalledWith(
      "flow-bot-teste",
      expect.objectContaining({ status: "qr_ready", qrCode: "data:x" }),
    );
  });

  it("QR com texto e imagem: guarda o texto, que o Flow desenha nas cores do tema", async () => {
    const r = await chamar(
      {
        event: "QRCODE_UPDATED",
        instance: "flow-bot-teste",
        data: { qrcode: { base64: "data:imagem-azul", code: "2@codigo" } },
      },
      comSegredo,
    );
    expect(r.status).toBe(200);
    expect(atualizar).toHaveBeenCalledWith(
      "flow-bot-teste",
      expect.objectContaining({ qrCode: "2@codigo" }),
    );
  });

  it("conexão aberta limpa o QR e leva a hora do evento", async () => {
    await chamar(
      {
        event: "connection.update",
        instance: "flow-bot-teste",
        date_time: "2026-11-05T12:00:00.000Z",
        data: { state: "open" },
      },
      comSegredo,
    );
    expect(atualizar).toHaveBeenCalledWith(
      "flow-bot-teste",
      expect.objectContaining({
        status: "open",
        qrCode: null,
        eventoEm: "2026-11-05T12:00:00.000Z",
        origem: "webhook_evolution",
      }),
    );
  });

  it("sessão não registrada no Flow: 404", async () => {
    atualizar.mockResolvedValueOnce(false);
    const r = await chamar(
      { event: "connection.update", instance: "desconhecida", data: { state: "close" } },
      comSegredo,
    );
    expect(r.status).toBe(404);
  });

  it("mensagem de texto: sessão e telefone vêm do evento; tenant enviado pelo chamador é ignorado", async () => {
    const r = await chamar(
      mensagem(
        {
          key: { remoteJid: "5500000000001@s.whatsapp.net", fromMe: false, id: "ABC" },
          pushName: "Ana",
          message: { conversation: "Quanto custa a escova?" },
        },
        { tenant_id: "outro-negocio" },
      ),
      comSegredo,
    );
    expect(r.status).toBe(200);
    expect(processar).toHaveBeenCalledTimes(1);
    const entrada = processar.mock.calls[0]?.[0] ?? {};
    expect(entrada).toMatchObject({
      sessaoId: "flow-bot-teste",
      telefone: "5500000000001",
      mensagemExternaId: "ABC",
      tipo: "text",
      conteudo: "Quanto custa a escova?",
    });
    expect(JSON.stringify(entrada)).not.toContain("outro-negocio");
  });

  it("texto estendido também é lido", async () => {
    await chamar(
      mensagem({
        key: { remoteJid: "5500000000001@s.whatsapp.net", id: "D" },
        message: { extendedTextMessage: { text: "Obrigado." } },
      }),
      comSegredo,
    );
    expect(processar.mock.calls[0]?.[0]).toMatchObject({ conteudo: "Obrigado." });
  });

  it("grupos e transmissões são ignorados", async () => {
    for (const jid of ["123-456@g.us", "status@broadcast", ""]) {
      const r = await chamar(
        mensagem({ key: { remoteJid: jid, id: "G" }, message: { conversation: "oi" } }),
        comSegredo,
      );
      expect(await r.json()).toMatchObject({ ignorada: true });
    }
    expect(processar).not.toHaveBeenCalled();
  });

  it("contato identificado por @lid é atendido pelo número que vem junto", async () => {
    const r = await chamar(
      mensagem({
        key: {
          remoteJid: "153197792497769@lid",
          remoteJidAlt: "557999171258@s.whatsapp.net",
          fromMe: false,
          id: "L1",
        },
        message: { conversation: "Tem horário amanhã?" },
      }),
      comSegredo,
    );
    expect(r.status).toBe(200);
    expect(processar.mock.calls[0]?.[0]).toMatchObject({
      telefone: "557999171258",
      conteudo: "Tem horário amanhã?",
    });
  });

  it("contato @lid sem número: não atende e diz o motivo", async () => {
    const r = await chamar(
      mensagem({
        key: { remoteJid: "153197792497769@lid", id: "L2" },
        message: { conversation: "oi" },
      }),
      comSegredo,
    );
    expect(await r.json()).toMatchObject({ ignorada: true, motivo: "lid_sem_numero" });
    expect(processar).not.toHaveBeenCalled();
  });

  it("recibos, reações, sincronizações e histórico fromMe não tomam o atendimento humano", async () => {
    const semRespostaReal = [
      {},
      { protocolMessage: { type: 0, key: { id: "leitura" } } },
      { reactionMessage: { text: "👍" } },
      { conversation: "   " },
      { senderKeyDistributionMessage: { groupId: "teste" } },
    ];
    for (const [indice, conteudo] of semRespostaReal.entries()) {
      const r = await chamar(
        mensagem({
          key: { remoteJid: "5500000000001@s.whatsapp.net", fromMe: true, id: `r-${indice}` },
          message: conteudo,
        }),
        comSegredo,
      );
      expect(r.status).toBe(200);
      expect(await r.json()).toMatchObject({ ignorada: true, motivo: "nao_e_resposta_humana" });
    }
    const historico = await chamar(
      mensagem({
        key: { remoteJid: "5500000000001@s.whatsapp.net", fromMe: true, id: "hist" },
        type: "append",
        message: { conversation: "Histórico sincronizado" },
      }),
      comSegredo,
    );
    expect(await historico.json()).toMatchObject({ ignorada: true, motivo: "nao_e_resposta_humana" });
    expect(respostaDoNegocio).not.toHaveBeenCalled();
    expect(processar).not.toHaveBeenCalled();
  });

  it("texto de suposto atendente vindo de outro número é cliente, nunca posse humana", async () => {
    // O texto pode alegar ser da equipe, mas só fromMe real da sessão conectada comprova saída.
    const r = await chamar(
      mensagem({
        key: { remoteJid: "5500000000002@s.whatsapp.net", fromMe: false, id: "cliente-alega-ser-equipe" },
        message: { conversation: "Olá! Atendimento humano conectado ao Flow." },
      }),
      comSegredo,
    );
    expect(r.status).toBe(200);
    expect(processar).toHaveBeenCalledWith(expect.objectContaining({
      telefone: "5500000000002",
      conteudo: "Olá! Atendimento humano conectado ao Flow.",
    }));
    expect(respostaDoNegocio).not.toHaveBeenCalled();
  });

  it("resposta humana de áudio pelo próprio WhatsApp continua assumindo a conversa", async () => {
    const r = await chamar(
      mensagem({
        key: { remoteJid: "5500000000001@s.whatsapp.net", fromMe: true, id: "voz-humana" },
        message: { audioMessage: { mimetype: "audio/ogg" } },
      }),
      comSegredo,
    );
    expect(r.status).toBe(200);
    expect(respostaDoNegocio).toHaveBeenCalledWith(
      expect.objectContaining({
        sessaoId: "flow-bot-teste",
        telefone: "5500000000001",
        mensagemExternaId: "voz-humana",
      }),
    );
    expect(processar).not.toHaveBeenCalled();
  });

  it("mensagem do próprio número nunca é respondida: só registra que a equipe falou", async () => {
    const r = await chamar(
      mensagem({
        key: { remoteJid: "5500000000001@s.whatsapp.net", fromMe: true, id: "M" },
        message: { conversation: "Oi, aqui é a Ana da equipe" },
      }),
      comSegredo,
    );
    expect(await r.json()).toMatchObject({ ignorada: true });
    expect(processar).not.toHaveBeenCalled();
    expect(respostaDoNegocio).toHaveBeenCalledWith(
      expect.objectContaining({
        sessaoId: "flow-bot-teste",
        telefone: "5500000000001",
        mensagemExternaId: "M",
      }),
    );
  });

  it("mensagem para sessão desconhecida: 404", async () => {
    processar.mockResolvedValueOnce({ tratada: false, motivo: "sessao_desconhecida" });
    const r = await chamar(
      mensagem({
        key: { remoteJid: "5500000000001@s.whatsapp.net", id: "X" },
        message: { conversation: "oi" },
      }),
      comSegredo,
    );
    expect(r.status).toBe(404);
  });

  it("no Worker, texto é processado depois da resposta (a Evolution não corta o atendimento no meio)", async () => {
    const { comContextoDaRequisicao } = await import("@/lib/segundo-plano.server");
    const adiados: Promise<unknown>[] = [];
    let terminar: (v: { tratada: boolean; motivo: string }) => void = () => undefined;
    processar.mockImplementationOnce(() => new Promise((resolver) => (terminar = resolver)));
    const r = await comContextoDaRequisicao(
      { waitUntil: (p: Promise<unknown>) => adiados.push(p) },
      () =>
        chamar(
          mensagem({
            key: { remoteJid: "5579999990000@s.whatsapp.net", id: "ABC" },
            message: { conversation: "Bom dia" },
          }),
          comSegredo,
        ),
    );
    // Respondeu antes de o atendimento terminar, e o trabalho ficou com o Worker.
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, motivo: "recebida" });
    expect(processar).toHaveBeenCalledTimes(1);
    expect(adiados).toHaveLength(1);
    terminar({ tratada: true, motivo: "flow_bot" });
    await Promise.all(adiados);
  });

  it("corpo inválido: 400", async () => {
    const r = await post({
      request: new Request("https://previa.exemplo/api/public/whatsapp/evolution", {
        method: "POST",
        headers: comSegredo,
        body: "{nao-e-json",
      }),
    });
    expect(r.status).toBe(400);
  });

  it("evento desconhecido é aceito e ignorado", async () => {
    const r = await chamar(
      { event: "presence.update", instance: "flow-bot-teste", data: {} },
      comSegredo,
    );
    expect(await r.json()).toMatchObject({ ignorado: "presence.update" });
  });
});
