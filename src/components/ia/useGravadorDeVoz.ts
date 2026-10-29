/* eslint-disable @typescript-eslint/no-explicit-any -- SpeechRecognition não está nos tipos do DOM */
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voz no navegador, de duas formas:
 *  1. Reconhecimento do próprio navegador (Web Speech API): GRÁTIS, sem chave e sem servidor,
 *     com o texto aparecendo enquanto a pessoa fala. Chrome/Android e Safari/iOS; precisa de internet.
 *  2. Gravação (MediaRecorder) enviada ao servidor para transcrever — usada quando o navegador não
 *     reconhece fala ou quando o reconhecedor falha por rede.
 * Nenhuma chave de IA passa por aqui.
 */
export type EstadoDoGravador = "ocioso" | "gravando" | "processando";

const TIPOS_PREFERIDOS = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/aac",
];

/** Menor duração que vale transcrever (toque acidental no botão). */
const DURACAO_MINIMA_MS = 700;

export function gravacaoDeVozSuportada(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window.MediaRecorder !== "undefined"
  );
}

function construtorDeReconhecimento(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** O navegador reconhece fala sozinho (de graça)? */
export function reconhecimentoDoNavegadorSuportado(): boolean {
  return construtorDeReconhecimento() !== null;
}

/** Há ALGUM jeito de comandar por voz neste navegador? */
export function comandoDeVozSuportado(): boolean {
  return reconhecimentoDoNavegadorSuportado() || gravacaoDeVozSuportada();
}

/** Primeiro tipo de áudio que este navegador sabe gravar (Safari só faz mp4). */
export function escolherTipoDeAudio(
  suporta: (tipo: string) => boolean = (t) => window.MediaRecorder?.isTypeSupported?.(t) ?? false,
): string | undefined {
  return TIPOS_PREFERIDOS.find((t) => suporta(t));
}

export function mensagemDeErroDoMicrofone(erro: unknown): string {
  const nome = (erro as { name?: string } | null)?.name;
  if (nome === "NotAllowedError" || nome === "SecurityError")
    return "Permita o uso do microfone no navegador para falar com a Flow IA.";
  if (nome === "NotFoundError" || nome === "OverconstrainedError")
    return "Não encontrei um microfone neste aparelho.";
  if (nome === "NotReadableError") return "O microfone está em uso por outro aplicativo.";
  return "Não consegui acessar o microfone agora.";
}

export function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não consegui ler o áudio gravado."));
    leitor.onload = () => resolve(String(leitor.result).replace(/^data:[^,]*,/, ""));
    leitor.readAsDataURL(blob);
  });
}

/** Erros do reconhecedor em que vale tentar a gravação (o reconhecedor depende da rede do navegador). */
const ERROS_QUE_CAEM_PARA_GRAVACAO = new Set([
  "network",
  "service-not-allowed",
  "language-not-supported",
]);

