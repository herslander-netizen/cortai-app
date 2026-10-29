// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any -- navegador e servidor simulados */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  perguntar: vi.fn(),
  transcrever: vi.fn(),
  conversa: vi.fn(async () => ({ conversaId: null, mensagens: [], disponivel: true })),
}));

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ Link: () => null }));
vi.mock("@/lib/assistente.functions", () => ({
  perguntarAoCortai: (...a: unknown[]) => mocks.perguntar(...a),
  getConversaDoAssistente: () => mocks.conversa(),
  confirmarAcaoDaIa: vi.fn(),
}));
vi.mock("@/lib/voz.functions", () => ({
  transcreverComandoDeVozDoPainel: (...a: unknown[]) => mocks.transcrever(...a),
}));
vi.mock("./useProgressoCortai", () => ({ useProgressoCortai: () => null }));
vi.mock("./AgendarNoChat", () => ({ AgendarNoChat: () => null }));
vi.mock("./useGravadorDeVoz", async (original) => ({
  ...((await original()) as object),
  // FileReader do jsdom não anda com relógio falso; o conteúdo do áudio não importa aqui.
  blobParaBase64: async () => "QUJDREVGRw==",
}));

import { AssistenteCortai } from "./AssistenteCortai";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const trilhas: { stop: ReturnType<typeof vi.fn> }[] = [];
class FakeGravador {
  static isTypeSupported = () => true;
  state: "inactive" | "recording" = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["x"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

const RESPOSTA = (texto: string) => ({
  conversaId: "c1",
  resposta: {
    resposta: texto,
    intencao: "consultar",
    precisaConfirmar: false,
    perguntaDeConfirmacao: null,
    destino: null,
    rotuloDoDestino: null,
    servicos: null,
    horarios: null,
    disponivel: true,
  },
});

let raiz: Root | null = null;
let host: HTMLDivElement | null = null;
let qc: QueryClient;

async function montar(iniciarPorVoz: boolean) {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(qc, "invalidateQueries");
  host = document.createElement("div");
  document.body.appendChild(host);
  raiz = createRoot(host);
  await act(async () => {
    raiz!.render(
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(AssistenteCortai, { onFechar: () => undefined, iniciarPorVoz }),
      ),
    );
  });
}
const avancar = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));
const botao = (rotulo: string) =>
  document.querySelector<HTMLButtonElement>(`button[aria-label="${rotulo}"]`);

