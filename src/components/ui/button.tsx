import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, motion } from "framer-motion";

import { IconeCheckCircle } from "@/components/ui/IconeCheckCircle";
import { IndicadorDeCarregamento } from "@/components/ui/IndicadorDeCarregamento";
import { CURVA, ESCALA, ESPERA_MS, TEMPO } from "@/lib/movimento-figaro";
import { cn } from "@/lib/utils";

/**
 * Indicador do botão (carregando ou ✓) no padrão do botão principal do Figaro: entra esmaecendo e
 * crescendo de 0,92 em 220 ms depois de 90 ms; sai esmaecendo em 90 ms
 * (`FigarooPrimaryButtonKt`, spec 1 §5).
 */
const indicadorEntra = {
  opacity: 1,
  scale: 1,
  transition: { duration: TEMPO.botaoEntra, delay: TEMPO.botaoAtraso, ease: CURVA.rapidaParaLenta },
};
const indicadorSai = {
  opacity: 0,
  transition: { duration: TEMPO.botaoSai, ease: CURVA.rapidaParaLenta },
};

/**
 * Botões no padrão do Figaro (`FigarooPrimaryButton`, `FigarooOutlinedButton`, `FigarooTextButton`, spec 1 §6.1):
 * rótulo 14/20 semibold, pílula, primário em `actionBlue`, contorno em `outlineVariant`, texto em 13 sp.
 * Alturas: pequeno 40, padrão 48 (SmallMedium), grande 56 (CTA). Contorno e texto têm 40 dp com a área de toque
 * ampliada para 48. As cores e a pílula valem na área do negócio (`--botao-*`, styles.css); fora dela o botão
 * segue a cor e o raio da marca de cada tela.
 */
