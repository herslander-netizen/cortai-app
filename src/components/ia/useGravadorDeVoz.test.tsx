// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any -- navegador simulado */
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  blobParaBase64,
  comandoDeVozSuportado,
  escolherTipoDeAudio,
  gravacaoDeVozSuportada,
  mensagemDeErroDoMicrofone,
  useGravadorDeVoz,
} from "./useGravadorDeVoz";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const trilhas: { stop: ReturnType<typeof vi.fn> }[] = [];
let gravadores: FakeGravador[] = [];

class FakeGravador {
  static isTypeSupported = (t: string) => t === "audio/webm;codecs=opus" || t === "audio/webm";
  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(_stream: unknown, opcoes?: { mimeType?: string }) {
    this.mimeType = opcoes?.mimeType ?? "audio/webm";
    gravadores.push(this);
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["áudio-falso"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

function permitirMicrofone() {
  (navigator as any).mediaDevices = {
    getUserMedia: vi.fn(async () => {
      const t = { stop: vi.fn() };
      trilhas.push(t);
      return { getTracks: () => [t] };
    }),
  };
}

type Api = ReturnType<typeof useGravadorDeVoz>;
function montar(aoGravar: (a: any) => Promise<void>, duracaoMaximaS?: number) {
  const api: { atual: Api | null } = { atual: null };
  function Teste() {
    api.atual = useGravadorDeVoz({ aoGravar, ...(duracaoMaximaS ? { duracaoMaximaS } : {}) });
    return null;
  }
  const alvo = document.createElement("div");
  const raiz = createRoot(alvo);
  act(() => raiz.render(createElement(Teste)));
  return { api, desmontar: () => act(() => raiz.unmount()) };
}

beforeEach(() => {
  vi.useFakeTimers();
  trilhas.length = 0;
  gravadores = [];
  (window as any).MediaRecorder = FakeGravador;
  permitirMicrofone();
});
afterEach(() => {
  vi.useRealTimers();
});

const avancar = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));

describe("utilitários", () => {
  it("detecta suporte e escolhe o primeiro formato gravável", () => {
    expect(gravacaoDeVozSuportada()).toBe(true);
    delete (window as any).MediaRecorder;
    expect(gravacaoDeVozSuportada()).toBe(false);
    expect(escolherTipoDeAudio((t) => t === "audio/mp4")).toBe("audio/mp4"); // Safari
    expect(escolherTipoDeAudio(() => false)).toBeUndefined();
  });

  it("mensagens claras para cada falha do microfone", () => {
    expect(mensagemDeErroDoMicrofone({ name: "NotAllowedError" })).toMatch(
      /Permita o uso do microfone/,
    );
    expect(mensagemDeErroDoMicrofone({ name: "NotFoundError" })).toMatch(
      /não encontrei um microfone/i,
    );
    expect(mensagemDeErroDoMicrofone({ name: "NotReadableError" })).toMatch(/em uso/);
    expect(mensagemDeErroDoMicrofone(new Error("x"))).toMatch(/Não consegui acessar o microfone/);
  });

  it("blobParaBase64 devolve só o base64, sem o prefixo data:", async () => {
    vi.useRealTimers();
    expect(await blobParaBase64(new Blob(["abc"], { type: "audio/webm" }))).toBe(btoa("abc"));
  });
});

describe("useGravadorDeVoz", () => {
  it("grava, entrega o áudio com o formato e a duração, e solta o microfone", async () => {
    const aoGravar = vi.fn(async () => undefined);
    const { api } = montar(aoGravar);
    await act(async () => void (await api.atual!.iniciar()));
    expect(api.atual!.estado).toBe("gravando");
    await avancar(2_100);
    expect(api.atual!.segundos).toBe(2);
    await act(async () => api.atual!.parar());
    expect(aoGravar).toHaveBeenCalledTimes(1);
    const entrega = (aoGravar.mock.calls[0] as any[])[0];
    expect(entrega.mimeType).toBe("audio/webm;codecs=opus");
    expect(entrega.duracaoS).toBe(2);
    expect(entrega.blob.size).toBeGreaterThan(0);
    expect(trilhas.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
    await avancar(0);
    expect(api.atual!.estado).toBe("ocioso");
  });

  it("enquanto processa o áudio não aceita outra gravação", async () => {
    let liberar: () => void = () => undefined;
    const aoGravar = vi.fn(() => new Promise<void>((r) => (liberar = r)));
    const { api } = montar(aoGravar);
    await act(async () => void (await api.atual!.iniciar()));
    await avancar(1_000);
    await act(async () => api.atual!.parar());
    expect(api.atual!.estado).toBe("processando");
    await act(async () => void (await api.atual!.iniciar()));
    expect(gravadores).toHaveLength(1);
    await act(async () => liberar());
    expect(api.atual!.estado).toBe("ocioso");
  });

  it("permissão negada: mostra o motivo e não deixa nada aberto", async () => {
    (navigator as any).mediaDevices.getUserMedia = vi.fn(async () => {
      throw Object.assign(new Error("negado"), { name: "NotAllowedError" });
    });
    const aoGravar = vi.fn(async () => undefined);
    const { api } = montar(aoGravar);
    await act(async () => void (await api.atual!.iniciar()));
    expect(api.atual!.estado).toBe("ocioso");
    expect(api.atual!.erro).toMatch(/Permita o uso do microfone/);
    expect(aoGravar).not.toHaveBeenCalled();
  });

  it("navegador sem gravação: orienta a escrever e não tenta pedir o microfone", async () => {
    delete (window as any).MediaRecorder;
    const { api } = montar(vi.fn(async () => undefined));
    expect(api.atual!.suportado).toBe(false);
    await act(async () => void (await api.atual!.iniciar()));
    expect(api.atual!.erro).toMatch(/Escreva o comando/);
    expect((navigator as any).mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  it("toque acidental (muito curto) não vira comando", async () => {
    const aoGravar = vi.fn(async () => undefined);
    const { api } = montar(aoGravar);
    await act(async () => void (await api.atual!.iniciar()));
    await avancar(200);
    await act(async () => api.atual!.parar());
    expect(aoGravar).not.toHaveBeenCalled();
    expect(api.atual!.erro).toMatch(/Não ouvi nada/);
    expect(api.atual!.estado).toBe("ocioso");
  });

  it("cancelar descarta o áudio e solta o microfone", async () => {
    const aoGravar = vi.fn(async () => undefined);
    const { api } = montar(aoGravar);
    await act(async () => void (await api.atual!.iniciar()));
    await avancar(2_000);
    await act(async () => api.atual!.cancelar());
    expect(aoGravar).not.toHaveBeenCalled();
    expect(trilhas[0]!.stop).toHaveBeenCalled();
    expect(api.atual!.estado).toBe("ocioso");
  });

  it("fechar o chat no meio da gravação solta o microfone e não envia nada", async () => {
    const aoGravar = vi.fn(async () => undefined);
    const { api, desmontar } = montar(aoGravar);
    await act(async () => void (await api.atual!.iniciar()));
    await avancar(2_000);
    desmontar();
    expect(trilhas[0]!.stop).toHaveBeenCalled();
    expect(aoGravar).not.toHaveBeenCalled();
  });

  it("para sozinho ao atingir a duração máxima", async () => {
    const aoGravar = vi.fn(async () => undefined);
    const { api } = montar(aoGravar, 3);
    await act(async () => void (await api.atual!.iniciar()));
    await avancar(3_500);
    expect(aoGravar).toHaveBeenCalledTimes(1);
    expect(gravadores[0]!.state).toBe("inactive");
  });

  it("falha ao processar o áudio vira mensagem e libera o botão", async () => {
    const aoGravar = vi.fn(async () => {
      throw new Error("Não entendi o áudio.");
    });
    const { api } = montar(aoGravar);
    await act(async () => void (await api.atual!.iniciar()));
    await avancar(1_500);
    await act(async () => api.atual!.parar());
    await avancar(0);
    expect(api.atual!.erro).toBe("Não entendi o áudio.");
    expect(api.atual!.estado).toBe("ocioso");
  });
});

/* ------------------- Reconhecimento de fala do navegador (gratuito) ------------------- */

let reconhecedores: FakeReconhecimento[] = [];
class FakeReconhecimento {
  lang = "";
  interimResults = false;
  continuous = true;
  maxAlternatives = 0;
  onresult: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onend: (() => void) | null = null;
  iniciado = false;
  abortado = false;
  constructor() {
    reconhecedores.push(this);
  }
  start() {
    this.iniciado = true;
  }
  stop() {
    this.onend?.();
  }
  abort() {
    this.abortado = true;
  }
  /** Simula o navegador entendendo um trecho (parcial ou final). */
  ouvir(texto: string, final: boolean) {
    this.onresult?.({
      resultIndex: 0,
      results: [Object.assign([{ transcript: texto }], { isFinal: final })],
    });
  }
}

function montarComReconhecimento(
  aoGravar: (a: any) => Promise<void>,
  aoReconhecer: ((t: string) => Promise<void>) | undefined,
) {
  const api: { atual: Api | null } = { atual: null };
  function Teste() {
    api.atual = useGravadorDeVoz({ aoGravar, ...(aoReconhecer ? { aoReconhecer } : {}) });
    return null;
  }
  const alvo = document.createElement("div");
  const raiz = createRoot(alvo);
  act(() => raiz.render(createElement(Teste)));
  return { api, desmontar: () => act(() => raiz.unmount()) };
}

describe("reconhecimento de fala do navegador (de graça, sem servidor)", () => {
  beforeEach(() => {
    reconhecedores = [];
    (window as any).webkitSpeechRecognition = FakeReconhecimento;
  });
  afterEach(() => {
    delete (window as any).webkitSpeechRecognition;
    delete (window as any).SpeechRecognition;
  });

  it("suporte: basta o reconhecimento do navegador, mesmo sem gravação", () => {
    delete (window as any).MediaRecorder;
    expect(gravacaoDeVozSuportada()).toBe(false);
    expect(comandoDeVozSuportado()).toBe(true);
    delete (window as any).webkitSpeechRecognition;
    expect(comandoDeVozSuportado()).toBe(false);
  });

  it("escuta em pt-BR, mostra o texto parcial e entrega o texto final SEM usar microfone/servidor", async () => {
    const aoGravar = vi.fn(async () => undefined);
    const aoReconhecer = vi.fn(async () => undefined);
    const { api } = montarComReconhecimento(aoGravar, aoReconhecer);
    await act(async () => void (await api.atual!.iniciar()));
    const r = reconhecedores[0]!;
    expect(r).toMatchObject({
      lang: "pt-BR",
      interimResults: true,
      continuous: false,
      iniciado: true,
    });
    expect(api.atual!.estado).toBe("gravando");
    act(() => r.ouvir("marque Leandro", false));
    expect(api.atual!.parcial).toBe("marque Leandro");
    act(() => r.ouvir("marque Leandro Silva às 15h", true));
    await act(async () => r.onend?.()); // o navegador encerra depois da pausa
    await avancar(0);
    expect(aoReconhecer).toHaveBeenCalledWith("marque Leandro Silva às 15h");
    expect(aoGravar).not.toHaveBeenCalled();
    expect((navigator as any).mediaDevices.getUserMedia).not.toHaveBeenCalled();
    expect(api.atual!.estado).toBe("ocioso");
    expect(api.atual!.parcial).toBe("");
  });

  it("tocar no quadrado (parar) entrega o que já foi entendido", async () => {
    const aoReconhecer = vi.fn(async () => undefined);
    const { api } = montarComReconhecimento(
      vi.fn(async () => undefined),
      aoReconhecer,
    );
    await act(async () => void (await api.atual!.iniciar()));
    act(() => reconhecedores[0]!.ouvir("quais clientes chamam Leandro", true));
    await act(async () => api.atual!.parar());
    await avancar(0);
    expect(aoReconhecer).toHaveBeenCalledWith("quais clientes chamam Leandro");
  });

  it("silêncio: avisa que não ouviu e não envia nada", async () => {
    const aoReconhecer = vi.fn(async () => undefined);
    const { api } = montarComReconhecimento(
      vi.fn(async () => undefined),
      aoReconhecer,
    );
    await act(async () => void (await api.atual!.iniciar()));
    act(() => reconhecedores[0]!.onerror?.({ error: "no-speech" }));
    await act(async () => reconhecedores[0]!.onend?.());
    expect(aoReconhecer).not.toHaveBeenCalled();
    expect(api.atual!.erro).toMatch(/Não ouvi nada/);
    expect(api.atual!.estado).toBe("ocioso");
  });

  it("microfone negado no reconhecedor mostra o motivo claro", async () => {
    const { api } = montarComReconhecimento(
      vi.fn(async () => undefined),
      vi.fn(async () => undefined),
    );
    await act(async () => void (await api.atual!.iniciar()));
    act(() => reconhecedores[0]!.onerror?.({ error: "not-allowed" }));
    await act(async () => reconhecedores[0]!.onend?.());
    expect(api.atual!.erro).toMatch(/Permita o uso do microfone/);
  });

  it("falha de rede do reconhecedor cai SOZINHA para a gravação com transcrição no servidor", async () => {
    const aoGravar = vi.fn(async () => undefined);
    const aoReconhecer = vi.fn(async () => undefined);
    const { api } = montarComReconhecimento(aoGravar, aoReconhecer);
    await act(async () => void (await api.atual!.iniciar()));
    act(() => reconhecedores[0]!.onerror?.({ error: "network" }));
    await act(async () => reconhecedores[0]!.onend?.());
    await avancar(0);
    expect((navigator as any).mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    expect(api.atual!.estado).toBe("gravando");
    await avancar(1_500);
    await act(async () => api.atual!.parar());
    expect(aoGravar).toHaveBeenCalledTimes(1);
    expect(aoReconhecer).not.toHaveBeenCalled();
  });

  it("falha de rede sem gravação disponível: orienta a escrever", async () => {
    delete (window as any).MediaRecorder;
    const { api } = montarComReconhecimento(
      vi.fn(async () => undefined),
      vi.fn(async () => undefined),
    );
    await act(async () => void (await api.atual!.iniciar()));
    act(() => reconhecedores[0]!.onerror?.({ error: "network" }));
    await act(async () => reconhecedores[0]!.onend?.());
    expect(api.atual!.erro).toMatch(/precisa de internet/);
    expect(api.atual!.estado).toBe("ocioso");
  });

  it("cancelar e fechar o chat abortam o reconhecedor sem enviar nada", async () => {
    const aoReconhecer = vi.fn(async () => undefined);
    const { api, desmontar } = montarComReconhecimento(
      vi.fn(async () => undefined),
      aoReconhecer,
    );
    await act(async () => void (await api.atual!.iniciar()));
    act(() => reconhecedores[0]!.ouvir("texto", true));
    await act(async () => api.atual!.cancelar());
    await act(async () => reconhecedores[0]!.onend?.());
    expect(reconhecedores[0]!.abortado).toBe(true);
    expect(aoReconhecer).not.toHaveBeenCalled();

    await act(async () => void (await api.atual!.iniciar()));
    desmontar();
    expect(reconhecedores[1]!.abortado).toBe(true);
  });

  it("sem a função de reconhecimento, mesmo com suporte do navegador, usa a gravação (compatibilidade)", async () => {
    const aoGravar = vi.fn(async () => undefined);
    const { api } = montarComReconhecimento(aoGravar, undefined);
    await act(async () => void (await api.atual!.iniciar()));
    expect(reconhecedores).toHaveLength(0);
    expect((navigator as any).mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("para sozinho no limite de duração", async () => {
    const aoReconhecer = vi.fn(async () => undefined);
    const api: { atual: Api | null } = { atual: null };
    function Teste() {
      api.atual = useGravadorDeVoz({
        aoGravar: vi.fn(async () => undefined),
        aoReconhecer,
        duracaoMaximaS: 2,
      });
      return null;
    }
    const alvo = document.createElement("div");
    const raiz2 = createRoot(alvo);
    act(() => raiz2.render(createElement(Teste)));
    await act(async () => void (await api.atual!.iniciar()));
    act(() => reconhecedores[0]!.ouvir("ok", true));
    await avancar(2_500);
    await avancar(0);
    expect(aoReconhecer).toHaveBeenCalledWith("ok");
    act(() => raiz2.unmount());
  });
});