beforeEach(() => {
  vi.useFakeTimers();
  (window as any).matchMedia = (query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  // jsdom não implementa a rolagem de elementos que a lista de mensagens usa.
  (Element.prototype as any).scrollTo = vi.fn();
  trilhas.length = 0;
  mocks.perguntar.mockReset();
  mocks.transcrever.mockReset();
  (window as any).MediaRecorder = FakeGravador;
  (navigator as any).mediaDevices = {
    getUserMedia: vi.fn(async () => {
      const t = { stop: vi.fn() };
      trilhas.push(t);
      return { getTracks: () => [t] };
    }),
  };
});
afterEach(() => {
  act(() => raiz?.unmount());
  host?.remove();
  document.body.innerHTML = "";
  raiz = null;
  vi.useRealTimers();
});

describe("Flow IA aberta por 'Agendar por voz'", () => {
  it("abre já ouvindo, sem puxar o teclado", async () => {
    await montar(true);
    expect((navigator as any).mediaDevices.getUserMedia).not.toHaveBeenCalled(); // pequena espera antes
    await avancar(200);
    expect((navigator as any).mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toMatch(/Ouvindo…/);
    expect(botao("Parar e enviar o comando de voz")).not.toBeNull();
    expect(document.activeElement?.tagName).not.toBe("TEXTAREA");
  });

  it("aberta pelo botão normal, NÃO liga o microfone sozinha", async () => {
    await montar(false);
    await avancar(500);
    expect((navigator as any).mediaDevices.getUserMedia).not.toHaveBeenCalled();
    expect(botao("Falar um comando")).not.toBeNull();
  });

  it("transcreve para um rascunho editável e só envia depois do toque explícito", async () => {
    mocks.transcrever.mockResolvedValue({ texto: "marque Leandro Silva amanhã às 15h para corte" });
    mocks.perguntar.mockResolvedValue(
      RESPOSTA("Entendi assim: Agendar Corte para Leandro Silva. Posso confirmar?"),
    );
    await montar(true);
    await avancar(200);
    await avancar(1_500);
    await act(async () => botao("Parar e enviar o comando de voz")!.click());
    await avancar(0);
    expect(mocks.transcrever).toHaveBeenCalledTimes(1);
    expect(mocks.transcrever.mock.calls[0]![0].data).toMatchObject({
      audioBase64: "QUJDREVGRw==",
      mimeType: "audio/webm",
    });
    const campo = document.querySelector<HTMLTextAreaElement>("textarea")!;
    expect(campo.value).toBe("marque Leandro Silva amanhã às 15h para corte");
    expect(document.body.textContent).toMatch(/Transcrição pronta. Revise antes de enviar/);
    expect(mocks.perguntar).not.toHaveBeenCalled();
    expect(qc.invalidateQueries).not.toHaveBeenCalled();

    // Corrigir um possível erro de reconhecimento antes de chamar o cérebro.
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(campo, "marque Leandro Silva amanhã às 16h para corte");
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => botao("Enviar")!.click());
    await avancar(0);
    expect(mocks.perguntar).toHaveBeenCalledTimes(1);
    const enviado = mocks.perguntar.mock.calls[0]![0].data;
    expect(enviado).toMatchObject({
      mensagem: "marque Leandro Silva amanhã às 16h para corte",
      origem: "voz",
    });
    expect(enviado.idDaMensagem).toMatch(/^[0-9a-f-]{36}$/);
    expect(document.body.textContent).toContain("Entendi assim: Agendar Corte");
    expect(trilhas.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
  });

  it("não entendeu o áudio: mostra o motivo, não envia nada ao cérebro", async () => {
    mocks.transcrever.mockResolvedValue({ texto: null, motivo: "nao_entendi" });
    await montar(true);
    await avancar(200);
    await avancar(1_500);
    await act(async () => botao("Parar e enviar o comando de voz")!.click());
    await avancar(0);
    expect(mocks.perguntar).not.toHaveBeenCalled();
    expect(document.body.textContent).toMatch(/Não entendi o áudio/);
    expect(botao("Falar um comando")).not.toBeNull();
  });

  it("microfone negado: explica e deixa escrever", async () => {
    (navigator as any).mediaDevices.getUserMedia = vi.fn(async () => {
      throw Object.assign(new Error("negado"), { name: "NotAllowedError" });
    });
    await montar(true);
    await avancar(200);
    expect(document.body.textContent).toMatch(/Permita o uso do microfone/);
    expect(mocks.perguntar).not.toHaveBeenCalled();
  });
});

describe("reenvio do mesmo comando (timeout) reaproveita o id", () => {
  async function digitarEEnviar(texto: string) {
    const campo = document.querySelector<HTMLTextAreaElement>("textarea")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(campo, texto);
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => botao("Enviar")!.click());
    await avancar(0);
  }

  it("após falha, o MESMO texto volta com o mesmo id; após sucesso, o id muda", async () => {
    mocks.perguntar
      .mockRejectedValueOnce(new Error("tempo esgotado"))
      .mockResolvedValue(RESPOSTA("Pronto ✅ Concluído: Agendar Corte."));
    await montar(false);
    await digitarEEnviar("marque Leandro Silva amanhã às 15h para corte");
    await digitarEEnviar("marque Leandro Silva amanhã às 15h para corte");
    const [a, b] = mocks.perguntar.mock.calls.map((c) => c[0].data.idDaMensagem);
    expect(a).toBeDefined();
    expect(b).toBe(a);

    await digitarEEnviar("marque Leandro Silva amanhã às 15h para corte"); // pedido novo, de propósito
    const c = mocks.perguntar.mock.calls[2]![0].data.idDaMensagem;
    expect(c).not.toBe(a);
  });

  it("textos diferentes nunca compartilham id", async () => {
    mocks.perguntar.mockRejectedValue(new Error("falhou"));
    await montar(false);
    await digitarEEnviar("primeiro comando");
    await digitarEEnviar("segundo comando");
    const [a, b] = mocks.perguntar.mock.calls.map((c) => c[0].data.idDaMensagem);
    expect(a).not.toBe(b);
  });
});

describe("pop-up de homônimos", () => {
  const opcoes = [
    { tipo: "cliente", id: "cli-1", rotulo: "Leandro Silva", detalhe: "final 4321" },
    { tipo: "cliente", id: "cli-2", rotulo: "Leandro Silva", detalhe: "final 0001" },
  ];
  const conversaComOpcoes = (extra: Record<string, unknown> = {}) => ({
    conversaId: "c1",
    disponivel: true,
    mensagens: [
      {
        id: "m1",
        autor: "barbeiro",
        conteudo: "marque Leandro amanhã às 15h para corte",
        acao: null,
      },
      {
        id: "m2",
        autor: "assistente",
        conteudo: "Encontrei dois Leandro Silva. Qual deles?",
        acao: { ...RESPOSTA("x").resposta, opcoes, ...extra },
      },
    ],
  });
  const grupo = () => document.querySelector('[role="group"][aria-label="Escolha o cliente"]');
  const opcao = (texto: string) =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="group"] li button')).find((b) =>
      b.textContent?.includes(texto),
    );

  async function montarComConversa(conversa: unknown) {
    mocks.conversa.mockResolvedValueOnce(conversa as never);
    await montar(false);
    await avancar(0);
    await avancar(0);
  }

  it("mostra uma opção por cliente, com o que os diferencia", async () => {
    await montarComConversa(conversaComOpcoes());
    expect(grupo()).not.toBeNull();
    expect(document.body.textContent).toMatch(/Qual cliente\?/);
    expect(opcao("final 4321")).toBeDefined();
    expect(opcao("final 0001")).toBeDefined();
  });

  it("tocar manda o ID do cliente escolhido (não só o nome) e fecha o pop-up", async () => {
    mocks.perguntar.mockResolvedValue(
      RESPOSTA("Pronto ✅ Concluído: Agendar Corte para Leandro Silva."),
    );
    await montarComConversa(conversaComOpcoes());
    await act(async () => opcao("final 0001")!.click());
    await avancar(0);
    const enviado = mocks.perguntar.mock.calls[0]![0].data;
    expect(enviado).toMatchObject({
      mensagem: "Leandro Silva (final 0001)",
      clienteEscolhidoId: "cli-2",
      conversaId: "c1",
    });
    expect(enviado.idDaMensagem).toMatch(/^[0-9a-f-]{36}$/);
    expect(grupo()).toBeNull();
  });

  it("fechar o pop-up não envia nada e dá para seguir escrevendo", async () => {
    await montarComConversa(conversaComOpcoes());
    await act(async () => botao("Fechar as opções")!.click());
    expect(grupo()).toBeNull();
    expect(mocks.perguntar).not.toHaveBeenCalled();
  });

  it("não aparece sem opções, nem quando a última mensagem é da pessoa", async () => {
    await montarComConversa(conversaComOpcoes({ opcoes: null }));
    expect(grupo()).toBeNull();
    act(() => raiz?.unmount());
    host?.remove();
    const c = conversaComOpcoes();
    c.mensagens.push({ id: "m3", autor: "barbeiro", conteudo: "o primeiro", acao: null });
    await montarComConversa(c);
    expect(grupo()).toBeNull();
  });

  it("se o envio da escolha falhar, o pop-up volta e dá para tocar de novo (sem redigitar)", async () => {
    const iguais = [
      { tipo: "cliente", id: "cli-1", rotulo: "Leandro Silva", detalhe: null },
      { tipo: "cliente", id: "cli-2", rotulo: "Leandro Silva", detalhe: null },
    ];
    mocks.perguntar
      .mockRejectedValueOnce(new Error("sem rede"))
      .mockResolvedValue(RESPOSTA("Pronto ✅ Concluído: Agendar Corte."));
    await montarComConversa(conversaComOpcoes({ opcoes: iguais }));
    const botoes = () => document.querySelectorAll<HTMLButtonElement>('[role="group"] li button');
    await act(async () => botoes()[0]!.click());
    await avancar(0);
    expect(document.body.textContent).toMatch(/sem rede/);
    expect(grupo()).not.toBeNull(); // pop-up de volta
    expect(document.body.textContent).not.toContain("Leandro Silva (final"); // fala provisória removida
    await act(async () => botoes()[1]!.click()); // agora o outro homônimo (mesmo rótulo)
    await avancar(0);
    const [primeira, segunda] = mocks.perguntar.mock.calls.map((c) => c[0].data);
    expect(primeira.clienteEscolhidoId).toBe("cli-1");
    expect(segunda.clienteEscolhidoId).toBe("cli-2");
    // Mesmo texto, clientes diferentes: não podem compartilhar o id de idempotência.
    expect(segunda.idDaMensagem).not.toBe(primeira.idDaMensagem);
    expect(grupo()).toBeNull();
  });
});

