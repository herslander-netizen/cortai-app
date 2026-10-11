import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Gravação de voz no navegador (MediaRecorder). Só captura e entrega o áudio: a transcrição
 * acontece no servidor, onde fica a chave — nada de IA roda aqui.
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

/** Primeiro tipo de áudio que este navegador sabe gravar (Safari só faz mp4). */
export function escolherTipoDeAudio(
  suporta: (tipo: string) => boolean = (t) => window.MediaRecorder?.isTypeSupported?.(t) ?? false,
): string | undefined {
  return TIPOS_PREFERIDOS.find((t) => suporta(t));
}

export function mensagemDeErroDoMicrofone(erro: unknown): string {
  const nome = (erro as { name?: string } | null)?.name;
  if (nome === "NotAllowedError" || nome === "SecurityError")
    return "Permita o uso do microfone no navegador para falar com a CortAI.";
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

export function useGravadorDeVoz(opcoes: {
  /** Recebe o áudio pronto. Enquanto resolve, o estado é "processando". */
  aoGravar: (audio: { blob: Blob; mimeType: string; duracaoS: number }) => Promise<void>;
  duracaoMaximaS?: number;
}) {
  const duracaoMaximaS = opcoes.duracaoMaximaS ?? 60;
  const [estado, setEstado] = useState<EstadoDoGravador>("ocioso");
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  const gravador = useRef<MediaRecorder | null>(null);
  const fluxo = useRef<MediaStream | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);
  const inicio = useRef(0);
  const descartar = useRef(false);
  const aoGravar = useRef(opcoes.aoGravar);
  aoGravar.current = opcoes.aoGravar;

  const liberar = useCallback(() => {
    if (relogio.current) clearInterval(relogio.current);
    relogio.current = null;
    fluxo.current?.getTracks().forEach((t) => t.stop());
    fluxo.current = null;
    gravador.current = null;
  }, []);

  const parar = useCallback(() => {
    const g = gravador.current;
    if (g && g.state !== "inactive") g.stop();
  }, []);

  const cancelar = useCallback(() => {
    descartar.current = true;
    const g = gravador.current;
    if (g && g.state !== "inactive") g.stop();
    else liberar();
    setEstado("ocioso");
    setSegundos(0);
  }, [liberar]);

  const iniciar = useCallback(async () => {
    if (estado !== "ocioso") return;
    setErro(null);
    if (!gravacaoDeVozSuportada()) {
      setErro("Este navegador não grava áudio. Escreva o comando.");
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
      inicio.current = Date.now();
      g.start();
      setSegundos(0);
      setEstado("gravando");
      relogio.current = setInterval(() => {
        const s = Math.floor((Date.now() - inicio.current) / 1000);
        setSegundos(s);
        if (s >= duracaoMaximaS) parar();
      }, 250);
    } catch (e) {
      liberar();
      setEstado("ocioso");
      setErro(mensagemDeErroDoMicrofone(e));
    }
  }, [estado, duracaoMaximaS, liberar, parar]);

  // Fechar o chat no meio da gravação: solta o microfone e descarta.
  useEffect(
    () => () => {
      descartar.current = true;
      const g = gravador.current;
      if (g && g.state !== "inactive") g.stop();
      liberar();
    },
    [liberar],
  );

  return {
    suportado: gravacaoDeVozSuportada(),
    estado,
    segundos,
    erro,
    limparErro: () => setErro(null),
    iniciar,
    parar,
    cancelar,
  };
}
