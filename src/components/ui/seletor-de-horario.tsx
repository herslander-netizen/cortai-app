import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/**
 * Relógio de escolher horário no padrão do Figaro (`TimePickerDialog` do Material 3, spec 3-fluxos §"Start time"):
 * mostrador redondo, 24 h (00–11 por fora, 12–23 por dentro) e minutos de 5 em 5. Substitui o relógio nativo do
 * Android, que saía cortado e escondia o "Definir" (dono, 26/10). Sempre cabe na tela.
 */

type Etapa = "hora" | "minuto";

const TAMANHO = 256;
const CENTRO = TAMANHO / 2;
const RAIO_FORA = 104;
const RAIO_DENTRO = 70;
const BOLA = 44;

function dois(n: number) {
  return String(n).padStart(2, "0");
}

/** Hora e minuto a partir de "HH:MM" (vazio ou inválido → 09:00). */
export function lerHorario(valor: string): { h: number; m: number } {
  const [h, m] = valor.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) && h! >= 0 && h! < 24 && m! >= 0 && m! < 60
    ? { h: h!, m: m! }
    : { h: 9, m: 0 };
}

/** Valor tocado no mostrador: ângulo a partir do topo, no sentido do relógio; o anel de dentro são 12–23. */
export function valorNoMostrador(etapa: Etapa, x: number, y: number): number {
  const dx = x - CENTRO;
  const dy = y - CENTRO;
  const angulo = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const passo = Math.round(((angulo + 360) % 360) / 30) % 12;
  if (etapa === "minuto") return passo * 5;
  const dentro = Math.hypot(dx, dy) < (RAIO_FORA + RAIO_DENTRO) / 2;
  return dentro ? passo + 12 : passo;
}

function posicao(indice: number, raio: number) {
  const a = (indice * 30 * Math.PI) / 180;
  return { x: CENTRO + raio * Math.sin(a), y: CENTRO - raio * Math.cos(a) };
}

export function SeletorDeHorario({
  aberto,
  titulo,
  valor,
  onAberto,
  onEscolher,
}: {
  aberto: boolean;
  titulo: string;
  valor: string;
  onAberto: (aberto: boolean) => void;
  onEscolher: (valor: string) => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>("hora");
  const [h, setH] = useState(9);
  const [m, setM] = useState(0);
  const mostrador = useRef<HTMLDivElement>(null);
  const arrastando = useRef(false);

  useEffect(() => {
    if (!aberto) return;
    const atual = lerHorario(valor);
    setH(atual.h);
    setM(atual.m - (atual.m % 5));
    setEtapa("hora");
  }, [aberto, valor]);

  const escolherNoPonto = (e: React.PointerEvent) => {
    const caixa = mostrador.current?.getBoundingClientRect();
    if (!caixa) return;
    const escala = TAMANHO / caixa.width;
    const v = valorNoMostrador(
      etapa,
      (e.clientX - caixa.left) * escala,
      (e.clientY - caixa.top) * escala,
    );
    if (etapa === "hora") setH(v);
    else setM(v);
  };

  const marcado = etapa === "hora" ? h : m;
  const indiceMarcado = etapa === "hora" ? h % 12 : m / 5;
  const raioMarcado = etapa === "hora" && h >= 12 ? RAIO_DENTRO : RAIO_FORA;
  const ponta = posicao(indiceMarcado, raioMarcado);

  const numeros =
    etapa === "hora"
      ? [
          ...Array.from({ length: 12 }, (_, i) => ({ v: i, raio: RAIO_FORA, i })),
          ...Array.from({ length: 12 }, (_, i) => ({ v: i + 12, raio: RAIO_DENTRO, i })),
        ]
      : Array.from({ length: 12 }, (_, i) => ({ v: i * 5, raio: RAIO_FORA, i }));

  const campo = (ativo: boolean) =>
    `grid h-[72px] w-[88px] place-items-center rounded-[12px] text-[45px] font-normal leading-none tabular-nums ${
      ativo
        ? "bg-[var(--figaro-primary-container,var(--ink3))] text-[var(--figaro-on-primary-container,var(--paper))]"
        : "bg-[var(--figaro-surface-container-highest,var(--ink3))] text-paper"
    }`;

  return (
    <Dialog open={aberto} onOpenChange={onAberto}>
      <DialogContent className="mx-auto w-auto max-w-[min(328px,calc(100vw-2rem))] gap-0 p-6 sm:max-w-[328px] [&>button:last-child]:hidden">
        <DialogTitle className="text-xs font-medium text-mute">{titulo}</DialogTitle>
        <DialogDescription className="sr-only">
          Toque na hora e depois nos minutos, no mostrador.
        </DialogDescription>
        <div className="mt-5 flex items-center justify-center gap-1">
          <button
            type="button"
            className={campo(etapa === "hora")}
            onClick={() => setEtapa("hora")}
            aria-label={`Hora ${dois(h)}`}
          >
            {dois(h)}
          </button>
          <span className="w-6 text-center text-[45px] leading-none text-paper">:</span>
          <button
            type="button"
            className={campo(etapa === "minuto")}
            onClick={() => setEtapa("minuto")}
            aria-label={`Minutos ${dois(m)}`}
          >
            {dois(m)}
          </button>
        </div>

        <div
          ref={mostrador}
          role="listbox"
          aria-label={etapa === "hora" ? "Horas" : "Minutos"}
          className="relative mx-auto mt-6 aspect-square w-full max-w-[256px] touch-none select-none rounded-full bg-[var(--figaro-surface-container-highest,var(--ink3))]"
          onPointerDown={(e) => {
            arrastando.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            escolherNoPonto(e);
          }}
          onPointerMove={(e) => {
            if (arrastando.current) escolherNoPonto(e);
          }}
          onPointerUp={() => {
            arrastando.current = false;
            if (etapa === "hora") setEtapa("minuto");
          }}
        >
          <svg
            viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
            className="absolute inset-0 size-full"
            aria-hidden
          >
            <line
              x1={CENTRO}
              y1={CENTRO}
              x2={ponta.x}
              y2={ponta.y}
              stroke="var(--figaro-primary, var(--primary))"
              strokeWidth="2"
            />
            <circle cx={CENTRO} cy={CENTRO} r="4" fill="var(--figaro-primary, var(--primary))" />
            <circle
              cx={ponta.x}
              cy={ponta.y}
              r={BOLA / 2}
              fill="var(--figaro-primary, var(--primary))"
            />
          </svg>
          {numeros.map(({ v, raio, i }) => {
            const p = posicao(i, raio);
            const ativo = v === marcado;
            return (
              <span
                key={v}
                role="option"
                aria-selected={ativo}
                className={`absolute -translate-x-1/2 -translate-y-1/2 tabular-nums ${raio === RAIO_DENTRO ? "text-sm" : "text-base"} ${
                  ativo ? "text-[var(--figaro-on-primary,var(--ink))]" : "text-paper"
                }`}
                style={{ left: `${(p.x / TAMANHO) * 100}%`, top: `${(p.y / TAMANHO) * 100}%` }}
              >
                {dois(v)}
              </span>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-primary"
            onClick={() => onAberto(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-primary"
            onClick={() => {
              onEscolher(`${dois(h)}:${dois(m)}`);
              onAberto(false);
            }}
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