describe("conferência com um toque (Confirmar / Não)", () => {
  const conversaComPendente = {
    conversaId: "c1",
    disponivel: true,
    mensagens: [
      {
        id: "m1",
        autor: "barbeiro",
        conteudo: "marque Leandro Silva amanhã às 15h para corte",
        acao: null,
      },
      {
        id: "m2",
        autor: "assistente",
        conteudo:
          "Entendi assim: Agendar Corte com Rafa em segunda, 12/10, 15:00 para Leandro Silva. Posso confirmar?",
        acao: {
          ...RESPOSTA("x").resposta,
          aguardandoConfirmacao: {
            resumo: "Agendar Corte com Rafa em segunda, 12/10, 15:00 para Leandro Silva.",
          },
        },
      },
    ],
  };
  const cartao = () =>
    document.querySelector('[role="group"][aria-label="Confirmar o que a Flow IA entendeu"]');
  const botaoDoCartao = (t: string) =>
    Array.from(cartao()?.querySelectorAll<HTMLButtonElement>("button") ?? []).find(
      (b) => b.textContent === t,
    );
  async function montarComPendente() {
    mocks.conversa.mockResolvedValueOnce(conversaComPendente as never);
    await montar(false);
    await avancar(0);
    await avancar(0);
  }

  it("mostra o que foi entendido com botões grandes; Confirmar envia 'sim' e fecha o cartão", async () => {
    mocks.perguntar.mockResolvedValue(
      RESPOSTA("Pronto ✅ Concluído: Agendar Corte para Leandro Silva."),
    );
    await montarComPendente();
    expect(cartao()?.textContent).toContain(
      "Agendar Corte com Rafa em segunda, 12/10, 15:00 para Leandro Silva.",
    );
    await act(async () => botaoDoCartao("Confirmar")!.click());
    await avancar(0);
    expect(mocks.perguntar.mock.calls[0]![0].data).toMatchObject({
      mensagem: "sim",
      conversaId: "c1",
    });
    expect(cartao()).toBeNull();
    expect(document.body.textContent).toContain("Pronto ✅ Concluído");
  });

  it("'Não' envia 'não' (a pendente é descartada no servidor)", async () => {
    mocks.perguntar.mockResolvedValue(RESPOSTA("Tudo bem, não alterei nada. Como prefere seguir?"));
    await montarComPendente();
    await act(async () => botaoDoCartao("Não")!.click());
    await avancar(0);
    expect(mocks.perguntar.mock.calls[0]![0].data.mensagem).toBe("não");
    expect(cartao()).toBeNull();
  });

  it("se o envio falhar, o cartão continua para tentar de novo", async () => {
    mocks.perguntar
      .mockRejectedValueOnce(new Error("sem rede"))
      .mockResolvedValue(RESPOSTA("Pronto ✅ Concluído: x"));
    await montarComPendente();
    await act(async () => botaoDoCartao("Confirmar")!.click());
    await avancar(0);
    expect(document.body.textContent).toMatch(/sem rede/);
    expect(cartao()).not.toBeNull();
    await act(async () => botaoDoCartao("Confirmar")!.click());
    await avancar(0);
    expect(cartao()).toBeNull();
    // Reenvio do MESMO "sim" reaproveita o id de idempotência.
    const [a, b] = mocks.perguntar.mock.calls.map((c) => c[0].data.idDaMensagem);
    expect(b).toBe(a);
  });

  it("não aparece sem pendente nem quando a última mensagem é da pessoa", async () => {
    const semPendente = JSON.parse(JSON.stringify(conversaComPendente));
    semPendente.mensagens[1].acao.aguardandoConfirmacao = null;
    mocks.conversa.mockResolvedValueOnce(semPendente);
    await montar(false);
    await avancar(0);
    await avancar(0);
    expect(cartao()).toBeNull();
  });
});

