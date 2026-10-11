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

describe("CortAI aberta por 'Agendar por voz'", () => {
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

  it("falar → transcrever → enviar como voz, com id de idempotência, e atualizar a agenda", async () => {
    mocks.transcrever.mockResolvedValue({ texto: "marque Leandro Silva amanhã às 15h para corte" });
    mocks.perguntar.mockResolvedValue(
      RESPOSTA("Pronto ✅ Concluído: Agendar Corte para Leandro Silva."),
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
    expect(mocks.perguntar).toHaveBeenCalledTimes(1);
    const enviado = mocks.perguntar.mock.calls[0]![0].data;
    expect(enviado).toMatchObject({
      mensagem: "marque Leandro Silva amanhã às 15h para corte",
      origem: "voz",
    });
    expect(enviado.idDaMensagem).toMatch(/^[0-9a-f-]{36}$/);
    // A fala aparece na conversa e o resultado do sistema também.
    expect(document.body.textContent).toContain("marque Leandro Silva amanhã às 15h para corte");
    expect(document.body.textContent).toContain("Pronto ✅ Concluído");
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agenda-dia"] });
    // O microfone foi solto.
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