export function useGravadorDeVoz(opcoes: {
  /** Recebe o áudio pronto (caminho com servidor). Enquanto resolve, o estado é "processando". */
  aoGravar: (audio: { blob: Blob; mimeType: string; duracaoS: number }) => Promise<void>;
  /** Recebe o texto já reconhecido pelo navegador (caminho gratuito). Sem isto, só grava. */
  aoReconhecer?: (texto: string) => Promise<void>;
  duracaoMaximaS?: number;
}) {
  const duracaoMaximaS = opcoes.duracaoMaximaS ?? 60;
  const [estado, setEstado] = useState<EstadoDoGravador>("ocioso");
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  /** O que já foi entendido enquanto a pessoa fala (só no reconhecimento do navegador). */
  const [parcial, setParcial] = useState("");

  const gravador = useRef<MediaRecorder | null>(null);
  const reconhecedor = useRef<any>(null);
  const fluxo = useRef<MediaStream | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);
  const inicio = useRef(0);
  const descartar = useRef(false);
  const aoGravar = useRef(opcoes.aoGravar);
  aoGravar.current = opcoes.aoGravar;
  const aoReconhecer = useRef(opcoes.aoReconhecer);
  aoReconhecer.current = opcoes.aoReconhecer;

  const liberar = useCallback(() => {
    if (relogio.current) clearInterval(relogio.current);
    relogio.current = null;
    fluxo.current?.getTracks().forEach((t) => t.stop());
    fluxo.current = null;
    gravador.current = null;
    reconhecedor.current = null;
  }, []);

  const parar = useCallback(() => {
    const r = reconhecedor.current;
    if (r) {
      try {
        r.stop(); // entrega o que já entendeu em onend
      } catch {
        /* já parado */
      }
      return;
    }
    const g = gravador.current;
    if (g && g.state !== "inactive") g.stop();
  }, []);

  const cancelar = useCallback(() => {
    descartar.current = true;
    const r = reconhecedor.current;
    if (r) {
      try {
        r.abort();
      } catch {
        /* já parado */
      }
      liberar();
    } else {
      const g = gravador.current;
      if (g && g.state !== "inactive") g.stop();
      else liberar();
    }
    setEstado("ocioso");
    setSegundos(0);
    setParcial("");
  }, [liberar]);

  const iniciarTemporizador = useCallback(() => {
    inicio.current = Date.now();
    setSegundos(0);
    setEstado("gravando");
    relogio.current = setInterval(() => {
      const s = Math.floor((Date.now() - inicio.current) / 1000);
      setSegundos(s);
      if (s >= duracaoMaximaS) parar();
    }, 250);
  }, [duracaoMaximaS, parar]);

  /** Caminho com servidor: grava o áudio e entrega para transcrever. */
  const iniciarGravacao = useCallback(async () => {
    if (!gravacaoDeVozSuportada()) {
      setEstado("ocioso");
      setErro("Este navegador não reconhece voz. Escreva o comando.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      fluxo.current = stream;
      const tipo = escolherTipoDeAudio();
      const g = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      gravador.current = g;
      pedacos.current = [];
      descartar.current = false;
      g.ondataavailable = (e) => {
        if (e.data.size > 0) pedacos.current.push(e.data);
      };
      g.onstop = () => {
        const duracaoMs = Date.now() - inicio.current;
        const mimeType = g.mimeType || tipo || "audio/webm";
        const blob = new Blob(pedacos.current, { type: mimeType });
        pedacos.current = [];
        liberar();
        if (descartar.current) return;
        if (duracaoMs < DURACAO_MINIMA_MS || blob.size === 0) {
          setEstado("ocioso");
          setSegundos(0);
          setErro("Não ouvi nada. Toque no microfone e fale o comando.");
          return;
        }
        setEstado("processando");
        void aoGravar
          .current({ blob, mimeType, duracaoS: Math.round(duracaoMs / 1000) })
          .catch((e: unknown) =>
            setErro(e instanceof Error ? e.message : "Não consegui processar o áudio."),
          )
          .finally(() => {
            setEstado("ocioso");
            setSegundos(0);
          });
      };
      g.onerror = () => {
        liberar();
        setEstado("ocioso");
        setErro("A gravação foi interrompida. Tente de novo.");
      };
      g.start();
      iniciarTemporizador();
    } catch (e) {
      liberar();
      setEstado("ocioso");
      setErro(mensagemDeErroDoMicrofone(e));
    }
  }, [iniciarTemporizador, liberar]);

  /** Caminho gratuito: o navegador entende a fala e devolve o texto. */
  const iniciarReconhecimento = useCallback(
    (Ctor: new () => any) => {
      const r = new Ctor();
      r.lang = "pt-BR";
      r.interimResults = true;
      r.continuous = false; // encerra sozinho depois da pausa
      r.maxAlternatives = 1;
      let final = "";
      let falha: string | null = null;
      descartar.current = false;
      reconhecedor.current = r;
      setParcial("");

      r.onresult = (e: any) => {
        let provisorio = "";
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const trecho = e.results[i]?.[0]?.transcript ?? "";
          if (e.results[i]?.isFinal) final += trecho;
          else provisorio += trecho;
        }
        setParcial(`${final}${provisorio}`.trim());
      };
      r.onerror = (e: any) => {
        falha = String(e?.error ?? "erro");
      };
      r.onend = () => {
        const duracaoMs = Date.now() - inicio.current;
        liberar();
        setParcial("");
        if (descartar.current) return;
        const texto = final.trim();
        if (texto) {
          setEstado("processando");
          void (aoReconhecer.current?.(texto) ?? Promise.resolve())
            .catch((e: unknown) =>
              setErro(e instanceof Error ? e.message : "Não consegui processar o que você disse."),
            )
            .finally(() => {
              setEstado("ocioso");
              setSegundos(0);
            });
          return;
        }
        setSegundos(0);
        if (falha && ERROS_QUE_CAEM_PARA_GRAVACAO.has(falha) && gravacaoDeVozSuportada()) {
          // O reconhecedor depende da rede do navegador: tenta gravar e transcrever no servidor.
          void iniciarGravacao();
          return;
        }
        setEstado("ocioso");
        if (falha === "not-allowed")
          setErro(mensagemDeErroDoMicrofone({ name: "NotAllowedError" }));
        else if (falha === "audio-capture")
          setErro(mensagemDeErroDoMicrofone({ name: "NotFoundError" }));
        else if (falha && ERROS_QUE_CAEM_PARA_GRAVACAO.has(falha))
          // Sem rede para o reconhecedor e sem gravação como plano B: não é "silêncio".
          setErro(
            "O reconhecimento de voz precisa de internet e não respondeu. Escreva o comando.",
          );
        else if (
          duracaoMs < DURACAO_MINIMA_MS ||
          !falha ||
          falha === "no-speech" ||
          falha === "aborted"
        )
          setErro("Não ouvi nada. Toque no microfone e fale o comando.");
        else setErro("Não consegui entender. Tente de novo ou escreva o comando.");
      };
      try {
        r.start();
        iniciarTemporizador();
      } catch {
        liberar();
        // Alguns navegadores recusam iniciar (ex.: já em uso): tenta o caminho com servidor.
        void iniciarGravacao();
      }
    },
    [iniciarGravacao, iniciarTemporizador, liberar],
  );

  const iniciar = useCallback(async () => {
    if (estado !== "ocioso") return;
    setErro(null);
    const Ctor = aoReconhecer.current ? construtorDeReconhecimento() : null;
    if (Ctor) {
      iniciarReconhecimento(Ctor);
      return;
    }
    if (!gravacaoDeVozSuportada()) {
      setErro("Este navegador não grava áudio. Escreva o comando.");
      return;
    }
    await iniciarGravacao();
  }, [estado, iniciarGravacao, iniciarReconhecimento]);

  // Fechar o chat no meio da fala: solta o microfone e descarta.
  useEffect(
    () => () => {
      descartar.current = true;
      try {
        reconhecedor.current?.abort();
      } catch {
        /* já parado */
      }
      const g = gravador.current;
      if (g && g.state !== "inactive") g.stop();
      liberar();
    },
    [liberar],
  );

  return {
    suportado: aoReconhecer.current ? comandoDeVozSuportado() : gravacaoDeVozSuportada(),
    estado,
    segundos,
    parcial,
    erro,
    limparErro: () => setErro(null),
    iniciar,
    parar,
    cancelar,
  };
}