describe("conferência visível na tela", () => {
  const itens = [
    {
      id: "cliente",
      rotulo: "Cliente",
      valor: "Leandro Silva (final 4321)",
      estado: "ok",
      detalhe: null,
    },
    {
      id: "servico",
      rotulo: "Serviço",
      valor: "Corte · 30 min · R$ 45,00",
      estado: "ok",
      detalhe: null,
    },
    {
      id: "regras",
      rotulo: "Regras da agenda",
      valor: "Esse horário já está registrado",
      estado: "atencao",
      detalhe: "Confirmar não cria outro.",
    },
  ];
  const conv = (acao: Record<string, unknown>) => ({
    conversaId: "c1",
    disponivel: true,
    mensagens: [
      { id: "m1", autor: "barbeiro", conteudo: "marque Leandro Silva às 15h", acao: null },
      {
        id: "m2",
        autor: "assistente",
        conteudo: "Entendi assim: Agendar Corte. Posso confirmar?",
        acao: { ...RESPOSTA("x").resposta, ...acao },
      },
    ],
  });
  async function com(conversa: unknown) {
    mocks.conversa.mockResolvedValueOnce(conversa as never);
    await montar(false);
    await avancar(0);
    await avancar(0);
  }
  const lista = () => document.querySelector('[role="group"][aria-label="Conferência do pedido"]');

  it("no cartão de confirmação: cada verificação com seu estado e o botão avisa quando há atenção", async () => {
    await com(
      conv({
        aguardandoConfirmacao: { resumo: "Agendar Corte." },
        conferencia: {
          itens,
          veredito: "atencao",
          resumo: "Confira os pontos marcados antes de confirmar.",
        },
      }),
    );
    expect(lista()?.textContent).toContain("Confira os pontos marcados antes de confirmar.");
    expect(lista()?.textContent).toContain("Cliente: Leandro Silva (final 4321)");
    expect(lista()?.textContent).toContain("Confirmar não cria outro.");
    expect(lista()?.querySelectorAll('[aria-label="conferido"]')).toHaveLength(2);
    expect(lista()?.querySelectorAll('[aria-label="atenção"]')).toHaveLength(1);
    expect(
      Array.from(document.querySelectorAll("button")).some(
        (b) => b.textContent === "Confirmar mesmo assim",
      ),
    ).toBe(true);
  });

  it("veredito 'pronto' mantém o botão simples 'Confirmar'", async () => {
    await com(
      conv({
        aguardandoConfirmacao: { resumo: "Agendar Corte." },
        conferencia: {
          itens: itens.slice(0, 2),
          veredito: "pronto",
          resumo: "Tudo conferido: pode gravar.",
        },
      }),
    );
    const botoes = Array.from(document.querySelectorAll("button")).map((b) => b.textContent);
    expect(botoes).toContain("Confirmar");
    expect(botoes).not.toContain("Confirmar mesmo assim");
  });

  it("bloqueado: mostra o problema na própria resposta e NÃO há botão de confirmar", async () => {
    await com(
      conv({
        aguardandoConfirmacao: null,
        conferencia: {
          itens: [
            {
              id: "regras",
              rotulo: "Regras da agenda",
              valor: "Fora do expediente",
              estado: "erro",
              detalhe: "Esse horário está fora do expediente.",
            },
          ],
          veredito: "bloqueado",
          resumo: "Não dá para gravar: Esse horário está fora do expediente.",
        },
      }),
    );
    expect(lista()?.textContent).toContain("Não dá para gravar");
    expect(lista()?.querySelectorAll('[aria-label="problema"]')).toHaveLength(1);
    expect(document.querySelector('[aria-label="Confirmar o que a Flow IA entendeu"]')).toBeNull();
  });

  it("resposta sem conferência (conversa comum) não mostra lista", async () => {
    await com(conv({ conferencia: null }));
    expect(lista()).toBeNull();
  });
});

