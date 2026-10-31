import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";

import { Button } from "@/components/ui/button";

/** Como a foto vai aparecer: proporção do quadro, recorte (`cover`) ou foto inteira (`contain`) e moldura redonda. */
export type AjusteDeFoto = {
  proporcao: number;
  fit?: "cover" | "contain";
  redondo?: boolean;
  titulo?: string;
};

type AjustadorImagemProps = {
  file: File;
  titulo: string;
  proporcao?: number;
  onConfirmar: (arquivo: File) => void;
  onCancelar: () => void;
  zoomMaximo?: number;
  fit?: "cover" | "contain";
  /** Foto de perfil: mostra a moldura redonda (o arquivo continua quadrado). */
  redondo?: boolean;
};

type Ponto = { x: number; y: number };

const limitar = (valor: number, minimo: number, maximo: number) =>
  Math.min(maximo, Math.max(minimo, valor));

/**
 * Editor local de enquadramento. Não envia arquivos nem altera o banco:
 * devolve um novo File já recortado no enquadramento exibido na prévia.
 */
export function AjustadorImagem({
  file,
  titulo,
  proporcao = 16 / 9,
  onConfirmar,
  onCancelar,
  zoomMaximo = 4,
  fit = "cover",
  redondo = false,
}: AjustadorImagemProps) {
  const [imagem, setImagem] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [deslocamento, setDeslocamento] = useState<Ponto>({ x: 0, y: 0 });
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ponteiros = useRef(new Map<number, Ponto>());
  const gesto = useRef<{ distancia: number; zoom: number; deslocamento: Ponto } | null>(null);
  const arrasto = useRef<{ ponto: Ponto; deslocamento: Ponto } | null>(null);
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    const elemento = new Image();
    elemento.onload = () => setImagem(elemento);
    elemento.onerror = () => setErro("Não foi possível abrir esta imagem. Escolha outro arquivo.");
    elemento.src = url;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  const dimensoes = useMemo(() => {
    if (!imagem) return null;
    const largura = 320;
    const altura = largura / proporcao;
    const escalaBase =
      fit === "contain"
        ? Math.min(largura / imagem.naturalWidth, altura / imagem.naturalHeight)
        : Math.max(largura / imagem.naturalWidth, altura / imagem.naturalHeight);
    return {
      largura,
      altura,
      escalaBase,
      imagemLargura: imagem.naturalWidth * escalaBase,
      imagemAltura: imagem.naturalHeight * escalaBase,
    };
  }, [imagem, proporcao, fit]);

  const limitarDeslocamento = (ponto: Ponto, nivelZoom: number): Ponto => {
    if (!dimensoes) return ponto;
    const escala = dimensoes.escalaBase * nivelZoom;
    const sobraX = Math.max(0, (imagem!.naturalWidth * escala - dimensoes.largura) / 2);
    const sobraY = Math.max(0, (imagem!.naturalHeight * escala - dimensoes.altura) / 2);
    return {
      x: limitar(ponto.x, -sobraX, sobraX),
      y: limitar(ponto.y, -sobraY, sobraY),
    };
  };

  const distancia = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

  const atualizarGesto = () => {
    const pontos = [...ponteiros.current.values()];
    if (pontos.length >= 2 && gesto.current) {
      const distanciaAtual = distancia(pontos[0]!, pontos[1]!);
      const novoZoom = limitar(
        gesto.current.zoom * (distanciaAtual / Math.max(1, gesto.current.distancia)),
        1,
        zoomMaximo,
      );
      setZoom(novoZoom);
      setDeslocamento(limitarDeslocamento(gesto.current.deslocamento, novoZoom));
      return;
    }
    if (pontos.length === 1 && arrasto.current) {
      const atual = pontos[0]!;
      setDeslocamento(
        limitarDeslocamento(
          {
            x: arrasto.current.deslocamento.x + atual.x - arrasto.current.ponto.x,
            y: arrasto.current.deslocamento.y + atual.y - arrasto.current.ponto.y,
          },
          zoom,
        ),
      );
    }
  };

  const iniciarPonteiro = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const ponto = { x: event.clientX, y: event.clientY };
    ponteiros.current.set(event.pointerId, ponto);
    const pontos = [...ponteiros.current.values()];
    if (pontos.length >= 2) {
      gesto.current = {
        distancia: distancia(pontos[0]!, pontos[1]!),
        zoom,
        deslocamento,
      };
      arrasto.current = null;
    } else {
      arrasto.current = { ponto, deslocamento };
    }
  };

  const moverPonteiro = (event: PointerEvent<HTMLDivElement>) => {
    if (!ponteiros.current.has(event.pointerId)) return;
    ponteiros.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    atualizarGesto();
  };

  const finalizarPonteiro = (event: PointerEvent<HTMLDivElement>) => {
    ponteiros.current.delete(event.pointerId);
    const pontos = [...ponteiros.current.values()];
    gesto.current = null;
    arrasto.current = pontos.length === 1 ? { ponto: pontos[0]!, deslocamento } : null;
    if (pontos.length >= 2) {
      gesto.current = {
        distancia: distancia(pontos[0]!, pontos[1]!),
        zoom,
        deslocamento,
      };
    }
  };

  const alterarZoom = (novoZoom: number) => {
    const nivel = limitar(novoZoom, 1, zoomMaximo);
    setZoom(nivel);
    setDeslocamento((atual) => limitarDeslocamento(atual, nivel));
  };

  const confirmar = async () => {
    if (!imagem || !dimensoes || processando) return;
    setProcessando(true);
    setErro(null);
    try {
      const escala = dimensoes.escalaBase * zoom;
      const larguraSaida = 1200;
      const alturaSaida = Math.round(larguraSaida / proporcao);
      const canvas = document.createElement("canvas");
      canvas.width = larguraSaida;
      canvas.height = alturaSaida;
      const contexto = canvas.getContext("2d");
      if (!contexto) throw new Error("Não foi possível preparar a imagem.");

      if (fit === "contain") {
        const escalaSaida = escala * (larguraSaida / dimensoes.largura);
        const larguraImagem = imagem.naturalWidth * escalaSaida;
        const alturaImagem = imagem.naturalHeight * escalaSaida;
        contexto.drawImage(
          imagem,
          (larguraSaida - larguraImagem) / 2 + deslocamento.x * (larguraSaida / dimensoes.largura),
          (alturaSaida - alturaImagem) / 2 + deslocamento.y * (larguraSaida / dimensoes.largura),
          larguraImagem,
          alturaImagem,
        );
      } else {
        const origemX = imagem.naturalWidth / 2 - deslocamento.x / escala;
        const origemY = imagem.naturalHeight / 2 - deslocamento.y / escala;
        const recorteLargura = dimensoes.largura / escala;
        const recorteAltura = dimensoes.altura / escala;
        contexto.drawImage(
          imagem,
          origemX - recorteLargura / 2,
          origemY - recorteAltura / 2,
          recorteLargura,
          recorteAltura,
          0,
          0,
          larguraSaida,
          alturaSaida,
        );
      }
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (resultado) =>
            resultado ? resolve(resultado) : reject(new Error("Falha ao gerar a imagem.")),
          fit === "contain" ? "image/png" : file.type === "image/png" ? "image/png" : "image/jpeg",
          0.92,
        );
      });
      const extensao = blob.type === "image/png" ? "png" : "jpg";
      const nome =
        file.name.replace(/\.[^.]+$/, "") +
        (fit === "contain" ? "-ajustada." : "-enquadrada.") +
        extensao;
      onConfirmar(new File([blob], nome, { type: blob.type, lastModified: Date.now() }));
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível preparar a imagem.");
      setProcessando(false);
    }
  };

  const escala = dimensoes ? dimensoes.escalaBase * zoom : 1;

  return (
    // Diálogo do Radix: funciona por cima de gavetas abertas (galeria, ficha, produto) sem perder os toques.
    <DialogPrimitive.Root
      open
      onOpenChange={(aberto) => {
        if (!aberto && !processando) onCancelar();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-describedby="ajustador-imagem-dica"
          // Sem foco automático na barra de zoom (o contorno de foco aparecia logo ao abrir).
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[100] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5 text-paper outline-none"
        >
          <header className="mb-4">
            <DialogPrimitive.Title className="text-base font-semibold">
              {titulo}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description
              id="ajustador-imagem-dica"
              className="mt-1 text-sm text-mute"
            >
              Arraste para posicionar e use dois dedos ou a barra para ampliar ou reduzir.
            </DialogPrimitive.Description>
          </header>

          <div
            className={`relative mx-auto touch-none overflow-hidden select-none ${fit === "contain" ? "bg-[var(--figaro-surface-container-high,var(--ink3))]" : "bg-black"} ${redondo ? "rounded-full" : "rounded-xl"}`}
            style={{ width: "min(100%, 320px)", aspectRatio: String(proporcao) }}
            onPointerDown={iniciarPonteiro}
            onPointerMove={moverPonteiro}
            onPointerUp={finalizarPonteiro}
            onPointerCancel={finalizarPonteiro}
            onLostPointerCapture={finalizarPonteiro}
          >
            {imagem && dimensoes ? (
              <img
                src={url}
                alt="Pré-visualização do enquadramento"
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{
                  width: imagem.naturalWidth * escala,
                  height: imagem.naturalHeight * escala,
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${deslocamento.x}px), calc(-50% + ${deslocamento.y}px))`,
                }}
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-white/70">
                Carregando imagem…
              </div>
            )}
            <div
              className={`pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/30 ${redondo ? "rounded-full" : ""}`}
            />
          </div>

          <div className="mx-auto mt-4 flex max-w-[320px] items-center gap-3">
            <span className="text-xs text-mute">−</span>
            <input
              aria-label="Nível de zoom"
              type="range"
              min={1}
              max={zoomMaximo}
              step={0.01}
              value={zoom}
              onChange={(event) => alterarZoom(Number(event.target.value))}
              className="min-w-0 flex-1 accent-primary"
            />
            <span className="text-xs text-mute">+</span>
            <span className="w-12 text-right text-xs tabular-nums text-mute">
              {zoom.toFixed(1)}×
            </span>
          </div>

          {erro ? (
            <p role="alert" className="mt-3 text-sm text-[var(--figaro-error,var(--brick))]">
              {erro}
            </p>
          ) : null}

          <footer className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="text" disabled={processando} onClick={onCancelar}>
              Cancelar
            </Button>
            <Button type="button" disabled={!imagem} loading={processando} onClick={confirmar}>
              Usar esta imagem
            </Button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
