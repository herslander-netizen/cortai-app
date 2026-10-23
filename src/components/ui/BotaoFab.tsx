import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { useMenosMovimento } from "@/hooks/useMovimento";
import { caminhoOndulado } from "@/lib/anel-ondulado";
import { CURVA, ESCALA, TEMPO } from "@/lib/movimento-figaro";
import { cn } from "@/lib/utils";

/** `FigarooExtendedFAB`: 56 dp de altura, 20 dp de folga lateral, 12 dp entre o ícone e o rótulo. */
const ALTURA = 56;
const FOLGA = 20;

/** Forma que gira e muda entre círculo e polígono arredondado, como o indicador de carregando do Figaro. */
function FormaCarregando({ reduzido }: { reduzido: boolean }) {
  const amplitude = useMotionValue(0);
  const giro = useMotionValue(0);
  const caminho = useTransform(amplitude, (a) => caminhoOndulado(50, 30, a, 5, 120));
  useEffect(() => {
    if (reduzido) return;
    const controles = [
      animate(amplitude, [0, 9, 0], { duration: 1.1, ease: "easeInOut", repeat: Infinity }),
      animate(giro, 360, { duration: 1.8, ease: "linear", repeat: Infinity }),
    ];
    return () => controles.forEach((c) => c.stop());
  }, [reduzido, amplitude, giro]);
  return (
    <svg width={30} height={30} viewBox="0 0 100 100" role="progressbar" aria-label="Carregando">
      <motion.g style={{ rotate: giro, transformOrigin: "50% 50%", transformBox: "fill-box" }}>
        <motion.path d={caminho} fill="currentColor" />
      </motion.g>
    </svg>
  );
}

/**
 * Botão de ação flutuante estendido do Figaro, alinhado à direita da tela de cadastro: a largura
 * acompanha o rótulo de cada passo (mola de tamanho do Figaro), o conteúdo troca com fade e escala,
 * ao salvar vira círculo em 220 ms com uma forma girando e, no sucesso, com o ✓.
 */
export function BotaoFab({
  rotulo,
  icone,
  onClick,
  desabilitado = false,
  carregando = false,
  sucesso = false,
  className,
}: {
  rotulo: string;
  icone?: ReactNode;
  onClick: () => void;
  desabilitado?: boolean;
  carregando?: boolean;
  sucesso?: boolean;
  className?: string;
}) {
  const reduzido = useMenosMovimento();
  const medida = useRef<HTMLSpanElement>(null);
  const [largura, setLargura] = useState<number | null>(null);
  const [pronto, setPronto] = useState(false);
  const colapsado = carregando || sucesso;

  useLayoutEffect(() => {
    const el = medida.current;
    if (!el) return;
    const ler = () => setLargura(el.offsetWidth);
    ler();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(ler);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Só anima a largura depois da primeira medida: a tela não abre "crescendo".
  useEffect(() => {
    if (largura !== null) setPronto(true);
  }, [largura]);

  const alvo = colapsado ? ALTURA : largura === null ? undefined : largura + FOLGA * 2;
  const transicao =
    !pronto || reduzido
      ? "none"
      : colapsado
        ? "width 220ms cubic-bezier(0, 0, 0.2, 1)"
        : "width var(--mola-tamanho-duracao, 360ms) var(--mola-tamanho)";

  return (
    <button
      type="button"
      // Colapsado não usa `disabled`: o estilo global de botão desabilitado esmaeceria o círculo.
      disabled={desabilitado && !colapsado}
      aria-disabled={colapsado || undefined}
      aria-busy={carregando || undefined}
      aria-label={colapsado ? rotulo : undefined}
      data-fab={colapsado ? "colapsado" : "estendido"}
      onClick={() => {
        if (!colapsado) onClick();
      }}
      className={cn(
        "relative inline-flex h-14 shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-[var(--botao-fundo,var(--primary))] text-[var(--botao-texto,var(--primary-foreground))]",
        "text-sm font-semibold shadow-[var(--shadow-md)] transition-[opacity,scale] duration-150",
        "active:scale-[0.98] disabled:pointer-events-none",
        colapsado ? "pointer-events-none" : "",
        className,
      )}
      style={{ width: alvo, transition: transicao }}
    >
      <span
        className="inline-flex items-center whitespace-nowrap"
        style={{
          paddingInline: FOLGA,
          opacity: colapsado ? 0 : 1,
          transition: reduzido ? "none" : "opacity 90ms linear",
        }}
      >
        <span ref={medida} className="relative inline-flex items-center gap-3">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={rotulo}
              className="inline-flex items-center gap-3"
              initial={{ opacity: 0, scale: ESCALA.botaoEntra }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: {
                  duration: TEMPO.botaoEntra,
                  delay: TEMPO.botaoAtraso,
                  ease: CURVA.rapidaParaLenta,
                },
              }}
              exit={{
                opacity: 0,
                transition: { duration: TEMPO.botaoSai, ease: CURVA.rapidaParaLenta },
              }}
            >
              {icone}
              {rotulo}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
      <AnimatePresence initial={false}>
        {carregando ? (
          <motion.span
            key="carregando"
            className="absolute inset-0 grid place-items-center"
            initial={{ opacity: 0, scale: ESCALA.botaoEntra }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { duration: TEMPO.botaoEntra, delay: reduzido ? 0 : 0.12 },
            }}
            exit={{ opacity: 0, transition: { duration: TEMPO.botaoSai } }}
          >
            <FormaCarregando reduzido={reduzido} />
          </motion.span>
        ) : sucesso ? (
          <motion.span
            key="sucesso"
            className="absolute inset-0 grid place-items-center"
            initial={{ opacity: 0, scale: ESCALA.botaoEntra }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { duration: TEMPO.botaoEntra, delay: reduzido ? 0 : 0.22 },
            }}
            exit={{ opacity: 0, transition: { duration: TEMPO.botaoSai } }}
          >
            <Check size={26} strokeWidth={2.5} aria-hidden />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </button>
  );
}
