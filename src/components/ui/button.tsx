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

const buttonVariants = cva(
  "inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent text-sm font-bold cursor-pointer [transition:color_var(--mov-rapido),background-color_var(--mov-rapido),border-color_var(--mov-rapido),box-shadow_var(--mov-rapido),transform_var(--mola-toque-duracao)_var(--mola-toque)] motion-reduce:[transition:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 disabled:data-[ocupado]:opacity-100 disabled:cursor-not-allowed active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        secondary:
          "border-input bg-transparent text-foreground hover:border-primary/50 hover:bg-ink3 active:bg-ink2",
        outline:
          "border-input bg-transparent text-foreground hover:border-primary/50 hover:bg-ink3 active:bg-ink2",
        ghost: "bg-transparent text-foreground hover:bg-ink3 active:bg-ink2",
        text: "bg-transparent px-0 text-foreground underline-offset-4 hover:underline",
        link: "bg-transparent px-0 text-foreground underline-offset-4 hover:underline",
        icon: "bg-transparent text-foreground hover:bg-ink3 active:bg-ink2",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-12 px-4",
        sm: "h-12 px-3 text-xs",
        lg: "h-14 px-6 text-base",
        icon: "size-12 p-0",
        bloco:
          "h-auto min-h-12 flex-col items-stretch justify-start gap-1 whitespace-normal p-3 text-left",
      },
    },
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
        style={width.current && busy ? { ...style, minWidth: width.current } : style}
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
              animate={indicadorEntra}
              exit={indicadorSai}
            >
              <IconeCheckCircle aria-hidden />
            </motion.span>
          ) : null}
        </AnimatePresence>
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
