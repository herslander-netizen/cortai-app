import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, type LinkProps, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-mobile";
import { Signature } from "./Signature";
import { CabecalhoDeTela } from "./CabecalhoDeTela";

export function Screen({
  title,
  subtitle,
  voltarPara,
  voltarRotulo = "Voltar",
  wide = false,
  hideHeader = false,
  headerAction,
  assinaturaSoComputador = false,
  children,
}: {
  title: string;
  subtitle?: string;
  voltarPara?: LinkProps["to"];
  voltarRotulo?: string;
  wide?: boolean;
  hideHeader?: boolean;
  /** Ação contextual alinhada à direita do topo (por exemplo, Categorias na tela Serviços). */
  headerAction?: ReactNode;
  /** Opt-in: assinatura institucional apenas em telas largas; desligada por padrão no app. */
  assinaturaSoComputador?: boolean;
  children?: ReactNode;
}) {
  const caminho = useRouterState({ select: (state) => state.location.pathname });
  const celular = useMediaQuery("(max-width: 767px)");
  const telaDaAgenda =
    caminho === "/barbeiro" ||
    caminho === "/barbeiro/" ||
    caminho === "/barbeiro/agenda" ||
    caminho.startsWith("/barbeiro/agenda/");
  const subpaginaFigaroMobile = celular && caminho.startsWith("/barbeiro/") && !telaDaAgenda;
  const destinoVoltar = voltarPara ?? (subpaginaFigaroMobile ? "/barbeiro" : undefined);
  const cabecalhoInicialRef = useRef<HTMLElement | null>(null);
  const [cabecalhoCompactoVisivel, setCabecalhoCompactoVisivel] = useState(false);

  // O título destacado rola com o conteúdo. Quando sai da área visível, entra a barra compacta.
  // O cabeçalho compacto é fixo e não participa do fluxo, evitando saltos na rolagem.
  useEffect(() => {
    setCabecalhoCompactoVisivel(false);
    if (!subpaginaFigaroMobile || hideHeader || !cabecalhoInicialRef.current) return;

    const cabecalhoInicial = cabecalhoInicialRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setCabecalhoCompactoVisivel(!entry.isIntersecting && window.scrollY > 48);
      },
      { threshold: 0 },
    );
    observer.observe(cabecalhoInicial);

    const verificarRolagem = () => {
      if (window.scrollY <= 48) setCabecalhoCompactoVisivel(false);
    };
    window.addEventListener("scroll", verificarRolagem, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", verificarRolagem);
    };
  }, [subpaginaFigaroMobile, hideHeader, title]);

  return (
    <div
      data-padrao-figaro="tela"
      data-largura={wide ? "larga" : undefined}
      className={`screen-shell mx-auto flex ${subpaginaFigaroMobile ? "min-h-dvh" : "min-h-[calc(100dvh-3.5rem)]"} w-full flex-col pb-[calc(2rem+env(safe-area-inset-bottom))] ${wide ? "max-w-[1180px]" : "max-w-[760px]"}`}
    >
      {!hideHeader ? (
        <>
          <header
            ref={cabecalhoInicialRef}
            data-figaro-header="page"
            className={`relative ${subpaginaFigaroMobile ? "top-0" : "top-14"} z-10 grid gap-4 bg-[var(--figaro-background,var(--ink))] px-4 pb-3 pt-4 md:static md:px-8 md:pb-5 md:pt-6`}
          >
            {destinoVoltar || headerAction ? (
              <div className="flex min-h-11 items-center justify-between gap-3">
                {destinoVoltar ? (
                  <Link
                    to={destinoVoltar}
                    aria-label={voltarRotulo}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--figaro-surface-container-highest,var(--ink3))] text-[var(--figaro-on-surface,var(--paper))] transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    <ArrowLeft size={24} aria-hidden />
                  </Link>
                ) : (
                  <span aria-hidden className="size-11 shrink-0" />
                )}
                {headerAction ? <div className="ml-auto flex min-h-11 items-center">{headerAction}</div> : null}
              </div>
            ) : null}
            <CabecalhoDeTela title={title} {...(subtitle ? { subtitle } : {})} />
          </header>

          {subpaginaFigaroMobile && cabecalhoCompactoVisivel ? (
            <div
              data-figaro-header="compact"
              className="fixed inset-x-0 top-0 z-40 flex min-h-14 items-center gap-3 bg-[var(--figaro-background,var(--ink))] px-4 py-2 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none"
            >
              {destinoVoltar ? (
                <Link
                  to={destinoVoltar}
                  aria-label={voltarRotulo}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--figaro-surface-container-highest,var(--ink3))] text-[var(--figaro-on-surface,var(--paper))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowLeft size={22} aria-hidden />
                </Link>
              ) : null}
              <p className="min-w-0 flex-1 truncate text-base font-semibold text-[var(--figaro-on-background,var(--paper))]">{title}</p>
              {headerAction ? <div className="flex shrink-0 items-center">{headerAction}</div> : null}
            </div>
          ) : null}
        </>
      ) : null}
      <main
        data-figaro-conteudo="page"
        className="screen-content min-w-0 flex-1 px-4 md:px-8"
      >
        {children}
      </main>
      {assinaturaSoComputador ? (
        <div className="hidden md:block">
          <Signature />
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div
      data-figaro-empty-state="true"
      className="flex min-h-28 flex-col items-center justify-center rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] px-5 py-8 text-center"
    >
      <p className="text-sm leading-relaxed text-mute">{text}</p>
    </div>
  );
}