describe("voz gratuita pelo navegador (sem servidor de transcrição)", () => {
  let instancias: any[] = [];
  class FakeReconhecimento {
    lang = "";
    interimResults = false;
    continuous = true;
    onresult: ((e: any) => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    onend: (() => void) | null = null;
    constructor() {
      instancias.push(this);
    }
    start() {}
    stop() {
      this.onend?.();
    }
    abort() {}
  }
  beforeEach(() => {
    instancias = [];
    (window as any).webkitSpeechRecognition = FakeReconhecimento;
  });
  afterEach(() => {
    delete (window as any).webkitSpeechRecognition;
  });

  it("reconhecimento do navegador vira rascunho revisável e só envia ao tocar em Enviar", async () => {
    mocks.perguntar.mockResolvedValue(RESPOSTA("Entendi assim: Agendar Corte. Posso confirmar?"));
    await montar(true);
    await avancar(200);
    expect(instancias).toHaveLength(1);
    expect((navigator as any).mediaDevices.getUserMedia).not.toHaveBeenCalled();
    act(() =>
      instancias[0].onresult({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: "marque Leandro Silva às 15h" }], { isFinal: false }),
        ],
      }),
    );
    expect(document.body.textContent).toContain("marque Leandro Silva às 15h");
    act(() =>
      instancias[0].onresult({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: "marque Leandro Silva às 15h para corte" }], {
            isFinal: true,
          }),
        ],
      }),
    );
    await act(async () => instancias[0].onend());
    await avancar(0);
    expect(mocks.transcrever).not.toHaveBeenCalled();
    const campo = document.querySelector<HTMLTextAreaElement>("textarea")!;
    expect(campo.value).toBe("marque Leandro Silva às 15h para corte");
    expect(document.body.textContent).toMatch(/Transcrição pronta. Revise antes de enviar/);
    expect(mocks.perguntar).not.toHaveBeenCalled();
    await act(async () => botao("Enviar")!.click());
    await avancar(0);
    expect(mocks.perguntar).toHaveBeenCalledTimes(1);
    expect(mocks.perguntar.mock.calls[0]![0].data).toMatchObject({
      mensagem: "marque Leandro Silva às 15h para corte",
      origem: "voz",
    });
  });

  it("falta de crédito do servidor aparece com a mensagem certa (e não 'não entendi')", async () => {
    delete (window as any).webkitSpeechRecognition; // navegador sem reconhecimento: cai na gravação
    mocks.transcrever.mockResolvedValue({ texto: null, motivo: "sem_credito" });
    await montar(true);
    await avancar(200);
    await avancar(1_500);
    await act(async () => botao("Parar e enviar o comando de voz")!.click());
    await avancar(0);
    expect(document.body.textContent).toMatch(/sem créditos/);
    expect(document.body.textContent).not.toMatch(/Não entendi o áudio/);
  });
});

describe("estrutura mobile do painel Flow IA", () => {
  it("mantém conversa, sugestões e compositor em regiões separadas e acessíveis", async () => {
    await montar(false);
    expect(document.querySelector('[role="dialog"][aria-label="Flow IA"]')).not.toBeNull();
    expect(document.querySelector(".cortai-conversa-lista")).not.toBeNull();
    expect(document.querySelector(".cortai-conversa-barra")).not.toBeNull();
    expect(document.querySelector('textarea[placeholder="Escreva aqui…"]')).not.toBeNull();
    expect(document.querySelector('button[aria-label="Enviar"]')).not.toBeNull();
    expect(document.querySelector('button[aria-label="Fechar Flow IA"]')).not.toBeNull();
    expect(document.querySelector(".cortai-sheet")?.getAttribute("style")).toContain("88dvh");
  });
});