const buttonVariants = cva(
  "relative inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--botao-raio,0.75rem)] border border-transparent text-sm font-semibold leading-5 tracking-[0.01em] cursor-pointer [transition:color_var(--mov-rapido),background-color_var(--mov-rapido),border-color_var(--mov-rapido),box-shadow_var(--mov-rapido),transform_var(--mola-toque-duracao)_var(--mola-toque)] motion-reduce:[transition:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 disabled:data-[ocupado]:opacity-100 disabled:cursor-not-allowed active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--botao-fundo,var(--primary))] text-[var(--botao-texto,var(--primary-foreground))] hover:brightness-110",
        primary:
          "bg-[var(--botao-fundo,var(--primary))] text-[var(--botao-texto,var(--primary-foreground))] hover:brightness-110",
        secondary:
          "border-[var(--botao-contorno,var(--input))] bg-transparent text-[var(--botao-link,var(--foreground))] hover:bg-ink3 active:bg-ink2",
        outline:
          "border-[var(--botao-contorno,var(--input))] bg-transparent text-[var(--botao-link,var(--foreground))] hover:bg-ink3 active:bg-ink2",
        ghost: "bg-transparent text-foreground hover:bg-ink3 active:bg-ink2",
        text: "bg-transparent px-0 text-[var(--botao-link,var(--foreground))] hover:underline underline-offset-4",
        link: "bg-transparent px-0 text-[var(--botao-link,var(--foreground))] hover:underline underline-offset-4",
        icon: "bg-transparent text-foreground hover:bg-ink3 active:bg-ink2",
        destructive:
          "bg-[var(--botao-erro,var(--destructive))] text-[var(--botao-erro-texto,var(--destructive-foreground))] hover:brightness-110",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 px-4 text-[13px] before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']",
        lg: "h-14 px-6 text-base",
        icon: "size-12 p-0",
        bloco:
          "h-auto min-h-12 flex-col items-stretch justify-start gap-1 whitespace-normal p-3 text-left",
      },
    },
    compoundVariants: [
      // Contorno e texto do Figaro medem 40 dp; a área de toque continua com 48.
      {
        variant: ["outline", "secondary"],
        size: "default",
        class: "h-10 px-4 before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']",
      },
      {
        variant: ["text", "link"],
        size: "default",
        class:
          "h-10 text-[13px] before:absolute before:-inset-y-1 before:-inset-x-2 before:content-['']",
      },
    ],
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  success?: boolean;
  /**
   * Confirmação no padrão do botão flutuante do Figaro (`FigarooExtendedFAB`, spec 1 §8.4): no sucesso a
   * pílula encolhe até virar círculo (220 ms) e só então o ✓ aparece. Sem isto, o sucesso só troca o ícone.
   */
  morfo?: boolean;
  onClick?: ((event: React.MouseEvent<HTMLButtonElement>) => void | Promise<unknown>) | undefined;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      success = false,
      morfo = false,
      disabled,
      onClick,
      children,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    if ((variant === "icon" || size === "icon") && !props["aria-label"]) {
      throw new Error("Button de ícone exige aria-label.");
    }
    const [pending, setPending] = React.useState(false);
    const [showSpinner, setShowSpinner] = React.useState(false);
    const internalRef = React.useRef<HTMLButtonElement | null>(null);
    const pendingRef = React.useRef(false);
    const alive = React.useRef(true);
    const width = React.useRef<number | null>(null);

    React.useEffect(
      () => () => {
        alive.current = false;
      },
      [],
    );
    React.useEffect(() => {
      if (!loading) {
        esconderCarregando();
        return;
      }
      const timer = window.setTimeout(() => mostrarCarregando(), 150);
      return () => window.clearTimeout(timer);
    }, [loading]);

    /** O carregando fica pelo menos 400 ms na tela, para não piscar (Figaro). */
    const mostradoEm = React.useRef<number | null>(null);
    const esconder = React.useRef<number | null>(null);
    function mostrarCarregando() {
      if (esconder.current) window.clearTimeout(esconder.current);
      esconder.current = null;
      if (mostradoEm.current === null) mostradoEm.current = Date.now();
      setShowSpinner(true);
    }
    function esconderCarregando() {
      if (mostradoEm.current === null) {
        setShowSpinner(false);
        return;
      }
      const falta = ESPERA_MS.carregandoMinimo - (Date.now() - mostradoEm.current);
      const fim = () => {
        esconder.current = null;
        mostradoEm.current = null;
        if (alive.current) setShowSpinner(false);
      };
      if (falta <= 0) fim();
      else esconder.current = window.setTimeout(fim, falta);
    }

    function setRefs(node: HTMLButtonElement | null) {
      internalRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }

    function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
      if (pendingRef.current || loading || success) return;
      const result = onClick?.(event);
      if (!result || typeof (result as Promise<unknown>).then !== "function") return;
      width.current = internalRef.current?.offsetWidth ?? null;
      pendingRef.current = true;
      setPending(true);
      const timer = window.setTimeout(() => alive.current && mostrarCarregando(), 150);
      void Promise.resolve(result).finally(() => {
        window.clearTimeout(timer);
        pendingRef.current = false;
        if (alive.current) {
          setPending(false);
          esconderCarregando();
        }
      });
    }

    const busy = pending || loading;
    // Morfo de confirmação: mede a pílula no sucesso, mantém a largura por um quadro e então encolhe
    // até a altura (o círculo). Fora do sucesso, o botão volta ao tamanho natural.
    const [fase, setFase] = React.useState<"normal" | "medido" | "circulo">("normal");
    const medida = React.useRef<{ largura: number; altura: number } | null>(null);
    const morfando = morfo && success;
    React.useLayoutEffect(() => {
      if (!morfando) {
        setFase("normal");
        medida.current = null;
        return;
      }
      if (fase !== "normal") return;
      const el = internalRef.current;
      if (el) medida.current = { largura: el.offsetWidth, altura: el.offsetHeight };
      setFase("medido");
    }, [morfando, fase]);
    React.useEffect(() => {
      if (fase !== "medido") return;
      const quadro = window.requestAnimationFrame(() => setFase("circulo"));
      return () => window.cancelAnimationFrame(quadro);
    }, [fase]);
    const estiloMorfo: React.CSSProperties | undefined =
      morfando && medida.current
        ? fase === "circulo"
          ? {
              width: medida.current.altura,
              paddingInline: 0,
              borderRadius: 999,
              transition: "width 220ms cubic-bezier(0, 0, 0.2, 1)",
            }
          : { width: medida.current.largura, transition: "none" }
        : undefined;
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={setRefs}
          aria-busy={busy || undefined}
          onClick={handleClick}
          style={width.current && busy ? { ...style, minWidth: width.current } : style}
          {...props}
        >
          {children}
        </Slot>
      );
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={setRefs}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        data-sucesso={success || undefined}
        data-ocupado={busy || undefined}
        data-carregando={showSpinner || undefined}
        onClick={handleClick}
        style={{
          ...(width.current && busy ? { ...style, minWidth: width.current } : style),
          ...estiloMorfo,
        }}
        data-morfo={morfando ? fase : undefined}
        {...props}
      >
        <AnimatePresence initial={false}>
          {showSpinner ? (
            <motion.span
              key="carregando"
              className="inline-flex"
              initial={{ opacity: 0, scale: ESCALA.botaoEntra }}
              animate={indicadorEntra}
              exit={indicadorSai}
            >
              <IndicadorDeCarregamento tamanho={22} decorativo className="text-current" />
            </motion.span>
          ) : success ? (
            <motion.span
              key="sucesso"
              className="inline-flex"
              initial={{ opacity: 0, scale: ESCALA.botaoEntra }}
              // Com morfo, o ✓ só entra quando a pílula já virou círculo (220 ms).
              animate={
                morfo
                  ? { ...indicadorEntra, transition: { ...indicadorEntra.transition, delay: 0.22 } }
                  : indicadorEntra
              }
              exit={indicadorSai}
            >
              <IconeCheckCircle aria-hidden />
            </motion.span>
          ) : null}
        </AnimatePresence>
        {morfo ? (
          <span
            className="inline-flex items-center gap-2 transition-opacity duration-[90ms]"
            style={{ opacity: morfando && fase === "circulo" ? 0 : 1 }}
          >
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
